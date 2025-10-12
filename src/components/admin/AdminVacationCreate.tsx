import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Calendar, FileText } from "lucide-react";
import { differenceInDays } from "date-fns";
import SignatureCanvasComponent from "@/components/shared/SignatureCanvas";
import { generateVacationPDF } from "@/utils/pdfGenerator";

interface AdminVacationCreateProps {
  onSuccess: () => void;
}

const AdminVacationCreate = ({ onSuccess }: AdminVacationCreateProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    employee_id: "",
    start_date: "",
    end_date: "",
    request_type: "vacation",
    notes: ""
  });
  const [adminSignature, setAdminSignature] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen]);

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, employee_number, first_name, last_name")
      .eq("is_active", true)
      .order("employee_number");
    
    if (error) {
      console.error("Error loading employees:", error);
      return;
    }
    setEmployees(data || []);
  };

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const days = differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1;
    return days > 0 ? days : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employee_id || !formData.start_date || !formData.end_date) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }

    if (!adminSignature) {
      toast.error("Bitte Admin-Unterschrift leisten");
      return;
    }

    const totalDays = calculateDays();
    if (totalDays <= 0) {
      toast.error("Das Enddatum muss nach dem Startdatum liegen");
      return;
    }

    setIsLoading(true);

    try {
      // Get employee details for PDF
      const { data: employeeData } = await supabase
        .from("employees")
        .select("employee_number, first_name, last_name")
        .eq("id", formData.employee_id)
        .single();

      if (!employeeData) {
        toast.error("Mitarbeiter nicht gefunden");
        setIsLoading(false);
        return;
      }

      // Create vacation request with admin signature and approved status
      const { data: vacationData, error: vacationError } = await supabase
        .from("vacation_requests")
        .insert({
          employee_id: formData.employee_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          total_days: totalDays,
          request_type: formData.request_type,
          notes: formData.notes || null,
          admin_signature: adminSignature,
          status: "approved",
          approved_at: new Date().toISOString()
        })
        .select()
        .single();

      if (vacationError || !vacationData) {
        console.error("Error creating vacation:", vacationError);
        toast.error("Fehler beim Erstellen des Urlaubsantrags");
        setIsLoading(false);
        return;
      }

      // Generate PDF
      const pdfBlob = await generateVacationPDF({
        employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
        employeeNumber: employeeData.employee_number,
        requestType: formData.request_type,
        startDate: formData.start_date,
        endDate: formData.end_date,
        totalDays: totalDays,
        notes: formData.notes,
        adminSignature: adminSignature,
        approvedAt: vacationData.approved_at
      });

      // Upload PDF to storage
      const fileName = `vacation_${vacationData.id}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("vacation-pdfs")
        .upload(fileName, pdfBlob, {
          contentType: "application/pdf"
        });

      if (uploadError) {
        console.error("Error uploading PDF:", uploadError);
        toast.error("Fehler beim Speichern des PDFs");
      } else {
        // Update vacation request with PDF URL
        const { data: { publicUrl } } = supabase.storage
          .from("vacation-pdfs")
          .getPublicUrl(fileName);

        await supabase
          .from("vacation_requests")
          .update({ pdf_url: publicUrl })
          .eq("id", vacationData.id);
      }

      toast.success("Urlaubsantrag erfolgreich erstellt und genehmigt");
      setFormData({ employee_id: "", start_date: "", end_date: "", request_type: "vacation", notes: "" });
      setAdminSignature("");
      setIsOpen(false);
      setIsLoading(false);
      onSuccess();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Fehler beim Erstellen");
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Urlaub für Mitarbeiter eintragen
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Urlaub für Mitarbeiter eintragen
            </DialogTitle>
            <DialogDescription>
              Tragen Sie einen Urlaub für einen Mitarbeiter ein. Dieser wird automatisch genehmigt.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Mitarbeiter *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.employee_number} - {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request_type">Art des Antrags *</Label>
              <Select
                value={formData.request_type}
                onValueChange={(value) => setFormData({ ...formData, request_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Urlaub</SelectItem>
                  <SelectItem value="sick">Krankmeldung</SelectItem>
                  <SelectItem value="unpaid">Unbezahlter Urlaub</SelectItem>
                  <SelectItem value="other">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Von *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Bis *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                  min={formData.start_date}
                />
              </div>
            </div>

            {formData.start_date && formData.end_date && (
              <div className="text-sm text-muted-foreground">
                Anzahl der Tage: <span className="font-semibold text-foreground">{calculateDays()}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notizen (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Zusätzliche Informationen..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <SignatureCanvasComponent
              onSave={setAdminSignature}
              label="Administrator-Unterschrift *"
            />

            {adminSignature && (
              <div className="p-3 bg-muted rounded-lg">
                <Label className="text-xs">Gespeicherte Unterschrift:</Label>
                <img src={adminSignature} alt="Admin Signature" className="h-16 border mt-2" />
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isLoading} className="gap-2">
                <FileText className="h-4 w-4" />
                {isLoading ? "Wird erstellt..." : "Eintragen & PDF erstellen"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminVacationCreate;
