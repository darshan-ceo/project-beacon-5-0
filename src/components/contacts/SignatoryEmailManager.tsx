import React from 'react';
import { EmailManager } from './EmailManager';
import type { SignatoryEmail } from '@/contexts/AppStateContext';
import type { ContactEmail } from '@/services/clientContactsService';

interface SignatoryEmailManagerProps {
  emails: SignatoryEmail[];
  onChange: (emails: SignatoryEmail[]) => void;
  disabled?: boolean;
}

export const SignatoryEmailManager: React.FC<SignatoryEmailManagerProps> = ({
  emails,
  onChange,
  disabled
}) => {
  // Convert SignatoryEmail to ContactEmail
  const contactEmails: ContactEmail[] = emails.map(e => ({
    ...e,
    emailOptIn: true // Default for signatories
  }));

  const handleChange = (newContactEmails: ContactEmail[]) => {
    // Convert back to SignatoryEmail
    const newSignatoryEmails: SignatoryEmail[] = newContactEmails.map(e => ({
      id: e.id,
      email: e.email,
      label: e.label,
      isPrimary: e.isPrimary,
      isVerified: e.isVerified,
      status: e.status
    }));
    onChange(newSignatoryEmails);
  };

  return (
    <EmailManager
      emails={contactEmails}
      onChange={handleChange}
      disabled={disabled}
    />
  );
};
