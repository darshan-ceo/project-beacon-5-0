import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseId, query, caseContext } = await req.json();
    
    // Validate inputs
    if (!query || !caseContext) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: query and caseContext" }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[AI Assistant] LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build contextual system prompt for GST litigation in Gujarat
    const systemPrompt = `You are an AI assistant for GST litigation case management in Gujarat, India.

Case Context:
- Case Number: ${caseContext.caseNumber}
- Client: ${caseContext.clientName}
- Current Stage: ${caseContext.currentStage}
- Form Type: ${caseContext.form_type || 'Not specified'}
- Notice Number: ${caseContext.notice_no || 'Not specified'}
- Tax Demand: ₹${caseContext.taxDemand?.toLocaleString('en-IN') || '0'}

Your role is to provide concise, accurate, and actionable answers about:
1. Case deadlines and next actions (reply deadlines, appeal periods)
2. GST law provisions (Sections 73, 74, 107, etc. of CGST Act 2017)
3. Document requirements for current stage
4. Hearing preparation checklist and tips
5. Appeal procedures and timelines
6. Gujarat-specific procedures and authorities

Important Guidelines:
- Keep answers clear and professional
- Cite specific GST Act sections when relevant
- Provide step-by-step guidance when possible
- Focus on practical, actionable advice
- Always mention deadlines if applicable
- Be specific to the current case stage (${caseContext.currentStage})

If you don't have specific information, acknowledge it and provide general guidance.`;

    console.log(`[AI Assistant] Processing query for case ${caseId}: "${query}"`);

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        stream: false,
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Assistant] AI gateway error:", response.status, errorText);
      
      // Handle specific error codes
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded. Please try again in a few moments." 
          }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "AI usage limit reached. Please add credits to your Lovable workspace." 
          }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error("[AI Assistant] No response content from AI");
      return new Response(
        JSON.stringify({ error: "No response from AI" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[AI Assistant] Successfully generated response for case ${caseId}`);

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        caseId,
        timestamp: new Date().toISOString()
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[AI Assistant] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
