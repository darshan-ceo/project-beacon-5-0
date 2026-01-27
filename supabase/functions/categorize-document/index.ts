import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// Simple filename-based fallback categorization
function fallbackCategorize(filename: string) {
  const name = filename.toLowerCase();

  if (/(notice|notification|intimation|scn|show[\s-]?cause)/i.test(name)) {
    return { category: 'Notice', confidence: 0.75, reasoning: 'Matched notice pattern (fallback)' };
  }
  if (/(reply|response|revert)/i.test(name)) {
    return { category: 'Reply', confidence: 0.7, reasoning: 'Matched reply pattern (fallback)' };
  }
  if (/(adjourn|postpone|defer|reschedule)/i.test(name)) {
    return { category: 'Adjournment', confidence: 0.7, reasoning: 'Matched adjournment pattern (fallback)' };
  }
  if (/(order|judgment|ruling|decree|decision)/i.test(name)) {
    return { category: 'Order', confidence: 0.75, reasoning: 'Matched order pattern (fallback)' };
  }
  if (/(written[\s-]?submission|brief|memorandum|petition|application|submission)/i.test(name)) {
    return { category: 'Submission', confidence: 0.7, reasoning: 'Matched submission pattern (fallback)' };
  }
  return { category: 'Miscellaneous', confidence: 0.3, reasoning: 'Defaulted by fallback rules' };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const authHeader = req.headers.get('authorization');
    const apiKeyHeader = req.headers.get('x-api-key');
    
    let isAuthorized = false;
    
    // Method 1: API key authentication (for server-to-server calls)
    if (apiKeyHeader && LOVABLE_API_KEY && apiKeyHeader === LOVABLE_API_KEY) {
      isAuthorized = true;
      console.log('[Categorize Document] Authorized via API key');
    }
    
    // Method 2: JWT authentication (for browser client calls)
    if (!isAuthorized && authHeader?.startsWith('Bearer ')) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      
      if (!claimsError && claimsData?.claims?.sub) {
        isAuthorized = true;
        console.log('[Categorize Document] Authorized via JWT for user:', claimsData.claims.sub);
      }
    }
    
    if (!isAuthorized) {
      console.log('[Categorize Document] Unauthorized access attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { filename } = await req.json();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Categorize legal documents into: Notice, Reply, Adjournment, Order, Submission, or Miscellaneous. Return only the category name." },
          { role: "user", content: `Categorize this document: ${filename}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 401) {
        // Fallback categorization when AI unauthorized
        const fb = fallbackCategorize(filename || 'document');
        return new Response(
          JSON.stringify({ ...fb, usedFallback: true, warning: "AI unauthorized, used fallback" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Unknown error -> fallback to safe default
      const fb = fallbackCategorize(filename || 'document');
      return new Response(
        JSON.stringify({ ...fb, usedFallback: true, warning: `AI error ${response.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const category = data.choices[0]?.message?.content?.trim() || "Miscellaneous";

    return new Response(
      JSON.stringify({ category, confidence: 0.8, reasoning: "AI-based categorization" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[Categorize Document] Error:', error);
    // Last-resort fallback
    const fb = fallbackCategorize('document');
    return new Response(
      JSON.stringify({ ...fb, usedFallback: true, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
