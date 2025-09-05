export interface City {
  id: string;
  name: string;
  stateId: string;
}

export interface State {
  id: string;
  name: string;
  countryId: string;
}

export interface Country {
  id: string;
  name: string;
}

export interface AddressData {
  line1?: string;
  line2?: string;
  landmark?: string;
  locality?: string;
  district?: string;
  cityId?: string;
  stateId?: string;
  stateCode?: string;
  stateName?: string;
  countryId?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
}

class AddressLookupService {
  private countries: Country[] = [
    { id: 'IN', name: 'India' }
  ];

  private states: State[] = [
    { id: 'DL', name: 'Delhi', countryId: 'IN' },
    { id: 'MH', name: 'Maharashtra', countryId: 'IN' },
    { id: 'KA', name: 'Karnataka', countryId: 'IN' },
    { id: 'TN', name: 'Tamil Nadu', countryId: 'IN' },
    { id: 'UP', name: 'Uttar Pradesh', countryId: 'IN' },
    { id: 'GJ', name: 'Gujarat', countryId: 'IN' },
    { id: 'RJ', name: 'Rajasthan', countryId: 'IN' },
    { id: 'WB', name: 'West Bengal', countryId: 'IN' },
    { id: 'AP', name: 'Andhra Pradesh', countryId: 'IN' },
    { id: 'TS', name: 'Telangana', countryId: 'IN' }
  ];

  private cities: City[] = [
    // Delhi
    { id: 'DEL001', name: 'New Delhi', stateId: 'DL' },
    { id: 'DEL002', name: 'Delhi', stateId: 'DL' },
    { id: 'DEL003', name: 'Gurgaon', stateId: 'DL' },
    { id: 'DEL004', name: 'Noida', stateId: 'DL' },
    { id: 'DEL005', name: 'Faridabad', stateId: 'DL' },
    
    // Maharashtra
    { id: 'MH001', name: 'Mumbai', stateId: 'MH' },
    { id: 'MH002', name: 'Pune', stateId: 'MH' },
    { id: 'MH003', name: 'Nagpur', stateId: 'MH' },
    { id: 'MH004', name: 'Thane', stateId: 'MH' },
    { id: 'MH005', name: 'Nashik', stateId: 'MH' },
    
    // Karnataka
    { id: 'KA001', name: 'Bangalore', stateId: 'KA' },
    { id: 'KA002', name: 'Mysore', stateId: 'KA' },
    { id: 'KA003', name: 'Hubli', stateId: 'KA' },
    { id: 'KA004', name: 'Mangalore', stateId: 'KA' },
    
    // Tamil Nadu
    { id: 'TN001', name: 'Chennai', stateId: 'TN' },
    { id: 'TN002', name: 'Coimbatore', stateId: 'TN' },
    { id: 'TN003', name: 'Madurai', stateId: 'TN' },
    { id: 'TN004', name: 'Tiruchirappalli', stateId: 'TN' }
  ];

  async getCountries(): Promise<Country[]> {
    return [...this.countries];
  }

  async getStates(countryId?: string): Promise<State[]> {
    if (countryId) {
      return this.states.filter(state => state.countryId === countryId);
    }
    return [...this.states];
  }

  async getCities(stateId?: string): Promise<City[]> {
    if (stateId) {
      return this.cities.filter(city => city.stateId === stateId);
    }
    return [...this.cities];
  }

  async validatePincode(pincode: string): Promise<boolean> {
    const pincodeRegex = /^[0-9]{6}$/;
    return pincodeRegex.test(pincode);
  }

  async validateAddress(address: AddressData): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!address.line1?.trim()) {
      errors.push('Address line 1 is required');
    }

    if (!address.cityId) {
      errors.push('City is required');
    }

    if (!address.stateId) {
      errors.push('State is required');
    }

    if (!address.countryId) {
      errors.push('Country is required');
    }

    if (!address.pincode) {
      errors.push('Pincode is required');
    } else if (!(await this.validatePincode(address.pincode))) {
      errors.push('Invalid pincode format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const addressLookupService = new AddressLookupService();