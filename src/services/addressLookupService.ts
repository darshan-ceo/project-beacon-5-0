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
    { id: 'TN004', name: 'Tiruchirappalli', stateId: 'TN' },
    
    // Gujarat
    { id: 'GJ001', name: 'Ahmedabad', stateId: 'GJ' },
    { id: 'GJ002', name: 'Surat', stateId: 'GJ' },
    { id: 'GJ003', name: 'Vadodara', stateId: 'GJ' },
    { id: 'GJ004', name: 'Rajkot', stateId: 'GJ' },
    { id: 'GJ005', name: 'Gandhinagar', stateId: 'GJ' },
    { id: 'GJ006', name: 'Jamnagar', stateId: 'GJ' },
    { id: 'GJ007', name: 'Junagadh', stateId: 'GJ' },
    { id: 'GJ008', name: 'Bhavnagar', stateId: 'GJ' },
    { id: 'GJ009', name: 'Anand', stateId: 'GJ' },
    { id: 'GJ010', name: 'Bharuch', stateId: 'GJ' },
    
    // Uttar Pradesh
    { id: 'UP001', name: 'Lucknow', stateId: 'UP' },
    { id: 'UP002', name: 'Kanpur', stateId: 'UP' },
    { id: 'UP003', name: 'Agra', stateId: 'UP' },
    { id: 'UP004', name: 'Varanasi', stateId: 'UP' },
    { id: 'UP005', name: 'Meerut', stateId: 'UP' },
    { id: 'UP006', name: 'Allahabad', stateId: 'UP' },
    { id: 'UP007', name: 'Bareilly', stateId: 'UP' },
    { id: 'UP008', name: 'Ghaziabad', stateId: 'UP' },
    
    // Rajasthan
    { id: 'RJ001', name: 'Jaipur', stateId: 'RJ' },
    { id: 'RJ002', name: 'Jodhpur', stateId: 'RJ' },
    { id: 'RJ003', name: 'Udaipur', stateId: 'RJ' },
    { id: 'RJ004', name: 'Kota', stateId: 'RJ' },
    { id: 'RJ005', name: 'Bikaner', stateId: 'RJ' },
    { id: 'RJ006', name: 'Ajmer', stateId: 'RJ' },
    
    // West Bengal
    { id: 'WB001', name: 'Kolkata', stateId: 'WB' },
    { id: 'WB002', name: 'Howrah', stateId: 'WB' },
    { id: 'WB003', name: 'Durgapur', stateId: 'WB' },
    { id: 'WB004', name: 'Asansol', stateId: 'WB' },
    { id: 'WB005', name: 'Siliguri', stateId: 'WB' },
    
    // Andhra Pradesh
    { id: 'AP001', name: 'Visakhapatnam', stateId: 'AP' },
    { id: 'AP002', name: 'Vijayawada', stateId: 'AP' },
    { id: 'AP003', name: 'Guntur', stateId: 'AP' },
    { id: 'AP004', name: 'Nellore', stateId: 'AP' },
    { id: 'AP005', name: 'Kurnool', stateId: 'AP' },
    
    // Telangana
    { id: 'TS001', name: 'Hyderabad', stateId: 'TS' },
    { id: 'TS002', name: 'Warangal', stateId: 'TS' },
    { id: 'TS003', name: 'Nizamabad', stateId: 'TS' },
    { id: 'TS004', name: 'Karimnagar', stateId: 'TS' }
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