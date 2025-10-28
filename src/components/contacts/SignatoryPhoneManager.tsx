import React from 'react';
import { PhoneManager } from './PhoneManager';
import type { SignatoryPhone } from '@/contexts/AppStateContext';
import type { ContactPhone } from '@/services/clientContactsService';

interface SignatoryPhoneManagerProps {
  phones: SignatoryPhone[];
  onChange: (phones: SignatoryPhone[]) => void;
  disabled?: boolean;
}

export const SignatoryPhoneManager: React.FC<SignatoryPhoneManagerProps> = ({
  phones,
  onChange,
  disabled
}) => {
  // Convert SignatoryPhone to ContactPhone
  const contactPhones: ContactPhone[] = phones.map(p => ({
    ...p,
    smsOptIn: true // Default for signatories
  }));

  const handleChange = (newContactPhones: ContactPhone[]) => {
    // Convert back to SignatoryPhone
    const newSignatoryPhones: SignatoryPhone[] = newContactPhones.map(p => ({
      id: p.id,
      countryCode: p.countryCode,
      number: p.number,
      label: p.label,
      isPrimary: p.isPrimary,
      isWhatsApp: p.isWhatsApp,
      isVerified: p.isVerified,
      status: p.status
    }));
    onChange(newSignatoryPhones);
  };

  return (
    <PhoneManager
      phones={contactPhones}
      onChange={handleChange}
      disabled={disabled}
    />
  );
};
