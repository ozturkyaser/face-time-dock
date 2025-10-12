import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Plus } from "lucide-react";
import { differenceInDays } from "date-fns";
import SignatureCanvasComponent from "@/components/shared/SignatureCanvas";

interface VacationRequestFormProps {
  employeeId: string;
  onSuccess: () => void;
}

const VacationRequestForm = ({ employeeId, onSuccess }: VacationRequestFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    request_type: "vacation",
    notes: ""
  });
  const [employeeSignature, setEmployeeSignature] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const days = differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1;
    return days > 0 ? days : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.start_date || !formData.end_date) {
      toast.error("Bitte Start- und Enddatum auswählen");
      return;
    }

    if (!employeeSignature) {
      toast.error("Bitte Unterschrift leisten");
      return;
    }

    const totalDays = calculateDays();
    if (totalDays <= 0) {
      toast.error("Das Enddatum muss nach dem Startdatum liegen");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase
      .from("vacation_requests")
      .insert({
        employee_id: employeeId,
        start_date: formData.start_date,
        end_date: formData.end_date,
        total_days: totalDays,
        request_type: formData.request_type,
        notes: formData.notes || null,
        employee_signature: employeeSignature
      });

    if (error) {
      console.error("Error creating vacation request:", error);
      toast.error("Fehler beim Erstellen des Antrags");
      setIsLoading(false);
      return;
    }

    toast.success("Urlaubsantrag erfolgreich eingereicht");
    setFormData({ start_date: "", end_date: "", request_type: "vacation", notes: "" });
    setEmployeeSignature("");
    setIsOpen(false);
    setIsLoading(false);
    onSuccess();
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Neuer Urlaubsantrag
      </Button>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Urlaubsantrag stellen</CardTitle>
            <CardDescription>Beantragen Sie Urlaub, Krankmeldung oder unbezahlten Urlaub</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              onSave={setEmployeeSignature}
              label="Mitarbeiter-Unterschrift *"
            />

            {employeeSignature && (
              <div className="p-3 bg-muted rounded-lg">
                <Label className="text-xs">Gespeicherte Unterschrift:</Label>
                <img src={employeeSignature} alt="Employee Signature" className="h-16 border mt-2" />
              </div>
            )}

            <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Wird eingereicht..." : "Antrag einreichen"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default VacationRequestForm;
