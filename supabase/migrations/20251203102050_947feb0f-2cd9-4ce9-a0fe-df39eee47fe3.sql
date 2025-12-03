-- Seed additional permissions for new modules

-- GST Compliance permissions
INSERT INTO permissions (key, module, action, description)
VALUES 
  ('gst.read', 'gst', 'read', 'View GST compliance data'),
  ('gst.create', 'gst', 'create', 'Create GST compliance records'),
  ('gst.update', 'gst', 'update', 'Update GST compliance records'),
  ('gst.delete', 'gst', 'delete', 'Delete GST compliance records')
ON CONFLICT (key) DO NOTHING;

-- Compliance Dashboard permissions
INSERT INTO permissions (key, module, action, description)
VALUES 
  ('compliance.read', 'compliance', 'read', 'View compliance dashboard'),
  ('compliance.manage', 'compliance', 'manage', 'Manage compliance settings')
ON CONFLICT (key) DO NOTHING;

-- Global Parameters / Settings permissions
INSERT INTO permissions (key, module, action, description)
VALUES 
  ('settings.read', 'settings', 'read', 'View system settings'),
  ('settings.update', 'settings', 'update', 'Update system settings')
ON CONFLICT (key) DO NOTHING;

-- Statutory Deadlines permissions
INSERT INTO permissions (key, module, action, description)
VALUES 
  ('statutory.read', 'statutory', 'read', 'View statutory deadlines'),
  ('statutory.create', 'statutory', 'create', 'Create statutory deadlines'),
  ('statutory.update', 'statutory', 'update', 'Update statutory deadlines'),
  ('statutory.delete', 'statutory', 'delete', 'Delete statutory deadlines')
ON CONFLICT (key) DO NOTHING;

-- Client Groups permissions
INSERT INTO permissions (key, module, action, description)
VALUES 
  ('client_groups.read', 'client_groups', 'read', 'View client groups'),
  ('client_groups.create', 'client_groups', 'create', 'Create client groups'),
  ('client_groups.update', 'client_groups', 'update', 'Update client groups'),
  ('client_groups.delete', 'client_groups', 'delete', 'Delete client groups')
ON CONFLICT (key) DO NOTHING;

-- Reports permissions
INSERT INTO permissions (key, module, action, description)
VALUES 
  ('reports.read', 'reports', 'read', 'View reports'),
  ('reports.export', 'reports', 'export', 'Export reports')
ON CONFLICT (key) DO NOTHING;

-- Dashboard permissions
INSERT INTO permissions (key, module, action, description)
VALUES 
  ('dashboard.read', 'dashboard', 'read', 'View dashboard'),
  ('dashboard.customize', 'dashboard', 'customize', 'Customize dashboard layout')
ON CONFLICT (key) DO NOTHING;

-- Notifications permissions
INSERT INTO permissions (key, module, action, description)
VALUES 
  ('notifications.read', 'notifications', 'read', 'View notifications'),
  ('notifications.manage', 'notifications', 'manage', 'Manage notification settings')
ON CONFLICT (key) DO NOTHING;