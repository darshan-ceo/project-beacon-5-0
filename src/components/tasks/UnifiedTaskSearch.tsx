import React from 'react';
import { CheckSquare, User, Flag, Calendar, FileText, Tag } from 'lucide-react';
import { UnifiedModuleSearch, FilterConfig } from '@/components/search/UnifiedModuleSearch';

interface UnifiedTaskSearchProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  activeFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  clients?: { id: string; name: string }[];
  cases?: { id: string; caseNumber: string }[];
  assignees?: { id: string; name: string }[];
}

export const UnifiedTaskSearch: React.FC<UnifiedTaskSearchProps> = ({
  searchTerm,
  onSearchTermChange,
  activeFilters,
  onFiltersChange,
  clients = [],
  cases = [],
  assignees = []
}) => {
  const filterConfig: FilterConfig[] = [
    {
      id: 'clientId',
      label: 'Client',
      type: 'dropdown',
      icon: User,
      options: clients.map(c => ({ label: c.name, value: c.id }))
    },
    {
      id: 'caseId',
      label: 'Case',
      type: 'dropdown',
      icon: FileText,
      options: cases.map(c => ({ label: c.caseNumber, value: c.id }))
    },
    {
      id: 'status',
      label: 'Status',
      type: 'dropdown',
      icon: CheckSquare,
      options: [
        { label: 'Pending', value: 'Pending' },
        { label: 'In Progress', value: 'In Progress' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Overdue', value: 'Overdue' },
        { label: 'Review', value: 'Review' },
        { label: 'Not Started', value: 'Not Started' }
      ]
    },
    {
      id: 'priority',
      label: 'Priority',
      type: 'dropdown',
      icon: Flag,
      options: [
        { label: 'Critical', value: 'Critical' },
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' }
      ]
    },
    {
      id: 'assignedToId',
      label: 'Assignee',
      type: 'dropdown',
      icon: User,
      options: assignees.map(a => ({ label: a.name, value: a.id }))
    },
    {
      id: 'taskTypes',
      label: 'Task Type',
      type: 'tags',
      icon: Tag,
      tags: [
        { name: 'Auto-generated' },
        { name: 'Manual' },
        { name: 'Escalated' }
      ]
    },
    {
      id: 'dueDate',
      label: 'Due Date',
      type: 'dateRange',
      icon: Calendar
    }
  ];

  return (
    <UnifiedModuleSearch
      moduleName="Tasks"
      moduleIcon={CheckSquare}
      searchPlaceholder="Search by title, description, case number, or assignee..."
      searchTerm={searchTerm}
      onSearchTermChange={onSearchTermChange}
      activeFilters={activeFilters}
      onFiltersChange={onFiltersChange}
      filterConfig={filterConfig}
      keyboardShortcut="Ctrl+F"
    />
  );
};