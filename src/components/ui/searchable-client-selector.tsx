import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Client {
  id: string;
  name: string;
  display_name?: string;
  email?: string;
  phone?: string;
  gstin?: string;
}

interface SearchableClientSelectorProps {
  clients: Client[];
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  showAddNew?: boolean;
  onAddNew?: () => void;
}

export const SearchableClientSelector: React.FC<SearchableClientSelectorProps> = ({
  clients,
  value,
  onValueChange,
  disabled = false,
  showAddNew = false,
  onAddNew
}) => {
  const [open, setOpen] = React.useState(false)

  const selectedClient = clients.find(client => client.id === value)
  const displayValue = selectedClient ? (selectedClient.name || selectedClient.display_name) : "Select client..."

  return (
    <div className="space-y-2">
      {showAddNew && (
        <Label>
          Client <span className="text-destructive">*</span>
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">{displayValue}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 z-[200]" align="start">
          <Command>
            <CommandInput placeholder="Search by name, email, phone, or GSTIN..." />
            <CommandList>
              <CommandEmpty>No client found.</CommandEmpty>
              <CommandGroup>
                {clients.map((client) => {
                  const subtitle = [client.email, client.phone].filter(Boolean).join(' • ') || client.gstin || 'No contact info';
                  const searchValue = `${client.name || client.display_name} ${client.email || ''} ${client.phone || ''} ${client.gstin || ''}`;
                  
                  return (
                    <CommandItem
                      key={client.id}
                      value={searchValue}
                      onSelect={() => {
                        onValueChange(client.id)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === client.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{client.name || client.display_name}</span>
                        <span className="text-xs text-muted-foreground">{subtitle}</span>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          {showAddNew && onAddNew && (
            <div className="border-t p-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  onAddNew()
                  setOpen(false)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Client
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
