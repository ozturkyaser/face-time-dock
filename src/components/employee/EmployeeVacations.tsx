import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar } from "lucide-react";

interface EmployeeVacationsProps {
  employeeId: string;
}

const EmployeeVacations = ({ employeeId }: EmployeeVacationsProps) => {
  const [vacations, setVacations] = useState<any[]>([]);

  useEffect(() => {
    loadVacations();
  }, [employeeId]);

  const loadVacations = async () => {
    const { data, error } = await supabase
      .from("vacation_requests")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error loading vacations:", error);
      return;
    }
    setVacations(data || []);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success/10 text-success border-success/20">Genehmigt</Badge>;
      case "rejected":
        return <Badge variant="destructive">Abgelehnt</Badge>;
      default:
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Ausstehend</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "vacation":
        return <Badge variant="outline">Urlaub</Badge>;
      case "sick":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Krank</Badge>;
      case "unpaid":
        return <Badge variant="outline" className="bg-muted">Unbezahlt</Badge>;
      default:
        return <Badge variant="outline">Sonstiges</Badge>;
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Meine Urlaubsanträge</CardTitle>
            <CardDescription>Übersicht Ihrer Urlaubsanträge und deren Status</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Typ</TableHead>
              <TableHead>Von</TableHead>
              <TableHead>Bis</TableHead>
              <TableHead>Tage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notizen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vacations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Keine Urlaubsanträge vorhanden
                </TableCell>
              </TableRow>
            ) : (
              vacations.map((vacation) => (
                <TableRow key={vacation.id}>
                  <TableCell>{getTypeBadge(vacation.request_type)}</TableCell>
                  <TableCell>
                    {format(new Date(vacation.start_date), "dd.MM.yyyy", { locale: de })}
                  </TableCell>
                  <TableCell>
                    {format(new Date(vacation.end_date), "dd.MM.yyyy", { locale: de })}
                  </TableCell>
                  <TableCell className="font-medium">{vacation.total_days}</TableCell>
                  <TableCell>{getStatusBadge(vacation.status)}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {vacation.notes || "-"}
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

export default EmployeeVacations;
