import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import { Check, X, DollarSign, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

const SalaryAdvances = () => {
  const [advances, setAdvances] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    amount: "",
    notes: ""
  });
  const [monthlyStats, setMonthlyStats] = useState({
    pending: 0,
    approved: 0
  });

  useEffect(() => {
    loadAdvances();
    loadEmployees();
  }, []);

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

  const loadAdvances = async () => {
    const { data, error } = await supabase
      .from("salary_advances")
      .select(`
        *,
        employees!salary_advances_employee_id_fkey (
          employee_number,
          first_name,
          last_name
        )
      `)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error loading advances:", error);
      return;
    }
    setAdvances(data || []);
    calculateMonthlyStats(data || []);
  };

  const calculateMonthlyStats = (advancesData: any[]) => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const thisMonthAdvances = advancesData.filter(a => {
      const date = new Date(a.request_date);
      return date >= monthStart && date <= monthEnd;
    });

    const pending = thisMonthAdvances
      .filter(a => a.status === "pending")
      .reduce((sum, a) => sum + Number(a.amount), 0);

    const approved = thisMonthAdvances
      .filter(a => a.status === "approved")
      .reduce((sum, a) => sum + Number(a.amount), 0);

    setMonthlyStats({ pending, approved });
  };

  const handleAddAdvance = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employee_id || !formData.amount) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }

    const { error } = await supabase
      .from("salary_advances")
      .insert({
        employee_id: formData.employee_id,
        amount: Number(formData.amount),
        notes: formData.notes || null
      });

    if (error) {
      console.error("Error adding advance:", error);
      toast.error("Fehler beim Hinzufügen");
      return;
    }

    toast.success("Vorschuss hinzugefügt");
    setIsDialogOpen(false);
    setFormData({ employee_id: "", amount: "", notes: "" });
    loadAdvances();
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from("salary_advances")
      .update({
        status: "approved",
        approved_at: new Date().toISOString()
      })
      .eq("id", id);
    
    if (error) {
      toast.error("Fehler beim Genehmigen");
      return;
    }
    
    toast.success("Vorschuss genehmigt");
    loadAdvances();
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from("salary_advances")
      .update({
        status: "rejected"
      })
      .eq("id", id);
    
    if (error) {
      toast.error("Fehler beim Ablehnen");
      return;
    }
    
    toast.success("Vorschuss abgelehnt");
    loadAdvances();
  };

  const handleMarkPaid = async (id: string) => {
    const { error } = await supabase
      .from("salary_advances")
      .update({
        status: "paid",
        paid_at: new Date().toISOString()
      })
      .eq("id", id);
    
    if (error) {
      toast.error("Fehler beim Markieren");
      return;
    }
    
    toast.success("Als bezahlt markiert");
    loadAdvances();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success/10 text-success border-success/20">Genehmigt</Badge>;
      case "rejected":
        return <Badge variant="destructive">Abgelehnt</Badge>;
      case "paid":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Bezahlt</Badge>;
      default:
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Ausstehend</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monat Ausstehend</CardTitle>
            <TrendingUp className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">
              +{new Intl.NumberFormat("de-DE", {
                style: "currency",
                currency: "EUR"
              }).format(monthlyStats.pending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Zu genehmigende Vorschüsse
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monat Offen</CardTitle>
            <TrendingDown className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              -{new Intl.NumberFormat("de-DE", {
                style: "currency",
                currency: "EUR"
              }).format(monthlyStats.approved)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Genehmigt, noch nicht bezahlt
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Offen</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Intl.NumberFormat("de-DE", {
                style: "currency",
                currency: "EUR"
              }).format(monthlyStats.pending + monthlyStats.approved)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gesamtbetrag diesen Monat
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gehaltsvorschüsse</CardTitle>
              <CardDescription>
                Vorschussanträge genehmigen und verwalten
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Vorschuss hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neuer Vorschuss</DialogTitle>
                  <DialogDescription>
                    Einen neuen Gehaltsvorschuss für einen Mitarbeiter hinzufügen
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddAdvance} className="space-y-4">
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
                    <Label htmlFor="amount">Betrag (€) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="500.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notizen</Label>
                    <Textarea
                      id="notes"
                      placeholder="Optional: Zusätzliche Informationen..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button type="submit">
                      Hinzufügen
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
              <TableHead>Mitarbeiter</TableHead>
              <TableHead>Betrag</TableHead>
              <TableHead>Antragsdatum</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notizen</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {advances.map((advance) => (
              <TableRow key={advance.id}>
                <TableCell className="font-medium">
                  {advance.employees ? (
                    <>
                      {advance.employees.first_name} {advance.employees.last_name}
                      <div className="text-sm text-muted-foreground">
                        {advance.employees.employee_number}
                      </div>
                    </>
                  ) : (
                    "Unbekannt"
                  )}
                </TableCell>
                <TableCell className="font-semibold text-lg">
                  {new Intl.NumberFormat("de-DE", {
                    style: "currency",
                    currency: "EUR"
                  }).format(advance.amount)}
                </TableCell>
                <TableCell>
                  {format(new Date(advance.request_date), "dd.MM.yyyy", { locale: de })}
                </TableCell>
                <TableCell>{getStatusBadge(advance.status)}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {advance.notes || "-"}
                </TableCell>
                <TableCell className="text-right">
                  {advance.status === "pending" && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 bg-success/10 hover:bg-success/20 text-success border-success/20"
                        onClick={() => handleApprove(advance.id)}
                      >
                        <Check className="h-4 w-4" />
                        Genehmigen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => handleReject(advance.id)}
                      >
                        <X className="h-4 w-4" />
                        Ablehnen
                      </Button>
                    </div>
                  )}
                  {advance.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                      onClick={() => handleMarkPaid(advance.id)}
                    >
                      <DollarSign className="h-4 w-4" />
                      Als bezahlt markieren
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </div>
  );
};

export default SalaryAdvances;
