import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { DollarSign } from "lucide-react";

interface EmployeeAdvancesProps {
  employeeId: string;
}

const EmployeeAdvances = ({ employeeId }: EmployeeAdvancesProps) => {
  const [advances, setAdvances] = useState<any[]>([]);

  useEffect(() => {
    loadAdvances();
  }, [employeeId]);

  const loadAdvances = async () => {
    const { data, error } = await supabase
      .from("salary_advances")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error loading advances:", error);
      return;
    }
    setAdvances(data || []);
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

  const totalPending = advances
    .filter(a => a.status === "approved")
    .reduce((sum, a) => sum + Number(a.amount), 0);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Meine Gehaltsvorschüsse</CardTitle>
              <CardDescription>Übersicht Ihrer Vorschussanträge</CardDescription>
            </div>
          </div>
          {totalPending > 0 && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Offen</div>
              <div className="text-xl font-bold text-destructive">
                -{new Intl.NumberFormat("de-DE", {
                  style: "currency",
                  currency: "EUR"
                }).format(totalPending)}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Antragsdatum</TableHead>
              <TableHead>Betrag</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notizen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {advances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Keine Vorschussanträge vorhanden
                </TableCell>
              </TableRow>
            ) : (
              advances.map((advance) => (
                <TableRow key={advance.id}>
                  <TableCell>
                    {format(new Date(advance.request_date), "dd.MM.yyyy", { locale: de })}
                  </TableCell>
                  <TableCell className="font-semibold text-lg">
                    {new Intl.NumberFormat("de-DE", {
                      style: "currency",
                      currency: "EUR"
                    }).format(advance.amount)}
                  </TableCell>
                  <TableCell>{getStatusBadge(advance.status)}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {advance.notes || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default EmployeeAdvances;
