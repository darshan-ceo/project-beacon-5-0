/**
 * Geocoding Service
 * Uses OpenStreetMap Nominatim API for address geocoding
 * Free, no API key required, 1 request/second rate limit
 */

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  confidence: 'high' | 'medium' | 'low';
  placeType: string;
}

export interface GeocodingResponse {
  success: boolean;
  data: GeocodingResult | null;
  error: string | null;
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

class GeocodingService {
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number = 1100; // 1.1 seconds to comply with OSM policy

  /**
   * Geocode an address to lat/lng coordinates
   */
  async geocodeAddress(address: {
    line1?: string;
    line2?: string;
    locality?: string;
    cityName?: string;
    district?: string;
    stateName?: string;
    pincode?: string;
    countryName?: string;
  }): Promise<GeocodingResponse> {
    // Rate limiting - wait if needed
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();

    // Build query string from address parts
    const parts = [
      address.line1,
      address.line2,
      address.locality,
      address.cityName,
      address.district,
      address.stateName,
      address.pincode,
      address.countryName || 'India'
    ].filter(Boolean);

    if (parts.length < 2) {
      return { success: false, data: null, error: 'Insufficient address data for geocoding' };
    }

    const query = parts.join(', ');

    try {
      const response = await fetch(
        `${NOMINATIM_BASE_URL}/search?` + new URLSearchParams({
          q: query,
          format: 'json',
          addressdetails: '1',
          limit: '1',
          countrycodes: 'in' // Restrict to India for accuracy
        }),
        {
          headers: {
            'User-Agent': 'LegalERP/1.0 (Lovable Application)'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.status}`);
      }

      const results = await response.json();

      if (!results || results.length === 0) {
        return { success: false, data: null, error: 'No coordinates found for this address' };
      }

      const result = results[0];
      const importance = parseFloat(result.importance || '0');

      return {
        success: true,
        data: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          displayName: result.display_name,
          confidence: importance > 0.6 ? 'high' : importance > 0.3 ? 'medium' : 'low',
          placeType: result.type || 'unknown'
        },
        error: null
      };
    } catch (error) {
      console.error('[GeocodingService] Error:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Geocoding failed'
      };
    }
  }

  /**
   * Build a map URL for the given coordinates
   */
  buildMapUrl(lat: number, lng: number, provider: 'google' | 'osm' = 'google'): string {
    if (provider === 'osm') {
      return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=17`;
    }
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
}

export const geocodingService = new GeocodingService();
