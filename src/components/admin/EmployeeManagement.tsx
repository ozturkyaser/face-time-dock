import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Camera, Eye, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import FaceReRegistration from "./FaceReRegistration";
import EmployeeDetailView from "./EmployeeDetailView";

interface EmployeeManagementProps {
  onUpdate?: () => void;
}

const EmployeeManagement = ({ onUpdate }: EmployeeManagementProps) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    employee_number: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    location_id: "",
    hourly_rate: "",
    pin: "",
    barcode: "",
    default_break_minutes: "45",
    expected_daily_hours: "8.00"
  });

  useEffect(() => {
    loadEmployees();
    loadLocations();
  }, []);

  useEffect(() => {
    // Filter employees based on search term
    if (searchTerm.trim() === "") {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(emp => 
        emp.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*, face_profiles(*), locations(name)")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error loading employees:", error);
      return;
    }
    setEmployees(data || []);
    setFilteredEmployees(data || []);
  };

  const loadLocations = async () => {
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .order("name");
    
    if (error) {
      console.error("Error loading locations:", error);
      return;
    }
    setLocations(data || []);
  };

  const generateUniqueCode = () => {
    // Generate a unique code: timestamp + random string
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 7);
    return `EMP-${timestamp}-${randomStr}`.toUpperCase();
  };

  const generateEmployeeNumber = () => {
    // Generate employee number: EMP + timestamp
    const timestamp = Date.now().toString().slice(-8);
    return `EMP${timestamp}`;
  };

  const generateRandomPIN = () => {
    // Generate a random 4-digit PIN
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-generate employee number for new employees if not provided
    const employeeNumberValue = editingEmployee 
      ? formData.employee_number
      : (formData.employee_number || generateEmployeeNumber());
    
    // Auto-generate QR code for new employees if not provided
    const barcodeValue = editingEmployee 
      ? (formData.barcode || null)
      : (formData.barcode || generateUniqueCode());
    
    // Auto-generate PIN for new employees if not provided
    const pinValue = editingEmployee 
      ? formData.pin
      : (formData.pin || generateRandomPIN());
    
    const employeeData: any = {
      employee_number: employeeNumberValue,
      first_name: formData.first_name,
      last_name: formData.last_name || null,
      email: formData.email || null,
      phone: formData.phone || null,
      department: formData.department || null,
      position: formData.position || null,
      location_id: formData.location_id || null,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      barcode: barcodeValue,
      default_break_minutes: formData.default_break_minutes ? parseInt(formData.default_break_minutes) : 45,
      expected_daily_hours: formData.expected_daily_hours ? parseFloat(formData.expected_daily_hours) : 8.00
    };

    if (editingEmployee) {
      const { error } = await supabase
        .from("employees")
        .update(employeeData)
        .eq("id", editingEmployee.id);
      
      if (error) {
        toast.error("Fehler beim Aktualisieren");
        return;
      }

      // Update PIN separately if provided
      if (formData.pin || pinValue) {
        const { error: pinError } = await supabase.functions.invoke('set-employee-pin', {
          body: { 
            employeeId: editingEmployee.id,
            pin: formData.pin || pinValue
          }
        });

        if (pinError) {
          toast.error("Fehler beim Setzen der PIN");
          return;
        }
      }
      toast.success("Mitarbeiter aktualisiert");
    } else {
      const { data: newEmployee, error } = await supabase
        .from("employees")
        .insert(employeeData)
        .select()
        .single();
      
      if (error) {
        toast.error("Fehler beim Erstellen");
        return;
      }

      // Set PIN separately if provided or use auto-generated
      const pinToUse = formData.pin || pinValue;
      if (pinToUse && newEmployee) {
        const { error: pinError } = await supabase.functions.invoke('set-employee-pin', {
          body: { 
            employeeId: newEmployee.id,
            pin: pinToUse
          }
        });

        if (pinError) {
          toast.error("Fehler beim Setzen der PIN");
          return;
        }
        
        // Show the generated PIN to the admin
        if (!formData.pin) {
          toast.success(`Mitarbeiter erstellt. Nr: ${employeeNumberValue}, PIN: ${pinValue}`);
        } else {
          toast.success("Mitarbeiter erstellt");
        }
      } else {
        toast.success("Mitarbeiter erstellt");
      }
    }

    setIsDialogOpen(false);
    setEditingEmployee(null);
    setFormData({
      employee_number: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      department: "",
      position: "",
      location_id: "",
      hourly_rate: "",
      pin: "",
      barcode: "",
      default_break_minutes: "45",
      expected_daily_hours: "8.00"
    });
    loadEmployees();
    onUpdate?.();
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    setFormData({
      employee_number: employee.employee_number,
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone || "",
      department: employee.department || "",
      position: employee.position || "",
      location_id: employee.location_id || "",
      hourly_rate: employee.hourly_rate?.toString() || "",
      pin: "",
      barcode: employee.barcode || "",
      default_break_minutes: employee.default_break_minutes?.toString() || "45",
      expected_daily_hours: employee.expected_daily_hours?.toString() || "8.00"
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, employee: any) => {
    const confirmation = window.confirm(
      `⚠️ WARNUNG: Mitarbeiter "${employee.first_name} ${employee.last_name}" löschen?\n\n` +
      `Dies löscht ALLE zugehörigen Daten:\n` +
      `- Gesichtsprofil\n` +
      `- Zeiterfassungen\n` +
      `- Urlaubsanträge\n` +
      `- Gehaltsvorschüsse\n\n` +
      `Diese Aktion kann NICHT rückgängig gemacht werden!`
    );
    
    if (!confirmation) return;
    
    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error("Delete error:", error);
      toast.error("Fehler beim Löschen des Mitarbeiters");
      return;
    }
    
    toast.success(`Mitarbeiter "${employee.first_name} ${employee.last_name}" und alle zugehörigen Daten wurden gelöscht`);
    loadEmployees();
    onUpdate?.();
  };

  const handleFaceRegistration = (employee: any) => {
    setSelectedEmployee(employee);
    setShowFaceRegistration(true);
  };

  const handleViewDetails = (employee: any) => {
    setSelectedEmployee(employee);
    setShowEmployeeDetails(true);
  };

  const handleGenerateAllQRCodes = async () => {
    const employeesWithoutCode = employees.filter(emp => !emp.barcode);
    
    if (employeesWithoutCode.length === 0) {
      toast.info("Alle Mitarbeiter haben bereits QR-Codes");
      return;
    }

    toast.info(`Generiere QR-Codes für ${employeesWithoutCode.length} Mitarbeiter...`);

    let successCount = 0;
    for (const employee of employeesWithoutCode) {
      const newCode = generateUniqueCode();
      const { error } = await supabase
        .from("employees")
        .update({ barcode: newCode })
        .eq("id", employee.id);

      if (!error) {
        successCount++;
      }
    }

    toast.success(`${successCount} QR-Codes erfolgreich generiert`);
    loadEmployees();
    onUpdate?.();
  };

  if (showEmployeeDetails && selectedEmployee) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => {
            setShowEmployeeDetails(false);
            setSelectedEmployee(null);
          }}
        >
          Zurück zur Mitarbeiterverwaltung
        </Button>
        <EmployeeDetailView employeeId={selectedEmployee.id} employeeName={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`} />
      </div>
    );
  }

  return (
    <>
      {showFaceRegistration && selectedEmployee && (
        <FaceReRegistration
          employee={selectedEmployee}
          onComplete={() => {
            setShowFaceRegistration(false);
            setSelectedEmployee(null);
            loadEmployees();
            onUpdate?.();
          }}
          onCancel={() => {
            setShowFaceRegistration(false);
            setSelectedEmployee(null);
          }}
        />
      )}
      
      <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Mitarbeiterverwaltung</CardTitle>
            <CardDescription>
              Mitarbeiter hinzufügen, bearbeiten und verwalten
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleGenerateAllQRCodes}
            >
              <QrCode className="h-4 w-4" />
              QR-Codes generieren
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Neuer Mitarbeiter
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}
                </DialogTitle>
                <DialogDescription>
                  Geben Sie die Mitarbeiterdaten ein. Mitarbeiternummer und PIN werden automatisch generiert.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee_number">Personalnummer</Label>
                    <Input
                      id="employee_number"
                      value={formData.employee_number}
                      onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                      placeholder="Wird automatisch generiert"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="Mitarbeiter-Barcode"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Vorname *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Nachname</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Abteilung</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Standort</Label>
                  <Select value={formData.location_id} onValueChange={(value) => setFormData({ ...formData, location_id: value })}>
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
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Stundenlohn (€)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default_break_minutes">Standard-Pausenzeit (Minuten)</Label>
                    <Input
                      id="default_break_minutes"
                      type="number"
                      value={formData.default_break_minutes}
                      onChange={(e) => setFormData({ ...formData, default_break_minutes: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Automatisch abgezogen (Standard: 45 Min)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expected_daily_hours">Tägliche Soll-Arbeitszeit (Std.)</Label>
                    <Input
                      id="expected_daily_hours"
                      type="number"
                      step="0.25"
                      value={formData.expected_daily_hours}
                      onChange={(e) => setFormData({ ...formData, expected_daily_hours: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ohne Pause (Standard: 8 Std)
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin">Mitarbeiter-PIN {editingEmployee ? "(Leer lassen, um nicht zu ändern)" : "(Wird automatisch generiert)"}</Label>
                  <Input
                    id="pin"
                    type="password"
                    placeholder="4-6 stellige PIN - automatisch generiert"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    {editingEmployee 
                      ? "Diese PIN wird für den Zugang zum Mitarbeiter-Portal verwendet" 
                      : "Leer lassen für automatische Generierung einer 4-stelligen PIN"}
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button type="submit">
                    {editingEmployee ? "Aktualisieren" : "Erstellen"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Suche nach Name, Personalnummer, Email, Abteilung oder Position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personal-Nr.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Standort</TableHead>
              <TableHead>Abteilung</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Gesichtsprofil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">{employee.employee_number}</TableCell>
                <TableCell>{employee.first_name} {employee.last_name}</TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>{employee.locations?.name || "-"}</TableCell>
                <TableCell>{employee.department || "-"}</TableCell>
                <TableCell>{employee.position || "-"}</TableCell>
                <TableCell>
                  {employee.face_profiles ? (
                    <Badge variant="outline" className="gap-1">
                      <Camera className="h-3 w-3" />
                      Registriert
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Nicht registriert</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {employee.is_active ? (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      Aktiv
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inaktiv</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(employee)}
                      title="Mitarbeiterdetails anzeigen"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFaceRegistration(employee)}
                      title={employee.face_profiles ? "Gesicht neu registrieren" : "Gesicht registrieren"}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(employee)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(employee.id, employee)}
                      className="text-destructive hover:text-destructive"
                      title="Mitarbeiter und alle Daten löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </>
  );
};

export default EmployeeManagement;
