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
import { Check, X, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import AdminVacationCreate from "./AdminVacationCreate";
import SignatureCanvasComponent from "@/components/shared/SignatureCanvas";
import { generateVacationPDF } from "@/utils/pdfGenerator";

interface VacationManagementProps {
  onUpdate?: () => void;
}

const VacationManagement = ({ onUpdate }: VacationManagementProps) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [isAlternativeDialogOpen, setIsAlternativeDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [alternativeData, setAlternativeData] = useState({
    start_date: "",
    end_date: "",
    notes: ""
  });
  const [adminSignature, setAdminSignature] = useState("");

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
    const request = requests.find(r => r.id === id);
    if (request) {
      setSelectedRequest(request);
      setAdminSignature("");
      setIsApproveDialogOpen(true);
    }
  };

  const handleConfirmApprove = async () => {
    if (!selectedRequest || !adminSignature) {
      toast.error("Bitte Admin-Unterschrift leisten");
      return;
    }

    try {
      // Get employee details with location
      const { data: employeeData } = await supabase
        .from("employees")
        .select("employee_number, first_name, last_name, location_id, vacation_days_total, vacation_days_used")
        .eq("id", selectedRequest.employee_id)
        .single();

      if (!employeeData) {
        toast.error("Mitarbeiter nicht gefunden");
        return;
      }

      // Get location CI data if available
      let locationData = null;
      if (employeeData.location_id) {
        const { data } = await supabase
          .from("locations")
          .select("company_name, company_address, company_phone, company_email, company_website, company_logo_url")
          .eq("id", employeeData.location_id)
          .single();
        locationData = data;
      }

      // Update vacation request
      const approvedAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("vacation_requests")
        .update({
          status: "approved",
          approved_at: approvedAt,
          admin_signature: adminSignature
        })
        .eq("id", selectedRequest.id);
      
      if (updateError) {
        toast.error("Fehler beim Genehmigen");
        return;
      }

      // Update employee vacation days used
      const newVacationDaysUsed = (employeeData.vacation_days_used || 0) + selectedRequest.total_days;
      const { error: employeeUpdateError } = await supabase
        .from("employees")
        .update({
          vacation_days_used: newVacationDaysUsed
        })
        .eq("id", selectedRequest.employee_id);
      
      if (employeeUpdateError) {
        console.error("Error updating employee vacation days:", employeeUpdateError);
        toast.error("Fehler beim Aktualisieren der Urlaubstage");
        return;
      }

      // Calculate remaining vacation days
      const vacationDaysTotal = employeeData.vacation_days_total || 30;
      const vacationDaysUsed = employeeData.vacation_days_used || 0;
      const remainingVacationDays = vacationDaysTotal - vacationDaysUsed - selectedRequest.total_days;

      // Generate PDF
      const pdfBlob = await generateVacationPDF({
        employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
        employeeNumber: employeeData.employee_number,
        requestType: selectedRequest.request_type,
        startDate: selectedRequest.start_date,
        endDate: selectedRequest.end_date,
        totalDays: selectedRequest.total_days,
        notes: selectedRequest.notes,
        employeeSignature: selectedRequest.employee_signature,
        adminSignature: adminSignature,
        approvedAt: approvedAt,
        companyName: locationData?.company_name,
        companyAddress: locationData?.company_address,
        companyPhone: locationData?.company_phone,
        companyEmail: locationData?.company_email,
        companyWebsite: locationData?.company_website,
        companyLogoUrl: locationData?.company_logo_url,
        remainingVacationDays: remainingVacationDays
      });

      // Upload PDF
      const fileName = `vacation_${selectedRequest.id}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("vacation-pdfs")
        .upload(fileName, pdfBlob, {
          contentType: "application/pdf"
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from("vacation-pdfs")
          .getPublicUrl(fileName);

        await supabase
          .from("vacation_requests")
          .update({ pdf_url: publicUrl })
          .eq("id", selectedRequest.id);
      }

      toast.success("Urlaubsantrag genehmigt und PDF erstellt");
      setIsApproveDialogOpen(false);
      setSelectedRequest(null);
      setAdminSignature("");
      loadRequests();
      onUpdate?.();
    } catch (error) {
      console.error("Error approving:", error);
      toast.error("Fehler beim Genehmigen");
    }
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <AdminVacationCreate onSuccess={() => { loadRequests(); onUpdate?.(); }} />
      </div>
      
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
              <TableHead>PDF</TableHead>
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
                <TableCell>
                  {request.pdf_url ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => window.open(request.pdf_url, '_blank')}
                    >
                      <FileText className="h-3 w-3" />
                      PDF
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
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
    </Card>

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

      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Urlaubsantrag genehmigen</DialogTitle>
            <DialogDescription>
              Bitte leisten Sie Ihre Unterschrift zur Genehmigung
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium">Antrag:</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(selectedRequest.start_date), "dd.MM.yyyy", { locale: de })} - {format(new Date(selectedRequest.end_date), "dd.MM.yyyy", { locale: de })}
                  <span className="ml-2">({selectedRequest.total_days} Tage)</span>
                </div>
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

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleConfirmApprove} disabled={!adminSignature}>
                  Genehmigen & PDF erstellen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VacationManagement;
