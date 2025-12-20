// Portal role permissions for Client Portal
export const portalPermissions = {
  viewer: {
    canViewCases: true,
    canViewDocuments: true,
    canViewHearings: true,
    canUploadDocuments: false,
    canDownloadDocuments: true,
    canAddNotes: false,
    canManageUsers: false,
  },
  editor: {
    canViewCases: true,
    canViewDocuments: true,
    canViewHearings: true,
    canUploadDocuments: true,
    canDownloadDocuments: true,
    canAddNotes: true,
    canManageUsers: false,
  },
  admin: {
    canViewCases: true,
    canViewDocuments: true,
    canViewHearings: true,
    canUploadDocuments: true,
    canDownloadDocuments: true,
    canAddNotes: true,
    canManageUsers: true,
  }
} as const;

export type PortalRole = keyof typeof portalPermissions;
export type PortalAction = keyof typeof portalPermissions.viewer;

export const canPerformAction = (role: string | undefined, action: PortalAction): boolean => {
  const normalizedRole = (role?.toLowerCase() || 'viewer') as PortalRole;
  return portalPermissions[normalizedRole]?.[action] ?? false;
};

export const getPortalRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    viewer: 'Viewer',
    editor: 'Editor',
    admin: 'Admin'
  };
  return labels[role?.toLowerCase()] || 'Viewer';
};
