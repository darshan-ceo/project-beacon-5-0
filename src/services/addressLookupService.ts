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
    { id: 'AN', name: 'Andaman and Nicobar Islands', countryId: 'IN' },
    { id: 'AP', name: 'Andhra Pradesh', countryId: 'IN' },
    { id: 'AR', name: 'Arunachal Pradesh', countryId: 'IN' },
    { id: 'AS', name: 'Assam', countryId: 'IN' },
    { id: 'BR', name: 'Bihar', countryId: 'IN' },
    { id: 'CG', name: 'Chhattisgarh', countryId: 'IN' },
    { id: 'CH', name: 'Chandigarh', countryId: 'IN' },
    { id: 'DH', name: 'Dadra and Nagar Haveli and Daman and Diu', countryId: 'IN' },
    { id: 'DL', name: 'Delhi', countryId: 'IN' },
    { id: 'GA', name: 'Goa', countryId: 'IN' },
    { id: 'GJ', name: 'Gujarat', countryId: 'IN' },
    { id: 'HR', name: 'Haryana', countryId: 'IN' },
    { id: 'HP', name: 'Himachal Pradesh', countryId: 'IN' },
    { id: 'JK', name: 'Jammu and Kashmir', countryId: 'IN' },
    { id: 'JH', name: 'Jharkhand', countryId: 'IN' },
    { id: 'KA', name: 'Karnataka', countryId: 'IN' },
    { id: 'KL', name: 'Kerala', countryId: 'IN' },
    { id: 'LA', name: 'Ladakh', countryId: 'IN' },
    { id: 'LD', name: 'Lakshadweep', countryId: 'IN' },
    { id: 'MP', name: 'Madhya Pradesh', countryId: 'IN' },
    { id: 'MH', name: 'Maharashtra', countryId: 'IN' },
    { id: 'MN', name: 'Manipur', countryId: 'IN' },
    { id: 'ML', name: 'Meghalaya', countryId: 'IN' },
    { id: 'MZ', name: 'Mizoram', countryId: 'IN' },
    { id: 'NL', name: 'Nagaland', countryId: 'IN' },
    { id: 'OR', name: 'Odisha', countryId: 'IN' },
    { id: 'PB', name: 'Punjab', countryId: 'IN' },
    { id: 'PY', name: 'Puducherry', countryId: 'IN' },
    { id: 'RJ', name: 'Rajasthan', countryId: 'IN' },
    { id: 'SK', name: 'Sikkim', countryId: 'IN' },
    { id: 'TN', name: 'Tamil Nadu', countryId: 'IN' },
    { id: 'TR', name: 'Tripura', countryId: 'IN' },
    { id: 'TS', name: 'Telangana', countryId: 'IN' },
    { id: 'UK', name: 'Uttarakhand', countryId: 'IN' },
    { id: 'UP', name: 'Uttar Pradesh', countryId: 'IN' },
    { id: 'WB', name: 'West Bengal', countryId: 'IN' }
  ];

  private cities: City[] = [
    // Andaman and Nicobar Islands
    { id: 'AN001', name: 'Port Blair', stateId: 'AN' },
    
    // Andhra Pradesh
    { id: 'AP001', name: 'Visakhapatnam', stateId: 'AP' },
    { id: 'AP002', name: 'Vijayawada', stateId: 'AP' },
    { id: 'AP003', name: 'Guntur', stateId: 'AP' },
    { id: 'AP004', name: 'Nellore', stateId: 'AP' },
    { id: 'AP005', name: 'Kurnool', stateId: 'AP' },
    { id: 'AP006', name: 'Tirupati', stateId: 'AP' },
    
    // Arunachal Pradesh
    { id: 'AR001', name: 'Itanagar', stateId: 'AR' },
    { id: 'AR002', name: 'Naharlagun', stateId: 'AR' },
    
    // Assam
    { id: 'AS001', name: 'Guwahati', stateId: 'AS' },
    { id: 'AS002', name: 'Silchar', stateId: 'AS' },
    { id: 'AS003', name: 'Dibrugarh', stateId: 'AS' },
    { id: 'AS004', name: 'Jorhat', stateId: 'AS' },
    
    // Bihar
    { id: 'BR001', name: 'Patna', stateId: 'BR' },
    { id: 'BR002', name: 'Gaya', stateId: 'BR' },
    { id: 'BR003', name: 'Bhagalpur', stateId: 'BR' },
    { id: 'BR004', name: 'Muzaffarpur', stateId: 'BR' },
    
    // Chhattisgarh
    { id: 'CG001', name: 'Raipur', stateId: 'CG' },
    { id: 'CG002', name: 'Bhilai', stateId: 'CG' },
    { id: 'CG003', name: 'Bilaspur', stateId: 'CG' },
    
    // Chandigarh
    { id: 'CH001', name: 'Chandigarh', stateId: 'CH' },
    
    // Dadra and Nagar Haveli and Daman and Diu
    { id: 'DH001', name: 'Daman', stateId: 'DH' },
    { id: 'DH002', name: 'Diu', stateId: 'DH' },
    { id: 'DH003', name: 'Silvassa', stateId: 'DH' },
    
    // Delhi
    { id: 'DL001', name: 'New Delhi', stateId: 'DL' },
    { id: 'DL002', name: 'Delhi', stateId: 'DL' },
    { id: 'DL003', name: 'Gurgaon', stateId: 'DL' },
    { id: 'DL004', name: 'Noida', stateId: 'DL' },
    { id: 'DL005', name: 'Faridabad', stateId: 'DL' },
    
    // Goa
    { id: 'GA001', name: 'Panaji', stateId: 'GA' },
    { id: 'GA002', name: 'Margao', stateId: 'GA' },
    { id: 'GA003', name: 'Vasco da Gama', stateId: 'GA' },
    
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
    
    // Haryana
    { id: 'HR001', name: 'Chandigarh', stateId: 'HR' },
    { id: 'HR002', name: 'Faridabad', stateId: 'HR' },
    { id: 'HR003', name: 'Gurgaon', stateId: 'HR' },
    { id: 'HR004', name: 'Hisar', stateId: 'HR' },
    { id: 'HR005', name: 'Panipat', stateId: 'HR' },
    
    // Himachal Pradesh
    { id: 'HP001', name: 'Shimla', stateId: 'HP' },
    { id: 'HP002', name: 'Dharamshala', stateId: 'HP' },
    { id: 'HP003', name: 'Manali', stateId: 'HP' },
    
    // Jammu and Kashmir
    { id: 'JK001', name: 'Srinagar', stateId: 'JK' },
    { id: 'JK002', name: 'Jammu', stateId: 'JK' },
    
    // Jharkhand
    { id: 'JH001', name: 'Ranchi', stateId: 'JH' },
    { id: 'JH002', name: 'Jamshedpur', stateId: 'JH' },
    { id: 'JH003', name: 'Dhanbad', stateId: 'JH' },
    
    // Karnataka
    { id: 'KA001', name: 'Bangalore', stateId: 'KA' },
    { id: 'KA002', name: 'Mysore', stateId: 'KA' },
    { id: 'KA003', name: 'Hubli', stateId: 'KA' },
    { id: 'KA004', name: 'Mangalore', stateId: 'KA' },
    
    // Kerala
    { id: 'KL001', name: 'Thiruvananthapuram', stateId: 'KL' },
    { id: 'KL002', name: 'Kochi', stateId: 'KL' },
    { id: 'KL003', name: 'Kozhikode', stateId: 'KL' },
    { id: 'KL004', name: 'Thrissur', stateId: 'KL' },
    
    // Ladakh
    { id: 'LA001', name: 'Leh', stateId: 'LA' },
    { id: 'LA002', name: 'Kargil', stateId: 'LA' },
    
    // Lakshadweep
    { id: 'LD001', name: 'Kavaratti', stateId: 'LD' },
    
    // Madhya Pradesh
    { id: 'MP001', name: 'Bhopal', stateId: 'MP' },
    { id: 'MP002', name: 'Indore', stateId: 'MP' },
    { id: 'MP003', name: 'Gwalior', stateId: 'MP' },
    { id: 'MP004', name: 'Jabalpur', stateId: 'MP' },
    
    // Maharashtra
    { id: 'MH001', name: 'Mumbai', stateId: 'MH' },
    { id: 'MH002', name: 'Pune', stateId: 'MH' },
    { id: 'MH003', name: 'Nagpur', stateId: 'MH' },
    { id: 'MH004', name: 'Thane', stateId: 'MH' },
    { id: 'MH005', name: 'Nashik', stateId: 'MH' },
    
    // Manipur
    { id: 'MN001', name: 'Imphal', stateId: 'MN' },
    
    // Meghalaya
    { id: 'ML001', name: 'Shillong', stateId: 'ML' },
    
    // Mizoram
    { id: 'MZ001', name: 'Aizawl', stateId: 'MZ' },
    
    // Nagaland
    { id: 'NL001', name: 'Kohima', stateId: 'NL' },
    { id: 'NL002', name: 'Dimapur', stateId: 'NL' },
    
    // Odisha
    { id: 'OR001', name: 'Bhubaneswar', stateId: 'OR' },
    { id: 'OR002', name: 'Cuttack', stateId: 'OR' },
    { id: 'OR003', name: 'Rourkela', stateId: 'OR' },
    
    // Punjab
    { id: 'PB001', name: 'Chandigarh', stateId: 'PB' },
    { id: 'PB002', name: 'Ludhiana', stateId: 'PB' },
    { id: 'PB003', name: 'Amritsar', stateId: 'PB' },
    { id: 'PB004', name: 'Jalandhar', stateId: 'PB' },
    
    // Puducherry
    { id: 'PY001', name: 'Puducherry', stateId: 'PY' },
    { id: 'PY002', name: 'Karaikal', stateId: 'PY' },
    
    // Rajasthan
    { id: 'RJ001', name: 'Jaipur', stateId: 'RJ' },
    { id: 'RJ002', name: 'Jodhpur', stateId: 'RJ' },
    { id: 'RJ003', name: 'Udaipur', stateId: 'RJ' },
    { id: 'RJ004', name: 'Kota', stateId: 'RJ' },
    { id: 'RJ005', name: 'Bikaner', stateId: 'RJ' },
    { id: 'RJ006', name: 'Ajmer', stateId: 'RJ' },
    
    // Sikkim
    { id: 'SK001', name: 'Gangtok', stateId: 'SK' },
    
    // Tamil Nadu
    { id: 'TN001', name: 'Chennai', stateId: 'TN' },
    { id: 'TN002', name: 'Coimbatore', stateId: 'TN' },
    { id: 'TN003', name: 'Madurai', stateId: 'TN' },
    { id: 'TN004', name: 'Tiruchirappalli', stateId: 'TN' },
    
    // Tripura
    { id: 'TR001', name: 'Agartala', stateId: 'TR' },
    
    // Telangana
    { id: 'TS001', name: 'Hyderabad', stateId: 'TS' },
    { id: 'TS002', name: 'Warangal', stateId: 'TS' },
    { id: 'TS003', name: 'Nizamabad', stateId: 'TS' },
    { id: 'TS004', name: 'Karimnagar', stateId: 'TS' },
    
    // Uttarakhand
    { id: 'UK001', name: 'Dehradun', stateId: 'UK' },
    { id: 'UK002', name: 'Haridwar', stateId: 'UK' },
    { id: 'UK003', name: 'Nainital', stateId: 'UK' },
    
    // Uttar Pradesh
    { id: 'UP001', name: 'Lucknow', stateId: 'UP' },
    { id: 'UP002', name: 'Kanpur', stateId: 'UP' },
    { id: 'UP003', name: 'Agra', stateId: 'UP' },
    { id: 'UP004', name: 'Varanasi', stateId: 'UP' },
    { id: 'UP005', name: 'Meerut', stateId: 'UP' },
    { id: 'UP006', name: 'Allahabad', stateId: 'UP' },
    { id: 'UP007', name: 'Bareilly', stateId: 'UP' },
    { id: 'UP008', name: 'Ghaziabad', stateId: 'UP' },
    
    // West Bengal
    { id: 'WB001', name: 'Kolkata', stateId: 'WB' },
    { id: 'WB002', name: 'Howrah', stateId: 'WB' },
    { id: 'WB003', name: 'Durgapur', stateId: 'WB' },
    { id: 'WB004', name: 'Asansol', stateId: 'WB' },
    { id: 'WB005', name: 'Siliguri', stateId: 'WB' }
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