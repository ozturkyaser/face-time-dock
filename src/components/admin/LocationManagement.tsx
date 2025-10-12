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
  company_name: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_logo_url: string | null;
  company_website: string | null;
}

export const LocationManagement = ({ onUpdate }: { onUpdate?: () => void }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [open, setOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");

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

    let logoUrl = editingLocation?.company_logo_url || null;

    // Upload logo if a new file is selected
    if (logoFile) {
      const fileName = `${Date.now()}_${logoFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, logoFile);

      if (uploadError) {
        toast.error("Fehler beim Hochladen des Logos");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);
      
      logoUrl = publicUrl;
    }

    const locationData = {
      name,
      address: address || null,
      company_name: companyName || null,
      company_address: companyAddress || null,
      company_phone: companyPhone || null,
      company_email: companyEmail || null,
      company_website: companyWebsite || null,
      company_logo_url: logoUrl
    };

    if (editingLocation) {
      const { error } = await supabase
        .from("locations")
        .update(locationData)
        .eq("id", editingLocation.id);

      if (error) {
        toast.error("Fehler beim Aktualisieren des Standorts");
        return;
      }

      toast.success("Standort aktualisiert");
    } else {
      const { error } = await supabase
        .from("locations")
        .insert([locationData]);

      if (error) {
        toast.error("Fehler beim Erstellen des Standorts");
        return;
      }

      toast.success("Standort erstellt");
    }

    setOpen(false);
    setName("");
    setAddress("");
    setCompanyName("");
    setCompanyAddress("");
    setCompanyPhone("");
    setCompanyEmail("");
    setCompanyWebsite("");
    setLogoFile(null);
    setLogoPreview("");
    setEditingLocation(null);
    loadLocations();
    onUpdate?.();
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setName(location.name);
    setAddress(location.address || "");
    setCompanyName(location.company_name || "");
    setCompanyAddress(location.company_address || "");
    setCompanyPhone(location.company_phone || "");
    setCompanyEmail(location.company_email || "");
    setCompanyWebsite(location.company_website || "");
    setLogoPreview(location.company_logo_url || "");
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
              setCompanyName("");
              setCompanyAddress("");
              setCompanyPhone("");
              setCompanyEmail("");
              setCompanyWebsite("");
              setLogoFile(null);
              setLogoPreview("");
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
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Standortname*</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Standortadresse</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-3">Firmen-CI Einstellungen für PDFs</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="company_name">Firmenname</Label>
                      <Input
                        id="company_name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="z.B. Muster GmbH"
                      />
                    </div>

                    <div>
                      <Label htmlFor="company_address">Firmenadresse</Label>
                      <Textarea
                        id="company_address"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        rows={2}
                        placeholder="Straße, PLZ Ort"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="company_phone">Telefon</Label>
                        <Input
                          id="company_phone"
                          value={companyPhone}
                          onChange={(e) => setCompanyPhone(e.target.value)}
                          placeholder="+49 123 456789"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company_email">E-Mail</Label>
                        <Input
                          id="company_email"
                          type="email"
                          value={companyEmail}
                          onChange={(e) => setCompanyEmail(e.target.value)}
                          placeholder="info@firma.de"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="company_website">Website</Label>
                      <Input
                        id="company_website"
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        placeholder="www.firma.de"
                      />
                    </div>

                    <div>
                      <Label htmlFor="company_logo">Firmenlogo</Label>
                      <Input
                        id="company_logo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLogoFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setLogoPreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {logoPreview && (
                        <div className="mt-2">
                          <img src={logoPreview} alt="Logo Preview" className="h-16 object-contain border rounded p-1" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background">
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