import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Terminal {
  id: string;
  name: string;
  username: string;
  location_id: string;
  is_active: boolean;
  locations: {
    name: string;
  };
}

interface Location {
  id: string;
  name: string;
}

export const TerminalManagement = () => {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [open, setOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [locationId, setLocationId] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadTerminals();
    loadLocations();
  }, []);

  const loadTerminals = async () => {
    const { data, error } = await supabase
      .from("terminals")
      .select("*, locations(name)")
      .order("name");

    if (error) {
      toast.error("Fehler beim Laden der Terminals");
      return;
    }

    setTerminals(data || []);
  };

  const loadLocations = async () => {
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Fehler beim Laden der Standorte");
      return;
    }

    setLocations(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTerminal) {
      const updateData: any = {
        name,
        username,
        location_id: locationId,
        is_active: isActive,
      };

      // If password changed, use Edge Function to hash it
      if (password) {
        const { data: authData } = await supabase.auth.getSession();
        
        const { error: hashError } = await supabase.functions.invoke(
          'set-terminal-password',
          {
            body: { 
              terminalId: editingTerminal.id,
              password: password 
            },
            headers: {
              Authorization: `Bearer ${authData.session?.access_token}`
            }
          }
        );

        if (hashError) {
          console.error("Error hashing password:", hashError);
          toast.error("Fehler beim Verschlüsseln des Passworts");
          return;
        }
      }

      const { error } = await supabase
        .from("terminals")
        .update(updateData)
        .eq("id", editingTerminal.id);

      if (error) {
        toast.error("Fehler beim Aktualisieren des Terminals");
        return;
      }

      toast.success("Terminal aktualisiert");
    } else {
      if (!password) {
        toast.error("Passwort ist erforderlich");
        return;
      }

      // For new terminals, use Edge Function to hash password
      const { data: authData } = await supabase.auth.getSession();
      
      // First insert terminal with placeholder password
      const { data: newTerminal, error: insertError } = await supabase
        .from("terminals")
        .insert([{
          name,
          username,
          password_hash: 'PLACEHOLDER',
          location_id: locationId,
          is_active: isActive,
        }])
        .select()
        .single();

      if (insertError || !newTerminal) {
        toast.error("Fehler beim Erstellen des Terminals");
        return;
      }

      // Now set the real password using Edge Function
      const { error: hashError } = await supabase.functions.invoke(
        'set-terminal-password',
        {
          body: { 
            terminalId: newTerminal.id,
            password: password 
          },
          headers: {
            Authorization: `Bearer ${authData.session?.access_token}`
          }
        }
      );

      if (hashError) {
        // Clean up - delete the terminal we just created
        await supabase.from("terminals").delete().eq("id", newTerminal.id);
        console.error("Error hashing password:", hashError);
        toast.error("Fehler beim Verschlüsseln des Passworts");
        return;
      }

      toast.success("Terminal erstellt");
    }

    setOpen(false);
    resetForm();
    loadTerminals();
  };

  const resetForm = () => {
    setName("");
    setUsername("");
    setPassword("");
    setLocationId("");
    setIsActive(true);
    setEditingTerminal(null);
  };

  const handleEdit = (terminal: Terminal) => {
    setEditingTerminal(terminal);
    setName(terminal.name);
    setUsername(terminal.username);
    setPassword("");
    setLocationId(terminal.location_id);
    setIsActive(terminal.is_active);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie dieses Terminal wirklich löschen?")) return;

    const { error } = await supabase.from("terminals").delete().eq("id", id);

    if (error) {
      toast.error("Fehler beim Löschen des Terminals");
      return;
    }

    toast.success("Terminal gelöscht");
    loadTerminals();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Terminalverwaltung</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Neues Terminal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTerminal ? "Terminal bearbeiten" : "Neues Terminal"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name*</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="z.B. Terminal Haupteingang"
                />
              </div>
              <div>
                <Label htmlFor="location">Standort*</Label>
                <Select value={locationId} onValueChange={setLocationId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Standort wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="username">Benutzername*</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">
                  Passwort{editingTerminal ? "" : "*"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editingTerminal}
                  placeholder={editingTerminal ? "Leer lassen um nicht zu ändern" : ""}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive">Aktiv</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit">
                  {editingTerminal ? "Aktualisieren" : "Erstellen"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Standort</TableHead>
              <TableHead>Benutzername</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terminals.map((terminal) => (
              <TableRow key={terminal.id}>
                <TableCell className="font-medium">{terminal.name}</TableCell>
                <TableCell>{terminal.locations.name}</TableCell>
                <TableCell>{terminal.username}</TableCell>
                <TableCell>
                  <span className={terminal.is_active ? "text-green-600" : "text-red-600"}>
                    {terminal.is_active ? "Aktiv" : "Inaktiv"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(terminal)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(terminal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};