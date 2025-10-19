import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mail, Plus, Trash2, Star } from 'lucide-react';
import { ContactEmail } from '@/services/clientContactsService';

interface EmailManagerProps {
  emails: ContactEmail[];
  onChange: (emails: ContactEmail[]) => void;
  disabled?: boolean;
}

export const EmailManager: React.FC<EmailManagerProps> = ({
  emails,
  onChange,
  disabled = false
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [newLabel, setNewLabel] = useState<ContactEmail['label']>('Work');

  const handleAdd = () => {
    if (!newEmail.trim()) return;
    if (emails.length >= 5) {
      alert('Maximum 5 emails allowed per contact');
      return;
    }

    const email: ContactEmail = {
      id: `email_${Date.now()}`,
      email: newEmail.toLowerCase().trim(),
      label: newLabel,
      isPrimary: emails.length === 0,
      isVerified: false,
      emailOptIn: true,
      status: 'Active'
    };

    onChange([...emails, email]);
    setNewEmail('');
    setNewLabel('Work');
  };

  const handleDelete = (id: string) => {
    const filtered = emails.filter(e => e.id !== id);
    onChange(filtered);
  };

  const handleSetPrimary = (id: string) => {
    onChange(emails.map(e => ({
      ...e,
      isPrimary: e.id === id
    })));
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Mail className="h-4 w-4" />
        Emails
      </Label>

      {/* Add New Email */}
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="email@example.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          disabled={disabled || emails.length >= 5}
          className="flex-1"
        />
        <Select
          value={newLabel}
          onValueChange={(value) => setNewLabel(value as ContactEmail['label'])}
          disabled={disabled}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Work">Work</SelectItem>
            <SelectItem value="Personal">Personal</SelectItem>
            <SelectItem value="Legal">Legal</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          onClick={handleAdd}
          disabled={disabled || !newEmail.trim() || emails.length >= 5}
          size="sm"
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
              <div className="flex items-center gap-2 flex-1">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm">{email.email}</span>
                <Badge variant="outline" className="text-xs">
                  {email.label}
                </Badge>
                {email.isPrimary && (
                  <Badge variant="default" className="text-xs">
                    Primary
                  </Badge>
                )}
                {email.isVerified && (
                  <Badge variant="secondary" className="text-xs">
                    ✓ Verified
                  </Badge>
                )}
              </div>
              <div className="flex gap-1">
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
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Add up to 5 email addresses. First email is auto-set as primary.
      </p>
    </div>
  );
};
