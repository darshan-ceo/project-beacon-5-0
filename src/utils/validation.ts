// Validation utilities for Project Beacon 5.0

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates PAN number format (10 characters: 5 letters, 4 digits, 1 letter)
 */
export const validatePAN = (pan: string): ValidationResult => {
  if (!pan) return { isValid: false, error: 'PAN is required' };
  
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(pan.toUpperCase())) {
    return { 
      isValid: false, 
      error: 'Invalid PAN format. Should be like ABCDE1234F' 
    };
  }
  
  return { isValid: true };
};

/**
 * Validates GST number format (15 characters)
 */
export const validateGST = (gst: string): ValidationResult => {
  if (!gst) return { isValid: true }; // GST is optional
  
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstRegex.test(gst.toUpperCase())) {
    return { 
      isValid: false, 
      error: 'Invalid GST format. Should be 15 characters like 22AAAAA0000A1Z5' 
    };
  }
  
  return { isValid: true };
};

/**
 * Validates CIN (Corporate Identification Number) format
 */
export const validateCIN = (cin: string): ValidationResult => {
  if (!cin) return { isValid: true }; // CIN is optional for some entities
  
  const cinRegex = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
  if (!cinRegex.test(cin.toUpperCase())) {
    return { 
      isValid: false, 
      error: 'Invalid CIN format. Should be like L17110DL1993PLC123456' 
    };
  }
  
  return { isValid: true };
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email) return { isValid: false, error: 'Email is required' };
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { 
      isValid: false, 
      error: 'Invalid email format' 
    };
  }
  
  return { isValid: true };
};

/**
 * Validates phone number (Indian format)
 */
export const validatePhone = (phone: string): ValidationResult => {
  if (!phone) return { isValid: false, error: 'Phone number is required' };
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Check for Indian mobile numbers (10 digits starting with 6-9) or landline with STD code
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return { isValid: true };
  }
  
  if (digits.length >= 10 && digits.length <= 12) {
    return { isValid: true };
  }
  
  return { 
    isValid: false, 
    error: 'Invalid phone number. Should be 10 digits for mobile or include STD code for landline' 
  };
};

/**
 * Validates pincode format (6 digits)
 */
export const validatePincode = (pincode: string): ValidationResult => {
  if (!pincode) return { isValid: false, error: 'Pincode is required' };
  
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  if (!pincodeRegex.test(pincode)) {
    return { 
      isValid: false, 
      error: 'Invalid pincode. Should be 6 digits and cannot start with 0' 
    };
  }
  
  return { isValid: true };
};

/**
 * Validates if required fields are filled based on client type
 */
export const validateClientForm = (formData: any, clientType: 'Individual' | 'Company' | 'Partnership' | 'Trust' | 'Society'): ValidationResult[] => {
  const errors: ValidationResult[] = [];
  
  // Common validations
  if (!formData.name?.trim()) {
    errors.push({ isValid: false, error: 'Name is required' });
  }
  
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) errors.push(emailValidation);
  
  const phoneValidation = validatePhone(formData.phone);
  if (!phoneValidation.isValid) errors.push(phoneValidation);
  
  const panValidation = validatePAN(formData.panNumber);
  if (!panValidation.isValid) errors.push(panValidation);
  
  if (formData.gstNumber) {
    const gstValidation = validateGST(formData.gstNumber);
    if (!gstValidation.isValid) errors.push(gstValidation);
  }
  
  // Address validations
  if (!formData.addressLine1?.trim()) {
    errors.push({ isValid: false, error: 'Address Line 1 is required' });
  }
  
  if (!formData.city?.trim()) {
    errors.push({ isValid: false, error: 'City is required' });
  }
  
  if (!formData.state) {
    errors.push({ isValid: false, error: 'State is required' });
  }
  
  const pincodeValidation = validatePincode(formData.pincode);
  if (!pincodeValidation.isValid) errors.push(pincodeValidation);
  
  // Company-specific validations
  if (clientType === 'Company') {
    if (!formData.companyName?.trim()) {
      errors.push({ isValid: false, error: 'Company name is required' });
    }
    
    if (formData.cin) {
      const cinValidation = validateCIN(formData.cin);
      if (!cinValidation.isValid) errors.push(cinValidation);
    }
    
    // Authorized signatory validations
    if (!formData.authorizedSignatory?.name?.trim()) {
      errors.push({ isValid: false, error: 'Authorized signatory name is required' });
    }
    
    if (!formData.authorizedSignatory?.designation?.trim()) {
      errors.push({ isValid: false, error: 'Authorized signatory designation is required' });
    }
    
    if (formData.authorizedSignatory?.email) {
      const signatoryEmailValidation = validateEmail(formData.authorizedSignatory.email);
      if (!signatoryEmailValidation.isValid) {
        errors.push({ isValid: false, error: 'Invalid authorized signatory email' });
      }
    }
    
    if (formData.authorizedSignatory?.phone) {
      const signatoryPhoneValidation = validatePhone(formData.authorizedSignatory.phone);
      if (!signatoryPhoneValidation.isValid) {
        errors.push({ isValid: false, error: 'Invalid authorized signatory phone' });
      }
    }
  }
  
  return errors;
};

/**
 * Checks for duplicate clients by PAN or GST
 */
export const checkDuplicateClient = (
  formData: any, 
  existingClients: any[], 
  excludeId?: string
): ValidationResult => {
  const duplicateByPAN = existingClients.find(
    client => client.id !== excludeId && 
    client.panNumber?.toUpperCase() === formData.panNumber?.toUpperCase()
  );
  
  if (duplicateByPAN) {
    return { 
      isValid: false, 
      error: `Client with PAN ${formData.panNumber} already exists` 
    };
  }
  
  if (formData.gstNumber) {
    const duplicateByGST = existingClients.find(
      client => client.id !== excludeId && 
      client.gstNumber?.toUpperCase() === formData.gstNumber?.toUpperCase()
    );
    
    if (duplicateByGST) {
      return { 
        isValid: false, 
        error: `Client with GST ${formData.gstNumber} already exists` 
      };
    }
  }
  
  return { isValid: true };
};