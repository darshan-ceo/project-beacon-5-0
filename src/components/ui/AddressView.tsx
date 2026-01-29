/**
 * AddressView Component
 * Read-only display component for enhanced address data
 * Uses centralized addressUtils for formatting consistency
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SourceChip, DataSource } from '@/components/ui/source-chip';
import { EnhancedAddressData } from '@/services/addressMasterService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDisplayAddress as formatAddressUtil } from '@/utils/addressUtils';
interface AddressViewProps {
  address: EnhancedAddressData | null;
  showSource?: boolean;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export const AddressView: React.FC<AddressViewProps> = ({
  address,
  showSource = true,
  showActions = false,
  compact = false,
  className
}) => {
  if (!address) {
    return (
      <div className={cn('text-sm text-muted-foreground italic', className)}>
        No address information available
      </div>
    );
  }

  // Debug logging
  console.log('[AddressView] Rendering address:', {
    hasLine1: !!address?.line1,
    hasLine2: !!address?.line2,
    hasLocality: !!address?.locality,
    hasDistrict: !!address?.district,
    hasStateName: !!address?.stateName,
    hasPincode: !!address?.pincode,
    source: address?.source,
    fullAddress: address
  });

  // Use centralized address formatting utility for consistency
  const formatAddress = (addr: EnhancedAddressData): string => {
    return formatAddressUtil(addr);
  };

  const copyToClipboard = () => {
    const addressText = formatAddress(address);
    navigator.clipboard.writeText(addressText);
    toast.success('Address copied to clipboard');
  };

  const openInMaps = () => {
    const addressText = formatAddress(address);
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(addressText)}`;
    window.open(mapsUrl, '_blank');
  };

  if (compact) {
    return (
      <div className={cn('flex items-start gap-2', className)}>
        <div className="flex-1 text-sm">
          {formatAddress(address)}
        </div>
        {showSource && (
          <SourceChip source={address.source} />
        )}
      </div>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with source and actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Address</span>
            </div>
            <div className="flex items-center gap-2">
              {showSource && (
                <SourceChip source={address.source} />
              )}
              {showActions && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyToClipboard}
                    className="h-7 w-7 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openInMaps}
                    className="h-7 w-7 p-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Address details */}
          <div className="space-y-2">
            {/* Primary address lines */}
            <div className="space-y-1">
              {address.line1 && (
                <div className="text-sm font-medium">{address.line1}</div>
              )}
              {address.line2 && (
                <div className="text-sm text-muted-foreground">{address.line2}</div>
              )}
            </div>

            {/* Secondary details - show even if some fields are empty */}
            {(address.landmark || address.locality || address.district) && (
              <div className="grid grid-cols-1 gap-1 text-sm text-muted-foreground">
                {address.landmark && (
                  <div>
                    <span className="font-medium">Landmark:</span> {address.landmark}
                  </div>
                )}
                {address.locality && (
                  <div>
                    <span className="font-medium">Locality:</span> {address.locality}
                  </div>
                )}
                {address.district && (
                  <div>
                    <span className="font-medium">District:</span> {address.district}
                  </div>
                )}
              </div>
            )}

            {/* Location details */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {address.stateName && (
                <Badge variant="outline" className="text-xs">
                  {address.stateName}
                </Badge>
              )}
              {address.pincode && (
                <Badge variant="outline" className="text-xs">
                  {address.pincode}
                </Badge>
              )}
              {address.stateCode && (
                <Badge variant="secondary" className="text-xs">
                  {address.stateCode}
                </Badge>
              )}
            </div>

            {/* Coordinates if available */}
            {(address.lat || address.lng) && (
              <div className="text-xs text-muted-foreground">
                Coordinates: {address.lat}, {address.lng}
              </div>
            )}
          </div>

          {/* Timestamps */}
          {(address.createdAt || address.updatedAt) && (
            <>
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                {address.createdAt && (
                  <div>Created: {new Date(address.createdAt).toLocaleDateString()}</div>
                )}
                {address.updatedAt && address.updatedAt !== address.createdAt && (
                  <div>Updated: {new Date(address.updatedAt).toLocaleDateString()}</div>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Compact address display for tables and lists
 */
interface AddressDisplayProps {
  address: EnhancedAddressData | null;
  showSource?: boolean;
  maxLength?: number;
  className?: string;
}

export const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  showSource = false,
  maxLength = 100,
  className
}) => {
  if (!address) {
    return (
      <span className={cn('text-muted-foreground italic', className)}>
        No address
      </span>
    );
  }

  // Use centralized address formatting utility
  const addressText = formatAddressUtil(address);
  const displayText = addressText.length > maxLength 
    ? addressText.substring(0, maxLength) + '...'
    : addressText;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm" title={addressText}>
        {displayText}
      </span>
      {showSource && (
        <SourceChip source={address.source} />
      )}
    </div>
  );
};

/**
 * Address summary for cards and previews
 */
interface AddressSummaryProps {
  address: EnhancedAddressData | null;
  showPincode?: boolean;
  showState?: boolean;
  className?: string;
}

export const AddressSummary: React.FC<AddressSummaryProps> = ({
  address,
  showPincode = true,
  showState = true,
  className
}) => {
  if (!address) {
    return null;
  }

  return (
    <div className={cn('text-sm text-muted-foreground', className)}>
      <div className="truncate">
        {address.line1}
        {address.locality && `, ${address.locality}`}
      </div>
      <div className="flex items-center gap-2 mt-1">
        {address.district && (
          <span>{address.district}</span>
        )}
        {showState && address.stateName && (
          <Badge variant="outline" className="text-xs">
            {address.stateName}
          </Badge>
        )}
        {showPincode && address.pincode && (
          <Badge variant="secondary" className="text-xs">
            {address.pincode}
          </Badge>
        )}
      </div>
    </div>
  );
};