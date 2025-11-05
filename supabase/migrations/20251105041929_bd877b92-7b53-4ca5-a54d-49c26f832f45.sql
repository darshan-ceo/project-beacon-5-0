-- Phase 2: Seed Default Data
-- Seed automation rules, performance baselines, client groups, and link clients

DO $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_client_ids UUID[];
  v_corp_group_id UUID;
  v_ind_group_id UUID;
BEGIN
  -- Get first tenant and user (assumes single tenant deployment)
  SELECT tenant_id INTO v_tenant_id FROM profiles LIMIT 1;
  SELECT id INTO v_user_id FROM profiles WHERE tenant_id = v_tenant_id LIMIT 1;
  
  -- Get first 6 client IDs for grouping
  SELECT array_agg(id) INTO v_client_ids FROM (
    SELECT id FROM clients WHERE tenant_id = v_tenant_id LIMIT 6
  ) sub;

  -- 1. SEED AUTOMATION RULES
  INSERT INTO automation_rules (
    tenant_id, name, description, trigger_type, trigger_config, 
    actions, is_active, created_by
  ) VALUES
    (v_tenant_id, 'GST Appeal Deadline Tracker', 
     'Automatically create appeal filing tasks when a case moves to Appeal stage',
     'case_stage_changed', 
     '{"event": "case_stage_changed", "conditions": {"stageTo": "Appeal Order (APL-05)"}}'::jsonb,
     '{"createTaskBundle": {"bundleId": "appeal-filing-bundle"}, "sendNotification": {"channels": ["in_app", "email"], "recipients": ["assignee", "manager"], "template": "stage_changed"}}'::jsonb,
     true, v_user_id),
    
    (v_tenant_id, 'Hearing Preparation Automation',
     'Create preparation tasks and send notifications when a hearing is scheduled',
     'hearing_scheduled',
     '{"event": "hearing_scheduled"}'::jsonb,
     '{"createTaskBundle": {"bundleId": "hearing-prep-bundle"}, "sendNotification": {"channels": ["in_app", "email"], "recipients": ["assignee", "team"], "template": "hearing_scheduled"}}'::jsonb,
     true, v_user_id),
    
    (v_tenant_id, 'Assessment Response Automation',
     'Trigger response preparation tasks when case enters Assessment stage',
     'case_stage_changed',
     '{"event": "case_stage_changed", "conditions": {"stageTo": "ASMT-10 Notice Received"}}'::jsonb,
     '{"createTaskBundle": {"bundleId": "assessment-response-bundle"}, "sendNotification": {"channels": ["in_app", "email"], "recipients": ["assignee"], "template": "task_assigned"}}'::jsonb,
     true, v_user_id),
    
    (v_tenant_id, 'Overdue Task Escalation - High Priority',
     'Escalate high and critical priority tasks that are overdue by more than 24 hours',
     'task_overdue',
     '{"event": "task_overdue", "conditions": {"priority": ["High", "Critical"], "daysOverdue": 1}}'::jsonb,
     '{"escalate": {"toRole": "Manager", "slaThreshold": 24}, "sendNotification": {"channels": ["in_app", "email", "sms"], "recipients": ["manager", "assignee"], "template": "escalation_alert"}}'::jsonb,
     true, v_user_id),
    
    (v_tenant_id, 'Document Upload Follow-up',
     'Create review tasks when important documents are uploaded',
     'document_uploaded',
     '{"event": "document_uploaded", "conditions": {"documentType": "Order"}}'::jsonb,
     '{"sendNotification": {"channels": ["in_app", "email"], "recipients": ["assignee", "manager"], "template": "document_uploaded"}}'::jsonb,
     true, v_user_id),
    
    (v_tenant_id, 'Notice Response Automation',
     'Create response tasks when case receives notice',
     'case_stage_changed',
     '{"event": "case_stage_changed", "conditions": {"stageTo": "ASMT-10 Notice Received"}}'::jsonb,
     '{"createTaskBundle": {"bundleId": "notice-response-bundle"}, "sendNotification": {"channels": ["in_app", "email"], "recipients": ["assignee"], "template": "stage_changed"}}'::jsonb,
     true, v_user_id),
    
    (v_tenant_id, 'Case Created - Initial Setup',
     'Create initial assessment tasks when a new case is created',
     'case_created',
     '{"event": "case_created"}'::jsonb,
     '{"createTaskBundle": {"bundleId": "initial-assessment-bundle"}, "sendNotification": {"channels": ["in_app", "email"], "recipients": ["assignee", "manager"], "template": "task_bundle_created"}}'::jsonb,
     true, v_user_id);

  -- 2. SEED PERFORMANCE BASELINES
  INSERT INTO performance_baselines (
    tenant_id, metric_name, baseline_value, target_value, period, effective_from, created_by
  ) VALUES
    (v_tenant_id, 'Task Completion Rate (%)', 75, 90, 'monthly', '2025-01-01', v_user_id),
    (v_tenant_id, 'Average Case Duration (Days)', 180, 120, 'quarterly', '2025-01-01', v_user_id),
    (v_tenant_id, 'Hearing Compliance Rate (%)', 85, 95, 'monthly', '2025-01-01', v_user_id);

  -- 3. SEED CLIENT GROUPS
  INSERT INTO client_groups (id, tenant_id, name, code, description, created_by)
  VALUES
    (gen_random_uuid(), v_tenant_id, 'Corporate Clients', 'CORP-GRP-001', 
     'Large corporate entities with multiple GST registrations across states', v_user_id)
  RETURNING id INTO v_corp_group_id;
  
  INSERT INTO client_groups (id, tenant_id, name, code, description, created_by)
  VALUES
    (gen_random_uuid(), v_tenant_id, 'Individual Taxpayers', 'IND-GRP-001',
     'Individual professionals and small businesses with single GSTIN', v_user_id)
  RETURNING id INTO v_ind_group_id;

  -- 4. LINK CLIENTS TO GROUPS (first 3 to Corporate, next 3 to Individual)
  IF array_length(v_client_ids, 1) >= 6 THEN
    UPDATE clients 
    SET client_group_id = v_corp_group_id
    WHERE id IN (v_client_ids[1], v_client_ids[2], v_client_ids[3]);
    
    UPDATE clients
    SET client_group_id = v_ind_group_id
    WHERE id IN (v_client_ids[4], v_client_ids[5], v_client_ids[6]);

    -- Update group counts
    UPDATE client_groups SET total_clients = 3 WHERE id = v_corp_group_id;
    UPDATE client_groups SET total_clients = 3 WHERE id = v_ind_group_id;
  END IF;

  RAISE NOTICE '✅ Phase 2 Seeding Complete:';
  RAISE NOTICE '   - 7 Automation Rules created';
  RAISE NOTICE '   - 3 Performance Baselines created';
  RAISE NOTICE '   - 2 Client Groups created';
  RAISE NOTICE '   - 6 Clients linked to groups (if available)';
END $$;