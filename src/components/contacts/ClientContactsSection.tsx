/**
 * Client Contacts Section for Client Modal
 * Centralized contact management within client form
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Users, Mail, Phone } from 'lucide-react';
import { 
  clientContactsService, 
  ClientContact, 
  ContactRole 
} from '@/services/clientContactsService';
import { CreateContactDrawer } from './CreateContactDrawer';
import { toast } from '@/hooks/use-toast';

interface ClientContactsSectionProps {
  clientId: string;
  mode?: 'create' | 'edit' | 'view';
}

export const ClientContactsSection: React.FC<ClientContactsSectionProps> = ({
  clientId,
  mode = 'edit'
}) => {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);

  useEffect(() => {
    if (clientId && clientId !== 'new' && mode !== 'create') {
      fetchContacts();
    }
  }, [clientId, mode]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await clientContactsService.getContacts(clientId);
      if (response.success && response.data) {
        setContacts(response.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContactCreated = (newContact: ClientContact) => {
    setContacts(prev => [newContact, ...prev]);
    setShowCreateDrawer(false);
    toast({
      title: 'Contact Added',
      description: `${newContact.name} has been added successfully`,
    });
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const response = await clientContactsService.deleteContact(clientId, contactId);
      if (response.success) {
        setContacts(prev => prev.filter(c => c.id !== contactId));
        toast({
          title: 'Contact Deleted',
          description: 'Contact has been removed successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete contact',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Client Contacts
            {(mode === 'create' || clientId === 'new') && (
              <Badge variant="outline" className="ml-2 text-xs">
                Available after client creation
              </Badge>
            )}
          </CardTitle>
          {mode !== 'view' && clientId && clientId !== 'new' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreateDrawer(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {(mode === 'create' || clientId === 'new') ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p>Contacts can be added after creating and saving the client.</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No contacts added yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Roles</TableHead>
                {mode !== 'view' && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{contact.name}</div>
                      {contact.designation && (
                        <div className="text-sm text-muted-foreground">
                          {contact.designation}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {contact.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contact.roles.map(role => (
                        <Badge 
                          key={role}
                          variant="secondary"
                          className="text-xs"
                        >
                          {clientContactsService.getRoleDisplayName(role)}
                        </Badge>
                      ))}
                      {contact.isPrimary && (
                        <Badge variant="outline" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  {mode !== 'view' && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {clientId && clientId !== 'new' && (
          <CreateContactDrawer
            isOpen={showCreateDrawer}
            onClose={() => setShowCreateDrawer(false)}
            clientId={clientId}
            onSuccess={handleContactCreated}
          />
        )}
      </CardContent>
    </Card>
  );
};