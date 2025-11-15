/**
 * Extract city name from address object or string
 * Handles various formats:
 * - "Aayakar Bhavan, M.K. Road, Mumbai" → "Mumbai"
 * - "Tilak Marg, New Delhi - 110001" → "New Delhi" 
 * - "GST Bhavan, BKC, Mumbai - 400051" → "Mumbai"
 */
export function extractCityFromAddress(address: string | any): string {
  // If address is an object, check if city/district exists
  if (typeof address === 'object' && address !== null) {
    if (address.city) return address.city;
    if (address.district) return address.district;
    if (address.locality) return address.locality;
    
    // Build address string from object
    const addressStr = `${address.line1 || ''} ${address.line2 || ''} ${address.locality || ''} ${address.district || ''}`.trim();
    
    if (!addressStr) return 'N/A';
    
    // Extract from constructed string
    return extractFromString(addressStr);
  }
  
  // Extract from string
  if (typeof address === 'string') {
    return extractFromString(address);
  }
  
  return 'N/A';
}

function extractFromString(addressStr: string): string {
  // Pattern 1: City before pincode (e.g., "Mumbai - 400051" or "New Delhi - 110001")
  const pincodeMatch = addressStr.match(/,\s*([A-Za-z\s]+)\s*-?\s*\d{6}/);
  if (pincodeMatch) return autoCapitalize(pincodeMatch[1].trim());
  
  // Pattern 2: Last significant word/phrase after last comma
  const parts = addressStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    // Remove pincode if present
    const withoutPincode = lastPart.replace(/\s*-?\s*\d{6}/, '').trim();
    if (withoutPincode.length >= 3) {
      return autoCapitalize(withoutPincode);
    }
  }
  
  // Pattern 3: Look for common city names in the string
  const commonCities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivali', 'Vasai-Virar', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Solapur', 'Hubli-Dharwad', 'Bareilly', 'Moradabad', 'Mysore', 'Gurgaon', 'Aligarh', 'Jalandhar', 'Tiruchirappalli', 'Bhubaneswar', 'Salem', 'Warangal', 'Mira-Bhayandar', 'Thiruvananthapuram', 'Bhiwandi', 'Saharanpur', 'Guntur', 'Amravati', 'Bikaner', 'Noida', 'Jamshedpur', 'Bhilai Nagar', 'Cuttack', 'Firozabad', 'Kochi', 'Bhavnagar', 'Dehradun', 'Durgapur', 'Asansol', 'Nanded-Waghala', 'Kolhapur', 'Ajmer', 'Gulbarga', 'Jamnagar', 'Ujjain', 'Loni', 'Siliguri', 'Jhansi', 'Ulhasnagar', 'Nellore', 'Jammu', 'Sangli-Miraj-Kupwad', 'Belgaum', 'Mangalore', 'Ambattur', 'Tirunelveli', 'Malegaon', 'Gaya', 'Jalgaon', 'Udaipur', 'Maheshtala', 'Morbi'];
  
  for (const city of commonCities) {
    if (addressStr.toLowerCase().includes(city.toLowerCase())) {
      return city;
    }
  }
  
  // Fallback: return the last part if it exists
  if (parts.length > 0) {
    return autoCapitalize(parts[parts.length - 1]);
  }
  
  return 'N/A';
}

function autoCapitalize(text: string): string {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed) return text;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
