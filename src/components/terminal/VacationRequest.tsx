import { useState, useRef, useEffect } from "react";
import { Calendar, Camera, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

interface VacationRequestProps {
  onComplete: () => void;
  onCancel: () => void;
}

const VacationRequest = ({ onComplete, onCancel }: VacationRequestProps) => {
  const [step, setStep] = useState<"auth" | "form">("auth");
  const [employee, setEmployee] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    request_type: "vacation",
    notes: ""
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadEmployees();
    if (step === "auth") {
      startCamera();
    }
    return () => stopCamera();
  }, [step]);

  const loadEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("*, face_profiles(*)")
      .eq("is_active", true);
    setEmployees(data || []);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (error) {
      console.error("Kamera-Fehler:", error);
      toast.error("Kamerazugriff fehlgeschlagen");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const recognizeFace = async () => {
    setIsProcessing(true);
    
    // Für Demo: Zufälligen Mitarbeiter mit Gesichtsprofil auswählen
    const employeesWithFace = employees.filter(e => e.face_profiles);
    
    if (employeesWithFace.length === 0) {
      toast.error("Keine registrierten Mitarbeiter gefunden");
      setIsProcessing(false);
      return;
    }

    // Simulation der Gesichtserkennung
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const recognizedEmployee = employeesWithFace[Math.floor(Math.random() * employeesWithFace.length)];
    
    setEmployee(recognizedEmployee);
    stopCamera();
    setStep("form");
    setIsProcessing(false);
    
    toast.success(`Willkommen ${recognizedEmployee.first_name} ${recognizedEmployee.last_name}!`);
  };

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const days = differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1;
    return days > 0 ? days : 0;
  };

  const handleSubmit = async () => {
    if (!employee || !formData.start_date || !formData.end_date) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }

    const totalDays = calculateDays();
    if (totalDays <= 0) {
      toast.error("Enddatum muss nach Startdatum liegen");
      return;
    }

    setIsProcessing(true);

    const { error } = await supabase
      .from("vacation_requests")
      .insert({
        employee_id: employee.id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        total_days: totalDays,
        request_type: formData.request_type,
        notes: formData.notes,
        status: "pending"
      });

    setIsProcessing(false);

    if (error) {
      console.error("Fehler beim Speichern:", error);
      toast.error("Fehler beim Erstellen des Urlaubsantrags");
      return;
    }

    toast.success(
      "Urlaubsantrag erfolgreich eingereicht!",
      {
        icon: <CheckCircle className="h-5 w-5 text-success" />,
        description: `${totalDays} Tage vom ${new Date(formData.start_date).toLocaleDateString("de-DE")} bis ${new Date(formData.end_date).toLocaleDateString("de-DE")}`
      }
    );

    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Calendar className="h-6 w-6 text-primary" />
            Urlaubsantrag
          </CardTitle>
          <CardDescription>
            {step === "auth" 
              ? "Schauen Sie in die Kamera für die Authentifizierung" 
              : "Geben Sie die Urlaubsdaten ein"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === "auth" ? (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg overflow-hidden aspect-video relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 border-4 border-primary/30 rounded-lg pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-4 border-primary/60 rounded-full" />
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onCancel}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button
                  size="lg"
                  onClick={recognizeFace}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                >
                  {isProcessing ? (
                    "Erkenne Gesicht..."
                  ) : (
                    <>
                      <Camera className="mr-2 h-5 w-5" />
                      Gesicht scannen
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {employee && (
                <Card className="bg-primary/10 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Antrag von:</p>
                      <p className="text-2xl font-bold">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-muted-foreground">
                        {employee.employee_number} • {employee.department || "Keine Abteilung"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
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
                      <SelectItem value="sick_leave">Krankheit</SelectItem>
                      <SelectItem value="personal">Persönlich</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Von (Datum) *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">Bis (Datum) *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                {formData.start_date && formData.end_date && (
                  <Card className="bg-accent/10 border-accent/20">
                    <CardContent className="pt-6">
                      <p className="text-center text-lg">
                        <span className="font-semibold text-2xl text-accent">
                          {calculateDays()}
                        </span>
                        {" "}Tage beantragt
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Notizen (optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Zusätzliche Informationen..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onCancel}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-success to-success/80"
                >
                  {isProcessing ? "Wird eingereicht..." : "Antrag einreichen"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VacationRequest;
