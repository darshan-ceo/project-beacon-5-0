/**
 * GSTAT State Bench Location Metadata
 * Based on official GSTAT notification for state-wise bench locations
 */

export interface StateBenchLocation {
  state: string;
  cities: string[];
}

/**
 * Official GSTAT State Bench locations as per latest notification
 */
export const GSTAT_STATE_BENCHES: StateBenchLocation[] = [
  { state: 'Andhra Pradesh', cities: ['Hyderabad', 'Visakhapatnam'] },
  { state: 'Arunachal Pradesh', cities: ['Guwahati'] },
  { state: 'Assam', cities: ['Guwahati'] },
  { state: 'Bihar', cities: ['Patna'] },
  { state: 'Chhattisgarh', cities: ['Raipur'] },
  { state: 'Goa', cities: ['Mumbai', 'Panaji'] },
  { state: 'Gujarat', cities: ['Ahmedabad', 'Rajkot', 'Surat'] },
  { state: 'Haryana', cities: ['Chandigarh', 'Delhi'] },
  { state: 'Himachal Pradesh', cities: ['Chandigarh'] },
  { state: 'Jharkhand', cities: ['Ranchi', 'Kolkata'] },
  { state: 'Karnataka', cities: ['Bengaluru'] },
  { state: 'Kerala', cities: ['Kochi', 'Thiruvananthapuram'] },
  { state: 'Madhya Pradesh', cities: ['Indore', 'Bhopal'] },
  { state: 'Maharashtra', cities: ['Mumbai', 'Pune', 'Nagpur', 'Aurangabad'] },
  { state: 'Manipur', cities: ['Guwahati'] },
  { state: 'Meghalaya', cities: ['Guwahati'] },
  { state: 'Mizoram', cities: ['Guwahati'] },
  { state: 'Nagaland', cities: ['Guwahati'] },
  { state: 'Odisha', cities: ['Bhubaneswar'] },
  { state: 'Punjab', cities: ['Chandigarh'] },
  { state: 'Rajasthan', cities: ['Jaipur'] },
  { state: 'Sikkim', cities: ['Kolkata'] },
  { state: 'Tamil Nadu', cities: ['Chennai', 'Madurai'] },
  { state: 'Telangana', cities: ['Hyderabad'] },
  { state: 'Tripura', cities: ['Guwahati', 'Kolkata'] },
  { state: 'Uttar Pradesh', cities: ['Allahabad', 'Lucknow'] },
  { state: 'Uttarakhand', cities: ['Delhi'] },
  { state: 'West Bengal', cities: ['Kolkata'] },
  { state: 'Andaman and Nicobar Islands', cities: ['Kolkata'] },
  { state: 'Chandigarh', cities: ['Chandigarh'] },
  { state: 'Dadra and Nagar Haveli', cities: ['Mumbai', 'Ahmedabad'] },
  { state: 'Daman and Diu', cities: ['Mumbai', 'Ahmedabad'] },
  { state: 'Delhi', cities: ['Delhi'] },
  { state: 'Jammu and Kashmir', cities: ['Chandigarh'] },
  { state: 'Ladakh', cities: ['Chandigarh'] },
  { state: 'Lakshadweep', cities: ['Kochi'] },
  { state: 'Puducherry', cities: ['Chennai'] }
];

/**
 * Get cities for a specific state
 */
export function getCitiesForState(state: string): string[] {
  const stateData = GSTAT_STATE_BENCHES.find(s => s.state === state);
  return stateData?.cities || [];
}

/**
 * Get all unique states
 */
export function getAllStates(): string[] {
  return GSTAT_STATE_BENCHES.map(s => s.state).sort();
}

/**
 * Validate if a city exists for a given state
 */
export function isValidStateCityCombination(state: string, city: string): boolean {
  const cities = getCitiesForState(state);
  return cities.includes(city);
}
