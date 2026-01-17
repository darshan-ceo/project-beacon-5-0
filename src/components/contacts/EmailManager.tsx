import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mail, Plus, Trash2, Star } from 'lucide-react';
import { ContactEmail } from '@/services/clientContactsService';
import { EmailInput } from '@/components/ui/email-input';
import { EMAIL_CONFIG, isValidEmail, isEmailInList } from '@/config/emailConfig';
import { FieldTooltip } from '@/components/ui/field-tooltip';

interface EmailManagerProps {
  emails: ContactEmail[];
  onChange: (emails: ContactEmail[]) => void;
  disabled?: boolean;
  formId?: string;
}

export const EmailManager: React.FC<EmailManagerProps> = ({
  emails,
  onChange,
  disabled = false,
  formId = 'create-signatory'
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [newLabel, setNewLabel] = useState<ContactEmail['label']>('Work');

  const handleAdd = (emailToAdd?: string) => {
    const email = emailToAdd || newEmail.trim().toLowerCase();
    
    if (!email || !isValidEmail(email)) return;
    if (emails.length >= EMAIL_CONFIG.maxEmails) {
      return;
    }
    if (isEmailInList(email, emails)) return;

    const newEmailObj: ContactEmail = {
      id: `email_${Date.now()}`,
      email: email,
      label: newLabel,
      isPrimary: emails.length === 0,
      isVerified: false,
      emailOptIn: true,
      status: 'Active'
    };

    onChange([...emails, newEmailObj]);
    setNewEmail('');
    setNewLabel('Work');
  };

  const handleValidAdd = (email: string) => {
    handleAdd(email);
  };

  const handleDelete = (id: string) => {
    const filtered = emails.filter(e => e.id !== id);
    // If we deleted the primary, make the first one primary
    if (filtered.length > 0 && !filtered.some(e => e.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    onChange(filtered);
  };

  const handleSetPrimary = (id: string) => {
    onChange(emails.map(e => ({
      ...e,
      isPrimary: e.id === id
    })));
  };

  const canAdd = emails.length < EMAIL_CONFIG.maxEmails && !disabled;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <Label className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Emails
        </Label>
        <FieldTooltip formId={formId} fieldId="emails" />
      </div>

      {/* Add New Email */}
      <div className="flex gap-2">
        <div className="flex-1">
          <EmailInput
            value={newEmail}
            onChange={setNewEmail}
            onValidAdd={handleValidAdd}
            existingEmails={emails}
            disabled={!canAdd}
            placeholder="email@example.com"
            checkDuplicates={true}
          />
        </div>
        <Select
          value={newLabel}
          onValueChange={(value) => setNewLabel(value as ContactEmail['label'])}
          disabled={disabled}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EMAIL_CONFIG.labels.map(label => (
              <SelectItem key={label} value={label}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          onClick={() => handleAdd()}
          disabled={!canAdd || !newEmail.trim() || !isValidEmail(newEmail)}
          size="sm"
          title="Add email"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Email List */}
      {emails.length > 0 && (
        <div className="space-y-2 border rounded-md p-3">
          {emails.map(email => (
            <div
              key={email.id}
              className="flex items-center justify-between p-2 bg-muted/50 rounded"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{email.email}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {email.label}
                </Badge>
                {email.isPrimary && (
                  <Badge variant="default" className="text-xs shrink-0">
                    Primary
                  </Badge>
                )}
                {email.isVerified && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    ✓ Verified
                  </Badge>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {!email.isPrimary && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetPrimary(email.id)}
                    disabled={disabled}
                    title="Set as primary"
                  >
                    <Star className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(email.id)}
                  disabled={disabled}
                  title="Remove email"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {EMAIL_CONFIG.helpText}
      </p>
    </div>
  );
};
