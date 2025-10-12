import { useState, useRef, useEffect } from "react";
import { Calendar, Camera, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { extractFaceDescriptor, findBestMatch, detectFace } from "@/utils/faceRecognition";

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
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsProcessing(true);
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsProcessing(false);
      return;
    }
    
    ctx.drawImage(video, 0, 0);
    
    // Check if a face is detected
    const faceDetected = detectFace(canvas);
    if (!faceDetected) {
      toast.error("Kein Gesicht erkannt. Bitte positionieren Sie Ihr Gesicht deutlich vor der Kamera.", {
        icon: <AlertCircle className="h-5 w-5 text-destructive" />
      });
      setIsProcessing(false);
      return;
    }

    try {
      // Extract face descriptor
      const currentDescriptor = await extractFaceDescriptor(canvas);
      
      // Get employees with face profiles
      const employeesWithFaces = employees.filter(e => e.face_profiles);
      
      if (employeesWithFaces.length === 0) {
        toast.error("Keine registrierten Gesichter gefunden");
        setIsProcessing(false);
        return;
      }

      // Find best match
      const match = findBestMatch(currentDescriptor, employeesWithFaces, 0.65);
      
      if (!match) {
        toast.error("Gesicht nicht erkannt. Bitte versuchen Sie es erneut.", {
          icon: <AlertCircle className="h-5 w-5 text-destructive" />
        });
        setIsProcessing(false);
        return;
      }

      const { employee } = match;
      
      setEmployee(employee);
      stopCamera();
      setStep("form");
      setIsProcessing(false);
      
      toast.success(`Willkommen ${employee.first_name} ${employee.last_name}!`);
    } catch (error) {
      console.error("Error during face recognition:", error);
      toast.error("Fehler bei der Gesichtserkennung");
      setIsProcessing(false);
    }
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
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl shadow-2xl my-4 max-h-[95vh] overflow-y-auto">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Urlaubsantrag
          </CardTitle>
          <CardDescription className="text-sm">
            {step === "auth" 
              ? "Authentifizierung per Gesichtserkennung" 
              : "Geben Sie die Urlaubsdaten ein"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                <div className="absolute inset-0 border-2 border-primary/30 rounded-lg pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 sm:w-64 sm:h-80 border-2 sm:border-4 border-primary/60 rounded-full" />
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground px-2">
                📸 Schauen Sie in die Kamera zur Authentifizierung
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onCancel}
                  className="flex-1 h-12"
                >
                  Abbrechen
                </Button>
                <Button
                  size="lg"
                  onClick={recognizeFace}
                  disabled={isProcessing}
                  className="flex-1 h-12 bg-gradient-to-r from-primary to-primary/80"
                >
                  {isProcessing ? (
                    "Erkenne..."
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Scannen
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {employee && (
                <Card className="bg-primary/10 border-primary/20">
                  <CardContent className="py-3 sm:py-4">
                    <div className="text-center space-y-1">
                      <p className="text-xs text-muted-foreground">Antrag von:</p>
                      <p className="text-lg sm:text-xl font-bold">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {employee.employee_number}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="request_type" className="text-sm">Art des Antrags *</Label>
                  <Select
                    value={formData.request_type}
                    onValueChange={(value) => setFormData({ ...formData, request_type: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">Urlaub</SelectItem>
                      <SelectItem value="sick_leave">Krankheit</SelectItem>
                      <SelectItem value="personal">Persönlich</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="start_date" className="text-sm">Von *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date" className="text-sm">Bis *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="h-11"
                    />
                  </div>
                </div>

                {formData.start_date && formData.end_date && (
                  <Card className="bg-accent/10 border-accent/20">
                    <CardContent className="py-3">
                      <p className="text-center">
                        <span className="font-semibold text-xl text-accent">
                          {calculateDays()}
                        </span>
                        {" "}Tage
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm">Notizen</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onCancel}
                  className="flex-1 h-12"
                >
                  Abbrechen
                </Button>
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="flex-1 h-12 bg-gradient-to-r from-success to-success/80"
                >
                  {isProcessing ? "Wird eingereicht..." : "Einreichen"}
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
