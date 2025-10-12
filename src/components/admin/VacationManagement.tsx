import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { Check, X, Calendar } from "lucide-react";
import { toast } from "sonner";

interface VacationManagementProps {
  onUpdate?: () => void;
}

const VacationManagement = ({ onUpdate }: VacationManagementProps) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [isAlternativeDialogOpen, setIsAlternativeDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [alternativeData, setAlternativeData] = useState({
    start_date: "",
    end_date: "",
    notes: ""
  });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const { data, error } = await supabase
      .from("vacation_requests")
      .select(`
        *,
        employees!vacation_requests_employee_id_fkey (
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

  const handleOpenAlternative = (request: any) => {
    setSelectedRequest(request);
    setAlternativeData({
      start_date: request.start_date,
      end_date: request.end_date,
      notes: ""
    });
    setIsAlternativeDialogOpen(true);
  };

  const handleProposeAlternative = async () => {
    if (!selectedRequest || !alternativeData.start_date || !alternativeData.end_date) {
      toast.error("Bitte beide Daten auswählen");
      return;
    }

    const totalDays = differenceInDays(
      new Date(alternativeData.end_date),
      new Date(alternativeData.start_date)
    ) + 1;

    if (totalDays <= 0) {
      toast.error("Das Enddatum muss nach dem Startdatum liegen");
      return;
    }

    const { error } = await supabase
      .from("vacation_requests")
      .update({
        status: "alternative_proposed",
        alternative_start_date: alternativeData.start_date,
        alternative_end_date: alternativeData.end_date,
        alternative_total_days: totalDays,
        alternative_notes: alternativeData.notes || null
      })
      .eq("id", selectedRequest.id);

    if (error) {
      console.error("Error proposing alternative:", error);
      toast.error("Fehler beim Vorschlagen");
      return;
    }

    toast.success("Gegenvorschlag wurde gesendet");
    setIsAlternativeDialogOpen(false);
    setSelectedRequest(null);
    setAlternativeData({ start_date: "", end_date: "", notes: "" });
    loadRequests();
    onUpdate?.();
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
                        className="gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border-blue-500/20"
                        onClick={() => handleOpenAlternative(request)}
                      >
                        <Calendar className="h-4 w-4" />
                        Gegenvorschlag
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
                  {request.status === "alternative_proposed" && (
                    <Badge variant="secondary">Wartet auf Mitarbeiter</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={isAlternativeDialogOpen} onOpenChange={setIsAlternativeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alternativen Zeitraum vorschlagen</DialogTitle>
            <DialogDescription>
              Schlagen Sie einen alternativen Zeitraum für diesen Urlaubsantrag vor
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium">Ursprünglicher Antrag:</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(selectedRequest.start_date), "dd.MM.yyyy", { locale: de })} - {format(new Date(selectedRequest.end_date), "dd.MM.yyyy", { locale: de })}
                  <span className="ml-2">({selectedRequest.total_days} Tage)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alt_start">Neuer Start *</Label>
                  <Input
                    id="alt_start"
                    type="date"
                    value={alternativeData.start_date}
                    onChange={(e) => setAlternativeData({ ...alternativeData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alt_end">Neues Ende *</Label>
                  <Input
                    id="alt_end"
                    type="date"
                    value={alternativeData.end_date}
                    onChange={(e) => setAlternativeData({ ...alternativeData, end_date: e.target.value })}
                    min={alternativeData.start_date}
                  />
                </div>
              </div>

              {alternativeData.start_date && alternativeData.end_date && (
                <div className="text-sm text-muted-foreground">
                  Neue Anzahl der Tage: <span className="font-semibold text-foreground">
                    {differenceInDays(new Date(alternativeData.end_date), new Date(alternativeData.start_date)) + 1}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="alt_notes">Begründung (optional)</Label>
                <Textarea
                  id="alt_notes"
                  placeholder="Erklären Sie, warum Sie diesen alternativen Zeitraum vorschlagen..."
                  value={alternativeData.notes}
                  onChange={(e) => setAlternativeData({ ...alternativeData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAlternativeDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleProposeAlternative}>
                  Vorschlag senden
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VacationManagement;
