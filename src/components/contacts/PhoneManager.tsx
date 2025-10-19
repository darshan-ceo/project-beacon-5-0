import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Phone, Plus, Trash2, Star, MessageCircle } from 'lucide-react';
import { ContactPhone } from '@/services/clientContactsService';

interface PhoneManagerProps {
  phones: ContactPhone[];
  onChange: (phones: ContactPhone[]) => void;
  disabled?: boolean;
}

export const PhoneManager: React.FC<PhoneManagerProps> = ({
  phones,
  onChange,
  disabled = false
}) => {
  const [newCountryCode, setNewCountryCode] = useState('+91');
  const [newNumber, setNewNumber] = useState('');
  const [newLabel, setNewLabel] = useState<ContactPhone['label']>('Mobile');
  const [isWhatsApp, setIsWhatsApp] = useState(false);

  const handleAdd = () => {
    if (!newNumber.trim()) return;
    if (phones.length >= 5) {
      alert('Maximum 5 phone numbers allowed per contact');
      return;
    }

    const phone: ContactPhone = {
      id: `phone_${Date.now()}`,
      countryCode: newCountryCode,
      number: newNumber.trim(),
      label: newLabel,
      isPrimary: phones.length === 0,
      isWhatsApp,
      smsOptIn: true,
      isVerified: false,
      status: 'Active'
    };

    onChange([...phones, phone]);
    setNewNumber('');
    setNewLabel('Mobile');
    setIsWhatsApp(false);
  };

  const handleDelete = (id: string) => {
    const filtered = phones.filter(p => p.id !== id);
    onChange(filtered);
  };

  const handleSetPrimary = (id: string) => {
    onChange(phones.map(p => ({
      ...p,
      isPrimary: p.id === id
    })));
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Phone className="h-4 w-4" />
        Phone Numbers
      </Label>

      {/* Add New Phone */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Select
            value={newCountryCode}
            onValueChange={setNewCountryCode}
            disabled={disabled}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="+91">+91 (IN)</SelectItem>
              <SelectItem value="+1">+1 (US)</SelectItem>
              <SelectItem value="+44">+44 (UK)</SelectItem>
              <SelectItem value="+971">+971 (UAE)</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="tel"
            placeholder="9876543210"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value.replace(/[^0-9]/g, ''))}
            disabled={disabled || phones.length >= 5}
            className="flex-1"
          />
          <Select
            value={newLabel}
            onValueChange={(value) => setNewLabel(value as ContactPhone['label'])}
            disabled={disabled}
          >
            <SelectTrigger className="w-[120px]">
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
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="isWhatsApp"
              checked={isWhatsApp}
              onCheckedChange={(checked) => setIsWhatsApp(checked as boolean)}
              disabled={disabled}
            />
            <Label htmlFor="isWhatsApp" className="text-sm font-normal">
              WhatsApp Enabled
            </Label>
          </div>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={disabled || !newNumber.trim() || phones.length >= 5}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Phone
          </Button>
        </div>
      </div>

      {/* Phone List */}
      {phones.length > 0 && (
        <div className="space-y-2 border rounded-md p-3">
          {phones.map(phone => (
            <div
              key={phone.id}
              className="flex items-center justify-between p-2 bg-muted/50 rounded"
            >
              <div className="flex items-center gap-2 flex-1">
                <Phone className="h-3 w-3 text-muted-foreground" />
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
              <div className="flex gap-1">
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

      <p className="text-xs text-muted-foreground">
        Add up to 5 phone numbers. E.164 format recommended (e.g., +919876543210).
      </p>
    </div>
  );
};
