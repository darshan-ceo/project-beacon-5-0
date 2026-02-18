import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Tables ordered by foreign key dependencies
const TABLE_ORDER = [
  // Tier 0: No dependencies
  "tenants",
  // Tier 1: Depend on tenants only
  "profiles", "employees", "courts", "matter_types", "issue_types",
  "authority_levels", "custom_roles", "office_settings", "portal_settings",
  "calendar_integrations", "sla_configs", "custom_cities",
  "stage_definitions", "workflow_definitions", "workflow_templates",
  "template_categories", "statutory_event_types", "kanban_columns",
  "rbac_enforcement_settings", "permissions", "automation_rules",
  "custom_outcome_templates", "encrypted_credentials",
  // Tier 2: Depend on tier 1
  "user_roles", "role_permissions", "client_groups",
  "onboarding_tasks", "team_members", "saved_filters",
  // Tier 3: Depend on tier 2
  "clients", "client_contacts",
  // Tier 4: Depend on clients
  "cases", "client_portal_users", "client_notifications",
  "fee_structures", "communication_logs",
  // Tier 5: Depend on cases
  "tasks", "hearings", "documents", "document_folders",
  "stage_instances", "stage_transitions", "case_notification_preferences",
  "case_statutory_deadlines", "case_intelligence_snapshots",
  "workflow_stage_links", "stage_workflow_steps",
  // Tier 6: Depend on tier 5
  "task_comments", "task_templates", "hearing_outcomes",
  "document_tags", "document_versions", "template_documents",
  "stage_instance_checklists", "stage_checklists",
  "fee_entries", "time_entries",
  "portal_case_access",
  // Tier 7: Independent / logs
  "notifications", "audit_log", "automation_logs",
  "analytics_snapshots", "sla_violations", "data_jobs",
  "employee_audit_history",
];

function escapeSQL(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "'{}'";
    const items = value.map((v) => {
      if (typeof v === "string") return `"${v.replace(/"/g, '\\"')}"`;
      return String(v);
    });
    return `'{${items.join(",")}}'`;
  }
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  // String
  const str = String(value);
  return `'${str.replace(/'/g, "''")}'`;
}

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

    // Build SQL dump
    const sqlParts: string[] = [];
    const tablesSummary: Record<string, { rows: number }> = {};
    let totalRows = 0;

    sqlParts.push("-- Beacon Database Data Export");
    sqlParts.push(`-- Generated: ${new Date().toISOString()}`);
    sqlParts.push(`-- Tables: ${TABLE_ORDER.length}`);
    sqlParts.push("");
    sqlParts.push("BEGIN;");
    sqlParts.push("SET session_replication_role = 'replica'; -- Disable triggers during import");
    sqlParts.push("");

    for (const tableName of TABLE_ORDER) {
      try {
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

        tablesSummary[tableName] = { rows: allRows.length };
        totalRows += allRows.length;

        if (allRows.length === 0) {
          sqlParts.push(`-- Table: ${tableName} (0 rows)`);
          sqlParts.push("");
          continue;
        }

        sqlParts.push(`-- Table: ${tableName} (${allRows.length} rows)`);
        const columns = Object.keys(allRows[0]);
        const colList = columns.map((c) => `"${c}"`).join(", ");

        for (const row of allRows) {
          const values = columns.map((col) => escapeSQL(row[col])).join(", ");
          sqlParts.push(`INSERT INTO public."${tableName}" (${colList}) VALUES (${values});`);
        }

        sqlParts.push("");
      } catch (e) {
        console.error(`Skipping table ${tableName}:`, e);
        sqlParts.push(`-- Table: ${tableName} (SKIPPED - error)`);
        sqlParts.push("");
        tablesSummary[tableName] = { rows: 0 };
      }
    }

    // Update row count in header
    sqlParts[2] = `-- Tables: ${TABLE_ORDER.length} | Total Rows: ${totalRows}`;

    sqlParts.push("SET session_replication_role = 'origin'; -- Re-enable triggers");
    sqlParts.push("COMMIT;");

    const sqlString = sqlParts.join("\n");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = `dumps/sql-dump-${timestamp}.sql`;

    // Upload to storage
    const { error: uploadError } = await adminClient.storage
      .from("import-exports")
      .upload(filePath, new Blob([sqlString], { type: "text/plain" }), {
        contentType: "text/plain",
        upsert: false,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: "Upload failed", details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
      .from("import-exports")
      .createSignedUrl(filePath, 3600);

    const signedUrl = signedUrlData?.signedUrl || null;

    return new Response(
      JSON.stringify({
        success: true,
        signedUrl,
        file_path: filePath,
        bucket: "import-exports",
        total_tables: TABLE_ORDER.length,
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
