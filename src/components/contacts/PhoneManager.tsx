import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Phone, Plus, Trash2, Star, MessageCircle } from 'lucide-react';
import { ContactPhone } from '@/services/clientContactsService';
import { PhoneInput, PhoneValue } from '@/components/ui/phone-input';
import { PHONE_CONFIG } from '@/config/phoneConfig';
import { isNumberInList } from '@/utils/phoneUtils';
import { cn } from '@/lib/utils';

interface PhoneManagerProps {
  phones: ContactPhone[];
  onChange: (phones: ContactPhone[]) => void;
  disabled?: boolean;
  excludeEntityId?: string;
}

export const PhoneManager: React.FC<PhoneManagerProps> = ({
  phones,
  onChange,
  disabled = false,
  excludeEntityId
}) => {
  const [phoneValue, setPhoneValue] = useState<PhoneValue>({
    countryCode: PHONE_CONFIG.defaultCountryCode,
    number: ''
  });
  const [newLabel, setNewLabel] = useState<ContactPhone['label']>('Mobile');
  const [isWhatsApp, setIsWhatsApp] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
  const isAddingRef = useRef(false);

  // Auto-enable WhatsApp for Mobile label
  React.useEffect(() => {
    if (PHONE_CONFIG.autoEnableWhatsAppLabels.includes(newLabel as string)) {
      setIsWhatsApp(true);
    }
  }, [newLabel]);

  const handleAdd = useCallback(() => {
    if (isAddingRef.current) return;
    if (!phoneValue.number.trim()) return;
    if (phones.length >= PHONE_CONFIG.maxPhonesPerContact) {
      return;
    }

    // Prevent duplicate in current list
    if (isNumberInList(phoneValue.countryCode, phoneValue.number, phones)) {
      return;
    }

    isAddingRef.current = true;

    const phoneId = `phone_${Date.now()}`;
    const phone: ContactPhone = {
      id: phoneId,
      countryCode: phoneValue.countryCode,
      number: phoneValue.number.trim(),
      label: newLabel,
      isPrimary: phones.length === 0,
      isWhatsApp,
      smsOptIn: true,
      isVerified: false,
      status: 'Active'
    };

    onChange([...phones, phone]);
    
    // Show animation
    setRecentlyAdded(phoneId);
    setTimeout(() => setRecentlyAdded(null), 1000);

    // Reset form
    setPhoneValue({ countryCode: phoneValue.countryCode, number: '' });
    setNewLabel('Mobile');
    setIsWhatsApp(PHONE_CONFIG.autoEnableWhatsAppLabels.includes('Mobile'));

    setTimeout(() => {
      isAddingRef.current = false;
    }, 100);
  }, [phoneValue, newLabel, isWhatsApp, phones, onChange]);

  const handleValidAdd = useCallback((value: PhoneValue) => {
    if (value.number) {
      handleAdd();
    }
  }, [handleAdd]);

  const handleDelete = (id: string) => {
    const filtered = phones.filter(p => p.id !== id);
    // If we deleted the primary, make first one primary
    if (filtered.length > 0 && !filtered.some(p => p.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    onChange(filtered);
  };

  const handleSetPrimary = (id: string) => {
    onChange(phones.map(p => ({
      ...p,
      isPrimary: p.id === id
    })));
  };

  const canAddMore = phones.length < PHONE_CONFIG.maxPhonesPerContact;

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Phone className="h-4 w-4" />
        Phone Numbers
      </Label>

      {/* Add New Phone */}
      {canAddMore && (
        <div className="space-y-2">
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <PhoneInput
                value={phoneValue}
                onChange={setPhoneValue}
                onValidAdd={handleValidAdd}
                existingPhones={phones}
                checkDuplicates={true}
                excludeEntityId={excludeEntityId}
                disabled={disabled}
                autoFocus={false}
              />
            </div>
            <Select
              value={newLabel}
              onValueChange={(value) => setNewLabel(value as ContactPhone['label'])}
              disabled={disabled}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mobile">Mobile</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Office">Office</SelectItem>
                <SelectItem value="Home">Home</SelectItem>
                <SelectItem value="Legal">Legal</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isWhatsApp"
                checked={isWhatsApp}
                onCheckedChange={(checked) => setIsWhatsApp(checked as boolean)}
                disabled={disabled}
              />
              <Label htmlFor="isWhatsApp" className="text-sm font-normal cursor-pointer">
                WhatsApp Enabled
              </Label>
            </div>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={disabled || !phoneValue.number.trim()}
              size="sm"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Phone List */}
      {phones.length > 0 && (
        <div className="space-y-2 border rounded-md p-3">
          {phones.map(phone => (
            <div
              key={phone.id}
              className={cn(
                "flex items-center justify-between p-2 bg-muted/50 rounded transition-all duration-300",
                recentlyAdded === phone.id && "ring-2 ring-primary/50 bg-primary/5 animate-in fade-in slide-in-from-top-2"
              )}
            >
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-sm font-mono">
                  {phone.countryCode} {phone.number}
                </span>
                <Badge variant="outline" className="text-xs">
                  {phone.label}
                </Badge>
                {phone.isPrimary && (
                  <Badge variant="default" className="text-xs">
                    Primary
                  </Badge>
                )}
                {phone.isWhatsApp && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <MessageCircle className="h-2 w-2" />
                    WhatsApp
                  </Badge>
                )}
                {phone.isVerified && (
                  <Badge variant="secondary" className="text-xs">
                    ✓ Verified
                  </Badge>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {!phone.isPrimary && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetPrimary(phone.id)}
                    disabled={disabled}
                    title="Set as primary"
                  >
                    <Star className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(phone.id)}
                  disabled={disabled}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        {PHONE_CONFIG.helpText.enterToAdd}. {PHONE_CONFIG.helpText.duplicateNote}.
        {!canAddMore && ` Maximum ${PHONE_CONFIG.maxPhonesPerContact} phone numbers reached.`}
      </p>
    </div>
  );
};
