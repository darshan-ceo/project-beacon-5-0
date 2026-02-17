import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const isAdmin = roles?.some((r: any) => r.role === "admin" || r.role === "partner");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all public tables
    const { data: tables, error: tablesError } = await adminClient.rpc("", {}).maybeSingle();
    // Use direct query to information_schema via a different approach
    // Since we can't run raw SQL, we'll use the known table list from the schema

    // Fetch table names from information_schema using postgrest
    // We need to query each known table. Let's get the list dynamically.
    const knownTables = [
      "analytics_snapshots", "audit_log", "authority_levels", "automation_logs",
      "automation_rules", "calendar_integrations", "case_intelligence_snapshots",
      "case_notification_preferences", "case_statutory_deadlines", "cases",
      "client_contacts", "client_groups", "client_notifications", "client_portal_users",
      "clients", "communication_logs", "courts", "custom_cities",
      "custom_outcome_templates", "custom_roles", "data_jobs", "document_folders",
      "document_tags", "document_versions", "documents", "employees",
      "encrypted_credentials", "fee_entries", "fee_structures", "hearing_outcomes",
      "hearings", "issue_types", "kanban_columns", "matter_types",
      "notifications", "office_settings", "onboarding_tasks", "permissions",
      "portal_case_access", "portal_settings", "profiles", "rbac_enforcement_settings",
      "role_permissions", "saved_filters", "sla_configs", "sla_violations",
      "stage_checklists", "stage_definitions", "stage_instance_checklists",
      "stage_instances", "stage_transitions", "stage_workflow_steps",
      "statutory_event_types", "task_comments", "task_templates", "tasks",
      "team_members", "template_categories", "template_documents", "tenants",
      "time_entries", "user_roles", "workflow_definitions", "workflow_stage_links",
      "workflow_templates",
    ];

    const exportData: Record<string, any[]> = {};
    const tablesSummary: Record<string, { rows: number; columns: number }> = {};
    let totalRows = 0;

    for (const tableName of knownTables) {
      try {
        // Paginate to get all rows
        const allRows: any[] = [];
        let offset = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await adminClient
            .from(tableName)
            .select("*")
            .range(offset, offset + pageSize - 1);

          if (error) {
            console.error(`Error fetching ${tableName}:`, error.message);
            break;
          }

          if (data && data.length > 0) {
            allRows.push(...data);
            offset += pageSize;
            hasMore = data.length === pageSize;
          } else {
            hasMore = false;
          }
        }

        exportData[tableName] = allRows;
        const colCount = allRows.length > 0 ? Object.keys(allRows[0]).length : 0;
        tablesSummary[tableName] = { rows: allRows.length, columns: colCount };
        totalRows += allRows.length;
      } catch (e) {
        console.error(`Skipping table ${tableName}:`, e);
        exportData[tableName] = [];
        tablesSummary[tableName] = { rows: 0, columns: 0 };
      }
    }

    const dump = {
      metadata: {
        exported_at: new Date().toISOString(),
        environment: "production",
        total_tables: knownTables.length,
        total_rows: totalRows,
        tables_summary: tablesSummary,
      },
      data: exportData,
    };

    const jsonString = JSON.stringify(dump, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = `dumps/full-dump-${timestamp}.json`;

    // Upload to storage
    const { error: uploadError } = await adminClient.storage
      .from("import-exports")
      .upload(filePath, new Blob([jsonString], { type: "application/json" }), {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: "Upload failed", details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        file_path: filePath,
        bucket: "import-exports",
        total_tables: knownTables.length,
        total_rows: totalRows,
        tables_summary: tablesSummary,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
