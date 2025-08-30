// DMS Action Matrix Generator
// Generates comprehensive inventory of all DMS interactive elements

interface DMSActionItem {
  view: string;
  element: string;
  component: string;
  service: string;
  payload: string[];
  expected: string;
  ui_refresh: string;
  status: 'OK' | 'MISSING_HANDLER' | 'TOAST_ONLY' | 'BROKEN_SERVICE' | 'BROKEN_ROUTE';
  notes: string;
}

export const generateDMSActionMatrix = (): DMSActionItem[] => {
  const matrix: DMSActionItem[] = [
    // Header Actions
    {
      view: 'DMS > Main',
      element: 'New Folder',
      component: 'DocumentManagement.tsx#setNewFolderModal',
      service: 'dmsService.folders.create()',
      payload: ['name', 'parentId', 'caseId'],
      expected: 'folder created, tree refreshed',
      ui_refresh: 'folders list, counts',
      status: 'OK',
      notes: 'Opens NewFolderModal, validates unique names'
    },
    {
      view: 'DMS > Main',
      element: 'Upload Documents',
      component: 'DocumentManagement.tsx#setDocumentModal',
      service: 'dmsService.files.upload()',
      payload: ['file', 'folderId', 'caseId', 'tags'],
      expected: 'file uploaded, appears in list',
      ui_refresh: 'document list, folder counts',
      status: 'OK',
      notes: 'Opens DocumentModal in upload mode'
    },

    // Search and Filters
    {
      view: 'DMS > Main',
      element: 'Search Input',
      component: 'DocumentManagement.tsx#setSearchTerm',
      service: 'local filtering',
      payload: ['searchTerm'],
      expected: 'filtered results displayed',
      ui_refresh: 'document list',
      status: 'OK',
      notes: 'Real-time search across name and tags'
    },
    {
      view: 'DMS > Filters',
      element: 'Filter Dropdown',
      component: 'DocumentFilters.tsx#onFiltersChange',
      service: 'dmsService.files.search()',
      payload: ['filters'],
      expected: 'filtered documents shown',
      ui_refresh: 'document list',
      status: 'OK',
      notes: 'Type, Case, Uploader, Date Range filters'
    },
    {
      view: 'DMS > Filters',
      element: 'Tag Filters',
      component: 'DocumentFilters.tsx#handleTagFilter',
      service: 'dmsService.tags.list()',
      payload: ['tagName'],
      expected: 'tag-based filtering applied',
      ui_refresh: 'document list, filter badges',
      status: 'OK',
      notes: 'Multiple tag selection supported'
    },

    // Folder Actions
    {
      view: 'DMS > Folders',
      element: 'Folder Click',
      component: 'DocumentManagement.tsx#handleFolderClick',
      service: 'dmsService.folders.get()',
      payload: ['folderId'],
      expected: 'navigate into folder',
      ui_refresh: 'breadcrumbs, document list',
      status: 'OK',
      notes: 'Updates currentPath, loads folder contents'
    },
    {
      view: 'DMS > Folders',
      element: 'Breadcrumb Navigation',
      component: 'DocumentManagement.tsx#navigateToHome',
      service: 'local navigation',
      payload: ['pathLevel'],
      expected: 'navigate to parent/home',
      ui_refresh: 'breadcrumbs, folder view',
      status: 'OK',
      notes: 'Home button resets to root view'
    },

    // Document Actions - All Documents Tab
    {
      view: 'DMS > All Documents',
      element: 'View/Preview',
      component: 'DocumentManagement.tsx#handleDocumentView',
      service: 'dmsService.files.getPreviewUrl()',
      payload: ['documentId'],
      expected: 'preview opens in new tab',
      ui_refresh: 'none',
      status: 'OK',
      notes: 'PDF inline preview, others download'
    },
    {
      view: 'DMS > All Documents',
      element: 'Download',
      component: 'DocumentManagement.tsx#handleDocumentDownload',
      service: 'dmsService.files.getDownloadUrl()',
      payload: ['documentId'],
      expected: 'file download starts',
      ui_refresh: 'none',
      status: 'OK',
      notes: 'Preserves original filename'
    },
    {
      view: 'DMS > All Documents',
      element: 'Edit Metadata',
      component: 'DocumentManagement.tsx#setDocumentModal',
      service: 'dmsService.files.updateMetadata()',
      payload: ['documentId', 'name', 'tags'],
      expected: 'metadata updated, row reflects changes',
      ui_refresh: 'document row, tags',
      status: 'OK',
      notes: 'Opens DocumentModal in edit mode'
    },
    {
      view: 'DMS > All Documents',
      element: 'Add Tags',
      component: 'DocumentManagement.tsx#handleAddTag',
      service: 'dmsService.files.updateMetadata()',
      payload: ['documentId', 'tags[]'],
      expected: 'tags added, badges updated',
      ui_refresh: 'document row tags',
      status: 'OK',
      notes: 'Quick tag addition from dropdown'
    },
    {
      view: 'DMS > All Documents',
      element: 'Delete Document',
      component: 'DocumentManagement.tsx#handleDocumentDelete',
      service: 'dmsService.files.delete()',
      payload: ['documentId'],
      expected: 'document removed, confirmation shown',
      ui_refresh: 'document list, counts',
      status: 'OK',
      notes: 'Requires confirmation dialog'
    },

    // Modal Actions
    {
      view: 'DMS > NewFolderModal',
      element: 'Create Folder Submit',
      component: 'NewFolderModal.tsx#handleSubmit',
      service: 'dmsService.folders.create()',
      payload: ['name', 'description', 'parentId'],
      expected: 'folder created, modal closes',
      ui_refresh: 'folder tree, counts',
      status: 'OK',
      notes: 'Validates name uniqueness within parent'
    },
    {
      view: 'DMS > DocumentModal',
      element: 'Upload File',
      component: 'DocumentModal.tsx#handleSubmit',
      service: 'dmsService.files.upload()',
      payload: ['file', 'name', 'caseId', 'tags'],
      expected: 'file uploaded, modal closes',
      ui_refresh: 'document list, folder counts',
      status: 'OK',
      notes: 'File type and size validation'
    },

    // Tag Management
    {
      view: 'DMS > TagManager',
      element: 'Create New Tag',
      component: 'DocumentFilters.tsx#TagCreation',
      service: 'dmsService.tags.create()',
      payload: ['name', 'color'],
      expected: 'tag created, available in filters',
      ui_refresh: 'tag list, filter options',
      status: 'OK',
      notes: 'Auto-suggests colors, prevents duplicates'
    },

    // Stats and Counts
    {
      view: 'DMS > Stats Cards',
      element: 'Document Counts',
      component: 'DocumentManagement.tsx#useEffect',
      service: 'state.documents.length',
      payload: [],
      expected: 'real-time counts displayed',
      ui_refresh: 'stats cards',
      status: 'OK',
      notes: 'Updates automatically with document changes'
    }
  ];

  return matrix;
};

export const downloadDMSActionMatrix = () => {
  const matrix = generateDMSActionMatrix();
  const dataStr = JSON.stringify(matrix, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `dms-action-matrix-${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

// Console logging for DMS actions
export const logDMSAction = (
  level: 'success' | 'error', 
  action: string, 
  details?: any
) => {
  const isDev = import.meta.env.DEV;
  if (!isDev) return;
  
  const color = level === 'success' ? 'color: green' : 'color: red';
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  
  console.log(
    `%c[DMS] ${timestamp} ${action} ${level.toUpperCase()}`, 
    color, 
    details
  );
};