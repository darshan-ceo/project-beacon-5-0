export type MappingService = 'google' | 'osm' | 'bing' | 'mapmyindia';

export interface MappingServiceConfig {
  id: MappingService;
  name: string;
  icon: string;
  urlTemplate: (pincode: string) => string;
  description: string;
}

export const MAPPING_SERVICES: MappingServiceConfig[] = [
  {
    id: 'google',
    name: 'Google Maps',
    icon: 'Map',
    urlTemplate: (pincode) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pincode)}`,
    description: 'Most comprehensive global mapping service'
  },
  {
    id: 'osm',
    name: 'OpenStreetMap',
    icon: 'Globe',
    urlTemplate: (pincode) => `https://www.openstreetmap.org/search?query=${encodeURIComponent(pincode)}`,
    description: 'Open-source community-driven maps'
  },
  {
    id: 'bing',
    name: 'Bing Maps',
    icon: 'MapPin',
    urlTemplate: (pincode) => `https://www.bing.com/maps?q=${encodeURIComponent(pincode)}`,
    description: 'Microsoft mapping service'
  },
  {
    id: 'mapmyindia',
    name: 'MapMyIndia',
    icon: 'Navigation',
    urlTemplate: (pincode) => `https://www.mapmyindia.com/maps/place/${encodeURIComponent(pincode)}`,
    description: 'Accurate Indian location data'
  }
];
