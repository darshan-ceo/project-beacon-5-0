import { EnhancedAddressData } from '@/services/addressMasterService';

export type MappingService = 'google' | 'osm' | 'bing' | 'mapmyindia';

export interface MappingServiceConfig {
  id: MappingService;
  name: string;
  icon: string;
  urlTemplate: (address: EnhancedAddressData | any) => string;
  description: string;
}

export const MAPPING_SERVICES: MappingServiceConfig[] = [
  {
    id: 'google',
    name: 'Google Maps',
    icon: 'Map',
    urlTemplate: (address) => {
      const parts = [
        address.line1,
        address.line2,
        address.locality,
        address.district,
        address.cityName || address.city,
        address.stateName || address.state,
        address.pincode,
        'India'
      ].filter(Boolean).join(', ');
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts)}`;
    },
    description: 'Most comprehensive global mapping service'
  },
  {
    id: 'osm',
    name: 'OpenStreetMap',
    icon: 'Globe',
    urlTemplate: (address) => {
      const parts = [
        address.line1,
        address.line2,
        address.locality,
        address.district,
        address.cityName || address.city,
        address.stateName || address.state,
        address.pincode,
        'India'
      ].filter(Boolean).join(', ');
      return `https://www.openstreetmap.org/search?query=${encodeURIComponent(parts)}`;
    },
    description: 'Open-source community-driven maps'
  },
  {
    id: 'bing',
    name: 'Bing Maps',
    icon: 'MapPin',
    urlTemplate: (address) => {
      const parts = [
        address.line1,
        address.line2,
        address.locality,
        address.district,
        address.cityName || address.city,
        address.stateName || address.state,
        address.pincode,
        'India'
      ].filter(Boolean).join(', ');
      return `https://www.bing.com/maps?q=${encodeURIComponent(parts)}`;
    },
    description: 'Microsoft mapping service'
  },
  {
    id: 'mapmyindia',
    name: 'MapMyIndia',
    icon: 'Navigation',
    urlTemplate: (address) => {
      const parts = [
        address.line1,
        address.line2,
        address.locality,
        address.district,
        address.cityName || address.city,
        address.stateName || address.state,
        address.pincode
      ].filter(Boolean).join(', ');
      return `https://www.mapmyindia.com/maps/place/${encodeURIComponent(parts)}`;
    },
    description: 'Accurate Indian location data'
  }
];
