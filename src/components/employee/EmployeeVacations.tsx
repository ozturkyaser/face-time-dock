import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, Check, X } from "lucide-react";
import { toast } from "sonner";

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

  const handleAcceptAlternative = async (vacation: any) => {
    const { error } = await supabase
      .from("vacation_requests")
      .update({
        start_date: vacation.alternative_start_date,
        end_date: vacation.alternative_end_date,
        total_days: vacation.alternative_total_days,
        status: "approved",
        approved_at: new Date().toISOString(),
        alternative_start_date: null,
        alternative_end_date: null,
        alternative_total_days: null,
        alternative_notes: null
      })
      .eq("id", vacation.id);

    if (error) {
      console.error("Error accepting alternative:", error);
      toast.error("Fehler beim Akzeptieren");
      return;
    }

    toast.success("Gegenvorschlag akzeptiert");
    loadVacations();
  };

  const handleRejectAlternative = async (vacation: any) => {
    const { error } = await supabase
      .from("vacation_requests")
      .update({
        status: "rejected",
        alternative_start_date: null,
        alternative_end_date: null,
        alternative_total_days: null,
        alternative_notes: null
      })
      .eq("id", vacation.id);

    if (error) {
      console.error("Error rejecting alternative:", error);
      toast.error("Fehler beim Ablehnen");
      return;
    }

    toast.success("Gegenvorschlag abgelehnt");
    loadVacations();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success/10 text-success border-success/20">Genehmigt</Badge>;
      case "rejected":
        return <Badge variant="destructive">Abgelehnt</Badge>;
      case "alternative_proposed":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Gegenvorschlag</Badge>;
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
              <TableHead>Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vacations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Keine Urlaubsanträge vorhanden
                </TableCell>
              </TableRow>
            ) : (
              vacations.map((vacation) => (
                <TableRow key={vacation.id}>
                  <TableCell>{getTypeBadge(vacation.request_type)}</TableCell>
                  <TableCell>
                    {format(new Date(vacation.start_date), "dd.MM.yyyy", { locale: de })}
                    {vacation.status === "alternative_proposed" && vacation.alternative_start_date && (
                      <div className="text-xs text-blue-600 font-medium mt-1">
                        Neu: {format(new Date(vacation.alternative_start_date), "dd.MM.yyyy", { locale: de })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(vacation.end_date), "dd.MM.yyyy", { locale: de })}
                    {vacation.status === "alternative_proposed" && vacation.alternative_end_date && (
                      <div className="text-xs text-blue-600 font-medium mt-1">
                        Neu: {format(new Date(vacation.alternative_end_date), "dd.MM.yyyy", { locale: de })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {vacation.total_days}
                    {vacation.status === "alternative_proposed" && vacation.alternative_total_days && (
                      <div className="text-xs text-blue-600 font-medium mt-1">
                        Neu: {vacation.alternative_total_days}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(vacation.status)}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {vacation.notes || "-"}
                    {vacation.status === "alternative_proposed" && vacation.alternative_notes && (
                      <div className="text-xs text-blue-600 mt-1">
                        Admin: {vacation.alternative_notes}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {vacation.status === "alternative_proposed" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 bg-success/10 hover:bg-success/20 text-success border-success/20"
                          onClick={() => handleAcceptAlternative(vacation)}
                        >
                          <Check className="h-3 w-3" />
                          Akzeptieren
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => handleRejectAlternative(vacation)}
                        >
                          <X className="h-3 w-3" />
                          Ablehnen
                        </Button>
                      </div>
                    )}
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
