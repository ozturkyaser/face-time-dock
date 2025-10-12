import { useState, useRef } from "react";
import { Camera, UserPlus, CheckCircle, AlertCircle, Upload, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractFaceDescriptor, detectFace } from "@/utils/faceRecognition";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FaceRegistrationProps {
  onComplete: () => void;
  onCancel: () => void;
}

const FaceRegistration = ({ onComplete, onCancel }: FaceRegistrationProps) => {
  const [step, setStep] = useState<"input" | "capture">("input");
  const [captureMethod, setCaptureMethod] = useState<"camera" | "upload">("camera");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employee, setEmployee] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (captureMethod === "camera") {
      startCamera();
    }
  };

  const startCamera = async () => {
    if (captureMethod !== "camera") return;
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Bitte wählen Sie eine Bilddatei");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
    };
    reader.readAsDataURL(file);
  };

  const captureAndSave = async () => {
    if (!canvasRef.current || !employee) return;

    setIsProcessing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    // Handle camera capture
    if (captureMethod === "camera" && videoRef.current) {
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      await processAndSave(canvas);
    } 
    // Handle uploaded image
    else if (captureMethod === "upload" && uploadedImage) {
      const img = document.createElement('img');
      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        await processAndSave(canvas);
      };
      img.src = uploadedImage;
    } else {
      toast.error("Kein Bild verfügbar");
      setIsProcessing(false);
    }
  };

  const processAndSave = async (canvas: HTMLCanvasElement) => {
    const faceDetected = detectFace(canvas);
    if (!faceDetected) {
      toast.error("Kein Gesicht erkannt. Bitte verwenden Sie ein klares Gesichtsfoto.", {
        icon: <AlertCircle className="h-5 w-5 text-destructive" />
      });
      setIsProcessing(false);
      return;
    }

    try {
      const descriptor = await extractFaceDescriptor(canvas);
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      
      const faceDescriptor = {
        timestamp: new Date().toISOString(),
        employee_id: employee.id,
        descriptor: descriptor,
        model: 'transformers-v1'
      };

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
        `Gesichtsprofil erfolgreich gespeichert!`,
        {
          icon: <CheckCircle className="h-5 w-5 text-success" />
        }
      );

      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error("Fehler bei der Gesichtserkennung:", error);
      toast.error("Fehler bei der Gesichtsanalyse");
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-2xl shadow-2xl max-h-[95vh] overflow-y-auto">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Gesicht registrieren
          </CardTitle>
          <CardDescription className="text-sm">
            {step === "input" 
              ? "Geben Sie Ihre Mitarbeiterdaten ein" 
              : "Wählen Sie eine Methode zur Gesichtserkennung"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "input" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee_number" className="text-sm">Personalnummer *</Label>
                <Input
                  id="employee_number"
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  placeholder="z.B. MA-001"
                  className="h-11 text-base"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-sm">Vorname *</Label>
                  <Input
                    id="first_name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Vorname"
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-sm">Nachname *</Label>
                  <Input
                    id="last_name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Nachname"
                    className="h-11 text-base"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleCancel}
                  className="flex-1 h-12"
                >
                  Abbrechen
                </Button>
                <Button
                  size="lg"
                  onClick={handleFindEmployee}
                  disabled={isProcessing}
                  className="flex-1 h-12"
                >
                  {isProcessing ? "Suche..." : "Weiter"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {employee && (
                <Card className="bg-primary/10 border-primary/20">
                  <CardContent className="py-3 sm:py-4">
                    <div className="text-center space-y-1">
                      <p className="text-xs text-muted-foreground">Registrierung für:</p>
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

              <Tabs value={captureMethod} onValueChange={(v) => {
                setCaptureMethod(v as "camera" | "upload");
                if (v === "camera") startCamera();
                else stopCamera();
              }}>
                <TabsList className="grid w-full grid-cols-2 h-auto">
                  <TabsTrigger value="camera" className="py-3">
                    <Camera className="h-4 w-4 mr-2" />
                    <span className="text-sm">Kamera</span>
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="py-3">
                    <Upload className="h-4 w-4 mr-2" />
                    <span className="text-sm">Upload</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="camera" className="space-y-3">
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
                    📸 Positionieren Sie Ihr Gesicht im markierten Bereich
                  </p>
                </TabsContent>

                <TabsContent value="upload" className="space-y-3">
                  <div className="bg-muted rounded-lg overflow-hidden aspect-video relative flex items-center justify-center">
                    {uploadedImage ? (
                      <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center p-4">
                        <Image className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Kein Bild ausgewählt</p>
                      </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-12"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Foto auswählen
                  </Button>
                </TabsContent>
              </Tabs>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleCancel}
                  className="flex-1 h-12"
                >
                  Abbrechen
                </Button>
                <Button
                  size="lg"
                  onClick={captureAndSave}
                  disabled={isProcessing || (captureMethod === "upload" && !uploadedImage)}
                  className="flex-1 h-12 bg-gradient-to-r from-primary to-primary/80"
                >
                  {isProcessing ? (
                    "Verarbeite..."
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      {captureMethod === "camera" ? "Aufnehmen" : "Speichern"}
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
