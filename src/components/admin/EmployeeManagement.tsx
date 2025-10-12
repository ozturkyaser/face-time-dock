import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import FaceReRegistration from "./FaceReRegistration";

interface EmployeeManagementProps {
  onUpdate?: () => void;
}

const EmployeeManagement = ({ onUpdate }: EmployeeManagementProps) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [formData, setFormData] = useState({
    employee_number: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    hourly_rate: "",
    salary: ""
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*, face_profiles(*)")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error loading employees:", error);
      return;
    }
    setEmployees(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const employeeData = {
      ...formData,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      salary: formData.salary ? parseFloat(formData.salary) : null
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
      toast.success("Mitarbeiter aktualisiert");
    } else {
      const { error } = await supabase
        .from("employees")
        .insert(employeeData);
      
      if (error) {
        toast.error("Fehler beim Erstellen");
        return;
      }
      toast.success("Mitarbeiter erstellt");
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
      hourly_rate: "",
      salary: ""
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
      hourly_rate: employee.hourly_rate?.toString() || "",
      salary: employee.salary?.toString() || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Mitarbeiter wirklich löschen?")) return;
    
    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Fehler beim Löschen");
      return;
    }
    
    toast.success("Mitarbeiter gelöscht");
    loadEmployees();
    onUpdate?.();
  };

  const handleFaceRegistration = (employee: any) => {
    setSelectedEmployee(employee);
    setShowFaceRegistration(true);
  };

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
                  Geben Sie die Mitarbeiterdaten ein
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee_number">Personalnummer *</Label>
                    <Input
                      id="employee_number"
                      value={formData.employee_number}
                      onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
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
                    <Label htmlFor="last_name">Nachname *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Abteilung</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="salary">Gehalt (€)</Label>
                    <Input
                      id="salary"
                      type="number"
                      step="0.01"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    />
                  </div>
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
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personal-Nr.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Abteilung</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Gesichtsprofil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">{employee.employee_number}</TableCell>
                <TableCell>{employee.first_name} {employee.last_name}</TableCell>
                <TableCell>{employee.email}</TableCell>
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
                      onClick={() => handleDelete(employee.id)}
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
