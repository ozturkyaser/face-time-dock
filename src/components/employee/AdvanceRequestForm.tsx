import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Plus } from "lucide-react";

interface AdvanceRequestFormProps {
  employeeId: string;
  onSuccess: () => void;
}

const AdvanceRequestForm = ({ employeeId, onSuccess }: AdvanceRequestFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    notes: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Bitte einen gültigen Betrag eingeben");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase
      .from("salary_advances")
      .insert({
        employee_id: employeeId,
        amount: parseFloat(formData.amount),
        notes: formData.notes || null
      });

    if (error) {
      console.error("Error creating advance request:", error);
      toast.error("Fehler beim Erstellen des Antrags");
      setIsLoading(false);
      return;
    }

    toast.success("Vorschussantrag erfolgreich eingereicht");
    setFormData({ amount: "", notes: "" });
    setIsOpen(false);
    setIsLoading(false);
    onSuccess();
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} variant="outline" className="gap-2">
        <Plus className="h-4 w-4" />
        Vorschuss beantragen
      </Button>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Gehaltsvorschuss beantragen</CardTitle>
            <CardDescription>Beantragen Sie einen Vorschuss auf Ihr Gehalt</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Betrag (€) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="500.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Begründung (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Grund für den Vorschussantrag..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

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

export default AdvanceRequestForm;
