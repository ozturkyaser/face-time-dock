import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Check, X, DollarSign } from "lucide-react";
import { toast } from "sonner";

const SalaryAdvances = () => {
  const [advances, setAdvances] = useState<any[]>([]);

  useEffect(() => {
    loadAdvances();
  }, []);

  const loadAdvances = async () => {
    const { data, error } = await supabase
      .from("salary_advances")
      .select(`
        *,
        employees (
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
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Gehaltsvorschüsse</CardTitle>
        <CardDescription>
          Vorschussanträge genehmigen und verwalten
        </CardDescription>
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
  );
};

export default SalaryAdvances;
