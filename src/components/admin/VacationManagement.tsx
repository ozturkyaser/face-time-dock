import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

interface VacationManagementProps {
  onUpdate?: () => void;
}

const VacationManagement = ({ onUpdate }: VacationManagementProps) => {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const { data, error } = await supabase
      .from("vacation_requests")
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
      console.error("Error loading vacation requests:", error);
      return;
    }
    setRequests(data || []);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from("vacation_requests")
      .update({
        status: "approved",
        approved_at: new Date().toISOString()
      })
      .eq("id", id);
    
    if (error) {
      toast.error("Fehler beim Genehmigen");
      return;
    }
    
    toast.success("Urlaubsantrag genehmigt");
    loadRequests();
    onUpdate?.();
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from("vacation_requests")
      .update({
        status: "rejected"
      })
      .eq("id", id);
    
    if (error) {
      toast.error("Fehler beim Ablehnen");
      return;
    }
    
    toast.success("Urlaubsantrag abgelehnt");
    loadRequests();
    onUpdate?.();
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

  const getRequestTypeBadge = (type: string) => {
    switch (type) {
      case "vacation":
        return <Badge variant="outline">Urlaub</Badge>;
      case "sick_leave":
        return <Badge variant="outline">Krankheit</Badge>;
      case "personal":
        return <Badge variant="outline">Persönlich</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Urlaubsverwaltung</CardTitle>
        <CardDescription>
          Urlaubsanträge genehmigen und verwalten
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mitarbeiter</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Von</TableHead>
              <TableHead>Bis</TableHead>
              <TableHead>Tage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">
                  {request.employees ? (
                    <>
                      {request.employees.first_name} {request.employees.last_name}
                      <div className="text-sm text-muted-foreground">
                        {request.employees.employee_number}
                      </div>
                    </>
                  ) : (
                    "Unbekannt"
                  )}
                </TableCell>
                <TableCell>{getRequestTypeBadge(request.request_type)}</TableCell>
                <TableCell>
                  {format(new Date(request.start_date), "dd.MM.yyyy", { locale: de })}
                </TableCell>
                <TableCell>
                  {format(new Date(request.end_date), "dd.MM.yyyy", { locale: de })}
                </TableCell>
                <TableCell>{request.total_days}</TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                <TableCell className="text-right">
                  {request.status === "pending" && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 bg-success/10 hover:bg-success/20 text-success border-success/20"
                        onClick={() => handleApprove(request.id)}
                      >
                        <Check className="h-4 w-4" />
                        Genehmigen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => handleReject(request.id)}
                      >
                        <X className="h-4 w-4" />
                        Ablehnen
                      </Button>
                    </div>
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

export default VacationManagement;
