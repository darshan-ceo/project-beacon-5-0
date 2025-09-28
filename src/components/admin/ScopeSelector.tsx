import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Eye, Users, Building, Globe, Info } from 'lucide-react';
import { type PermissionScope } from '@/persistence/unifiedStore';

interface ScopeSelectorProps {
  scope: PermissionScope;
  onScopeChange: (scope: PermissionScope) => void;
  permissionName: string;
  disabled?: boolean;
  showPreview?: boolean;
}

export const ScopeSelector: React.FC<ScopeSelectorProps> = ({
  scope,
  onScopeChange,
  permissionName,
  disabled = false,
  showPreview = true
}) => {
  const scopeOptions = [
    {
      value: 'own' as PermissionScope,
      label: 'Own',
      description: 'Access only to own records',
      icon: Eye,
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      examples: ['Own cases', 'Own tasks', 'Personal documents']
    },
    {
      value: 'team' as PermissionScope,
      label: 'Team',
      description: 'Access to team/direct reports records',
      icon: Users,
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      examples: ['Team cases', 'Subordinate tasks', 'Team documents']
    },
    {
      value: 'org' as PermissionScope,
      label: 'Organization',
      description: 'Access to all organizational records',
      icon: Globe,
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      examples: ['All cases', 'Organization-wide reports', 'System settings']
    }
  ];

  const currentScopeOption = scopeOptions.find(option => option.value === scope);

  const getScopeImpact = (selectedScope: PermissionScope) => {
    const scopeHierarchy = ['own', 'team', 'org'];
    const selectedIndex = scopeHierarchy.indexOf(selectedScope);
    
    let accessLevel = '';
    let dataAccess = '';
    
    switch (selectedScope) {
      case 'own':
        accessLevel = 'Minimal';
        dataAccess = 'Personal records only';
        break;
      case 'team':
        accessLevel = 'Limited';
        dataAccess = 'Personal + direct reports';
        break;
      case 'org':
        accessLevel = 'Full';
        dataAccess = 'Organization-wide access';
        break;
    }
    
    return { accessLevel, dataAccess, selectedIndex };
  };

  const impact = getScopeImpact(scope);

  return (
    <div className="space-y-4">
      {/* Scope Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Data Access Scope</label>
          {currentScopeOption && (
            <Badge className={currentScopeOption.color} variant="secondary">
              <currentScopeOption.icon className="h-3 w-3 mr-1" />
              {currentScopeOption.label}
            </Badge>
          )}
        </div>
        
        <Select 
          value={scope} 
          onValueChange={onScopeChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select access scope" />
          </SelectTrigger>
          <SelectContent>
            {scopeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center space-x-2">
                  <option.icon className="h-4 w-4" />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Scope Impact Preview */}
      {showPreview && currentScopeOption && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Info className="h-4 w-4 mr-2 text-primary" />
              Scope Impact for "{permissionName}"
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Access Level:</span>
                <span className="ml-2 font-medium">{impact.accessLevel}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Data Access:</span>
                <span className="ml-2 font-medium">{impact.dataAccess}</span>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <p className="text-sm font-medium mb-2">Examples of accessible data:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {currentScopeOption.examples.map((example, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-1 h-1 bg-primary rounded-full mr-2" />
                    {example}
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual Scope Indicator */}
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2">Scope hierarchy:</p>
              <div className="flex items-center space-x-1">
                {scopeOptions.map((option, index) => (
                  <React.Fragment key={option.value}>
                    <div className={`
                      px-2 py-1 rounded text-xs font-medium transition-colors
                      ${index <= impact.selectedIndex 
                        ? option.color
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                      }
                    `}>
                      <option.icon className="h-3 w-3 inline mr-1" />
                      {option.label}
                    </div>
                    {index < scopeOptions.length - 1 && (
                      <span className="text-gray-400">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};