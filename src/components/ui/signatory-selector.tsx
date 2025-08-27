import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { CompanySignatory, SigningScope } from '@/types/signatory';

interface SignatorySelectorProps {
  signatories: CompanySignatory[];
  value?: string;
  onValueChange: (signatoryId: string) => void;
  signingScope?: SigningScope;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const SignatorySelector: React.FC<SignatorySelectorProps> = ({
  signatories,
  value,
  onValueChange,
  signingScope,
  placeholder = "Select signatory",
  disabled = false,
  className = ""
}) => {
  // Filter signatories based on signing scope if provided
  const filteredSignatories = signatories.filter(signatory => {
    if (!signingScope) return signatory.status === 'Active';
    return signatory.status === 'Active' && 
           (signatory.signingScope.includes('All') || signatory.signingScope.includes(signingScope));
  });

  // Sort to show primary signatory first
  const sortedSignatories = [...filteredSignatories].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.fullName.localeCompare(b.fullName);
  });

  const selectedSignatory = signatories.find(s => s.id === value);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedSignatory && (
            <div className="flex items-center space-x-2">
              {selectedSignatory.isPrimary && (
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
              )}
              <span>{selectedSignatory.fullName}</span>
              {selectedSignatory.designation && (
                <span className="text-muted-foreground text-xs">
                  ({selectedSignatory.designation})
                </span>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {sortedSignatories.length === 0 ? (
          <SelectItem value="" disabled>
            No signatories available
          </SelectItem>
        ) : (
          sortedSignatories.map((signatory) => (
            <SelectItem key={signatory.id} value={signatory.id}>
              <div className="flex items-center space-x-2 w-full">
                {signatory.isPrimary && (
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{signatory.fullName}</div>
                  {signatory.designation && (
                    <div className="text-xs text-muted-foreground">
                      {signatory.designation}
                    </div>
                  )}
                </div>
                <div className="flex space-x-1">
                  {signatory.signingScope.slice(0, 2).map((scope) => (
                    <Badge key={scope} variant="outline" className="text-xs">
                      {scope === 'All' ? 'All' : scope.slice(0, 3)}
                    </Badge>
                  ))}
                  {signatory.signingScope.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{signatory.signingScope.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};