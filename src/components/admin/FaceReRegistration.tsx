import { useState, useRef, useEffect } from "react";
import { Camera, CheckCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractFaceDescriptor, detectFace } from "@/utils/faceRecognition";

interface FaceReRegistrationProps {
  employee: any;
  onComplete: () => void;
  onCancel: () => void;
}

const FaceReRegistration = ({ employee, onComplete, onCancel }: FaceReRegistrationProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

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

  const captureAndUpdate = async () => {
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
      toast.error("Kein Gesicht erkannt. Bitte positionieren Sie das Gesicht in der Kamera.", {
        icon: <AlertCircle className="h-5 w-5 text-destructive" />
      });
      setIsProcessing(false);
      return;
    }

    try {
      // Extract face descriptor using ML model
      const descriptor = await extractFaceDescriptor(canvas);
      
      // Convert to base64 for image storage
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      
      // Create face descriptor object
      const faceDescriptor = {
        timestamp: new Date().toISOString(),
        employee_id: employee.id,
        descriptor: descriptor,
        model: 'transformers-v1'
      };

      // Check if face profile exists
      if (employee.face_profiles) {
        // Update existing profile
        const { error } = await supabase
          .from("face_profiles")
          .update({
            face_descriptor: faceDescriptor,
            image_url: imageData,
            updated_at: new Date().toISOString()
          })
          .eq("employee_id", employee.id);

        if (error) {
          console.error("Fehler beim Aktualisieren:", error);
          toast.error("Fehler beim Aktualisieren des Gesichtsprofils");
          setIsProcessing(false);
          return;
        }
      } else {
        // Create new profile
        const { error } = await supabase
          .from("face_profiles")
          .insert({
            employee_id: employee.id,
            face_descriptor: faceDescriptor,
            image_url: imageData
          });

        if (error) {
          console.error("Fehler beim Erstellen:", error);
          toast.error("Fehler beim Erstellen des Gesichtsprofils");
          setIsProcessing(false);
          return;
        }
      }

      setIsProcessing(false);
      stopCamera();

      toast.success(
        `Gesichtsprofil für ${employee.first_name} ${employee.last_name} erfolgreich ${employee.face_profiles ? 'aktualisiert' : 'erstellt'}!`,
        {
          icon: <CheckCircle className="h-5 w-5 text-success" />,
          description: "Das Gesicht wurde erfolgreich gespeichert"
        }
      );

      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error("Fehler bei der Gesichtserkennung:", error);
      toast.error("Fehler bei der Gesichtsanalyse. Bitte versuchen Sie es erneut.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Camera className="h-6 w-6 text-primary" />
              Gesicht {employee.face_profiles ? 'neu registrieren' : 'registrieren'}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                stopCamera();
                onCancel();
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Gesichtsregistrierung für:</p>
                <p className="text-2xl font-bold">
                  {employee.first_name} {employee.last_name}
                </p>
                <p className="text-muted-foreground">
                  {employee.employee_number} • {employee.department || "Keine Abteilung"}
                </p>
              </div>
            </CardContent>
          </Card>

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

            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
              <p className="text-sm text-center">
                📸 Positionieren Sie das Gesicht mittig im markierten Bereich
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  stopCamera();
                  onCancel();
                }}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button
                size="lg"
                onClick={captureAndUpdate}
                disabled={isProcessing}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80"
              >
                {isProcessing ? (
                  "Verarbeite..."
                ) : (
                  <>
                    <Camera className="mr-2 h-5 w-5" />
                    Gesicht aufnehmen & speichern
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaceReRegistration;
