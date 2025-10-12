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
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Location {
  id: string;
  name: string;
  address: string | null;
}

export const LocationManagement = ({ onUpdate }: { onUpdate?: () => void }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [open, setOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    loadLocations();
  }, []);

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

    if (editingLocation) {
      const { error } = await supabase
        .from("locations")
        .update({ name, address })
        .eq("id", editingLocation.id);

      if (error) {
        toast.error("Fehler beim Aktualisieren des Standorts");
        return;
      }

      toast.success("Standort aktualisiert");
    } else {
      const { error } = await supabase
        .from("locations")
        .insert([{ name, address }]);

      if (error) {
        toast.error("Fehler beim Erstellen des Standorts");
        return;
      }

      toast.success("Standort erstellt");
    }

    setOpen(false);
    setName("");
    setAddress("");
    setEditingLocation(null);
    loadLocations();
    onUpdate?.();
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setName(location.name);
    setAddress(location.address || "");
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie diesen Standort wirklich löschen?")) return;

    const { error } = await supabase.from("locations").delete().eq("id", id);

    if (error) {
      toast.error("Fehler beim Löschen des Standorts");
      return;
    }

    toast.success("Standort gelöscht");
    loadLocations();
    onUpdate?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Standortverwaltung</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingLocation(null);
              setName("");
              setAddress("");
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Neuer Standort
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLocation ? "Standort bearbeiten" : "Neuer Standort"}
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
                />
              </div>
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit">
                  {editingLocation ? "Aktualisieren" : "Erstellen"}
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
              <TableHead>Adresse</TableHead>
              <TableHead className="w-[100px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((location) => (
              <TableRow key={location.id}>
                <TableCell className="font-medium">{location.name}</TableCell>
                <TableCell>{location.address || "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(location)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(location.id)}
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