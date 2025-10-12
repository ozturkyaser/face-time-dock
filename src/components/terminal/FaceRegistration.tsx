import { useState, useRef } from "react";
import { Camera, UserPlus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FaceRegistrationProps {
  onComplete: () => void;
  onCancel: () => void;
}

const FaceRegistration = ({ onComplete, onCancel }: FaceRegistrationProps) => {
  const [step, setStep] = useState<"input" | "capture">("input");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employee, setEmployee] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleFindEmployee = async () => {
    if (!employeeNumber || !firstName || !lastName) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }

    setIsProcessing(true);
    const { data, error } = await supabase
      .from("employees")
      .select("*, face_profiles(*)")
      .eq("employee_number", employeeNumber)
      .ilike("first_name", firstName)
      .ilike("last_name", lastName)
      .single();

    setIsProcessing(false);

    if (error || !data) {
      toast.error("Mitarbeiter nicht gefunden. Bitte Daten überprüfen.");
      return;
    }

    if (data.face_profiles) {
      toast.error("Dieser Mitarbeiter ist bereits registriert!");
      return;
    }

    setEmployee(data);
    setStep("capture");
    startCamera();
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

  const captureAndSave = async () => {
    if (!videoRef.current || !canvasRef.current || !employee) return;

    setIsProcessing(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    
    // Convert to base64
    const imageData = canvas.toDataURL("image/jpeg");
    
    // Create a simple face descriptor (in production, use real face recognition model)
    const faceDescriptor = {
      timestamp: new Date().toISOString(),
      imageHash: btoa(imageData.substring(0, 100)),
      employee_id: employee.id
    };

    // Save to database
    const { error } = await supabase
      .from("face_profiles")
      .insert({
        employee_id: employee.id,
        face_descriptor: faceDescriptor,
        image_url: imageData
      });

    setIsProcessing(false);
    stopCamera();

    if (error) {
      console.error("Fehler beim Speichern:", error);
      toast.error("Fehler beim Speichern des Gesichtsprofils");
      return;
    }

    toast.success(
      `Gesichtsprofil für ${employee.first_name} ${employee.last_name} erfolgreich gespeichert!`,
      {
        icon: <CheckCircle className="h-5 w-5 text-success" />
      }
    );

    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <UserPlus className="h-6 w-6 text-primary" />
            Gesichtsregistrierung
          </CardTitle>
          <CardDescription>
            {step === "input" 
              ? "Geben Sie Ihre Mitarbeiterdaten ein" 
              : "Schauen Sie direkt in die Kamera für die Gesichtserkennung"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === "input" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee_number">Personalnummer *</Label>
                <Input
                  id="employee_number"
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  placeholder="z.B. MA-001"
                  className="h-12 text-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Vorname *</Label>
                  <Input
                    id="first_name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Vorname"
                    className="h-12 text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nachname *</Label>
                  <Input
                    id="last_name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Nachname"
                    className="h-12 text-lg"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button
                  size="lg"
                  onClick={handleFindEmployee}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? "Suche..." : "Weiter zur Kamera"}
                </Button>
              </div>
            </div>
          ) : (
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
              
              {employee && (
                <Card className="bg-primary/10 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Registrierung für:</p>
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

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button
                  size="lg"
                  onClick={captureAndSave}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                >
                  {isProcessing ? (
                    "Speichert..."
                  ) : (
                    <>
                      <Camera className="mr-2 h-5 w-5" />
                      Gesicht aufnehmen & speichern
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FaceRegistration;
