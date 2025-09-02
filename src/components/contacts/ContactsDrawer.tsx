/**
 * Contacts Drawer Component for Beacon Essential 5.0
 * Reusable contact selection across litigation workflows
 */

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Users, 
  Plus, 
  Mail, 
  Phone, 
  User,
  Building2
} from 'lucide-react';
import { 
  clientContactsService, 
  ClientContact, 
  ContactRole 
} from '@/services/clientContactsService';
import { CreateContactDrawer } from './CreateContactDrawer';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ContactsDrawerProps {
  clientId: string;
  selectedContacts?: ClientContact[];
  onSelectContact: (contact: ClientContact) => void;
  onDeselectContact?: (contactId: string) => void;
  allowMultiple?: boolean;
  roleFilter?: ContactRole[];
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
}

export const ContactsDrawer: React.FC<ContactsDrawerProps> = ({
  clientId,
  selectedContacts = [],
  onSelectContact,
  onDeselectContact,
  allowMultiple = false,
  roleFilter,
  trigger,
  title = 'Select Contacts',
  description = 'Choose contacts for this action'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);

  // Fetch contacts when drawer opens
  useEffect(() => {
    if (isOpen && clientId) {
      fetchContacts();
    }
  }, [isOpen, clientId, roleFilter]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await clientContactsService.getContacts(clientId, {
        roles: roleFilter,
        isActive: true
      });

      if (response.success && response.data) {
        setContacts(response.data);
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to load contacts',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error while loading contacts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query) ||
      contact.designation?.toLowerCase().includes(query)
    );
  });

  const isSelected = (contactId: string) => {
    return selectedContacts.some(c => c.id === contactId);
  };

  const handleContactSelect = (contact: ClientContact) => {
    if (isSelected(contact.id)) {
      if (onDeselectContact) {
        onDeselectContact(contact.id);
      }
    } else {
      onSelectContact(contact);
      if (!allowMultiple) {
        setIsOpen(false);
      }
    }
  };

  const handleContactCreated = (newContact: ClientContact) => {
    setContacts(prev => [newContact, ...prev]);
    setShowCreateDrawer(false);
    onSelectContact(newContact);
    toast({
      title: 'Contact Created',
      description: `${newContact.name} has been added and selected`,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderContact = (contact: ClientContact) => {
    const selected = isSelected(contact.id);
    
    return (
      <Card 
        key={contact.id}
        className={cn(
          'cursor-pointer transition-all hover:shadow-sm',
          selected && 'ring-2 ring-primary bg-primary/5'
        )}
        onClick={() => handleContactSelect(contact)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-muted">
                {getInitials(contact.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium truncate">{contact.name}</h4>
                {contact.isPrimary && (
                  <Badge variant="outline" className="text-xs">
                    Primary
                  </Badge>
                )}
              </div>
              
              {contact.designation && (
                <p className="text-sm text-muted-foreground mb-2">
                  {contact.designation}
                </p>
              )}
              
              <div className="space-y-1">
                {contact.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{contact.phone}</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1 mt-2">
                {contact.roles.map(role => (
                  <Badge 
                    key={role}
                    variant="secondary" 
                    className={cn(
                      'text-xs',
                      clientContactsService.getRoleColor(role)
                    )}
                  >
                    {clientContactsService.getRoleDisplayName(role)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Select Contacts
            </Button>
          )}
        </SheetTrigger>
        
        <SheetContent side="right" className="w-[400px] sm:w-[500px]">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 mt-6">
            {/* Search and Add */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setShowCreateDrawer(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Selected Count */}
            {selectedContacts.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedContacts.length} selected
              </div>
            )}

            <Separator />

            {/* Contacts List */}
            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading contacts...
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No contacts found' : 'No contacts available'}
                </div>
              ) : (
                filteredContacts.map(renderContact)
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Contact Drawer */}
      <CreateContactDrawer
        isOpen={showCreateDrawer}
        onClose={() => setShowCreateDrawer(false)}
        clientId={clientId}
        onSuccess={handleContactCreated}
        defaultRoles={roleFilter}
      />
    </>
  );
};