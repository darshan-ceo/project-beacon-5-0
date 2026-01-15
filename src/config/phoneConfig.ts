export interface CountryCodeConfig {
  code: string;
  country: string;
  flag: string;
  minLength: number;
  maxLength: number;
}

export const PHONE_CONFIG = {
  defaultCountryCode: '+91',
  supportedCountryCodes: [
    { code: '+91', country: 'India', flag: '🇮🇳', minLength: 10, maxLength: 10 },
    { code: '+1', country: 'USA/Canada', flag: '🇺🇸', minLength: 10, maxLength: 10 },
    { code: '+44', country: 'UK', flag: '🇬🇧', minLength: 10, maxLength: 11 },
    { code: '+971', country: 'UAE', flag: '🇦🇪', minLength: 9, maxLength: 9 },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦', minLength: 9, maxLength: 9 },
    { code: '+65', country: 'Singapore', flag: '🇸🇬', minLength: 8, maxLength: 8 },
    { code: '+61', country: 'Australia', flag: '🇦🇺', minLength: 9, maxLength: 9 },
    { code: '+49', country: 'Germany', flag: '🇩🇪', minLength: 10, maxLength: 11 },
    { code: '+33', country: 'France', flag: '🇫🇷', minLength: 9, maxLength: 9 },
    { code: '+81', country: 'Japan', flag: '🇯🇵', minLength: 10, maxLength: 10 },
  ] as CountryCodeConfig[],
  autoEnableWhatsAppLabels: ['Mobile', 'WhatsApp'] as string[],
  duplicateCheckDebounceMs: 300,
  maxPhonesPerContact: 5,
  validationMessages: {
    incomplete: 'Number seems incomplete for the selected country',
    duplicate: (entityName: string, moduleName: string) => 
      `This phone number already exists for ${entityName} (${moduleName}). You may continue.`,
    alreadyInList: 'This number is already added',
  },
  helpText: {
    enterToAdd: 'Press Enter to add number',
    duplicateNote: 'Duplicate numbers are allowed but will be flagged for awareness',
  }
} as const;

export const getCountryConfig = (code: string): CountryCodeConfig | undefined => {
  return PHONE_CONFIG.supportedCountryCodes.find(c => c.code === code);
};

export const getDefaultCountryConfig = (): CountryCodeConfig => {
  return PHONE_CONFIG.supportedCountryCodes.find(c => c.code === PHONE_CONFIG.defaultCountryCode)!;
};
