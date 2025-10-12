import { useState, useEffect, useRef } from "react";
import { Camera, CheckCircle, XCircle, Clock, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FaceRegistration from "@/components/terminal/FaceRegistration";

const Terminal = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [lastCheckIn, setLastCheckIn] = useState<any>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    loadEmployees();
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*, face_profiles(*)")
      .eq("is_active", true);
    
    if (error) {
      console.error("Error loading employees:", error);
      return;
    }
    setEmployees(data || []);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Kamerazugriff fehlgeschlagen");
    }
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsProcessing(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    // For demo purposes, we'll use a simple matching mechanism
    // In production, you would use face recognition models
    const imageData = canvas.toDataURL("image/jpeg");
    
    // Simple demo: randomly select an employee
    if (employees.length > 0) {
      const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
      await handleCheckInOut(randomEmployee);
    } else {
      toast.error("Keine Mitarbeiter registriert");
    }
    
    setIsProcessing(false);
  };

  const handleCheckInOut = async (employee: any) => {
    // Check if there's an open time entry
    const { data: openEntries } = await supabase
      .from("time_entries")
      .select("*")
      .eq("employee_id", employee.id)
      .is("check_out", null)
      .order("check_in", { ascending: false })
      .limit(1);

    if (openEntries && openEntries.length > 0) {
      // Check out
      const { error } = await supabase
        .from("time_entries")
        .update({ check_out: new Date().toISOString() })
        .eq("id", openEntries[0].id);

      if (error) {
        toast.error("Fehler beim Ausstempeln");
        return;
      }

      toast.success(`${employee.first_name} ${employee.last_name} erfolgreich ausgestempelt`, {
        icon: <XCircle className="h-5 w-5 text-destructive" />
      });
      setLastCheckIn({ ...employee, type: "out" });
    } else {
      // Check in
      const { error } = await supabase
        .from("time_entries")
        .insert({
          employee_id: employee.id,
          check_in: new Date().toISOString()
        });

      if (error) {
        toast.error("Fehler beim Einstempeln");
        return;
      }

      toast.success(`${employee.first_name} ${employee.last_name} erfolgreich eingestempelt`, {
        icon: <CheckCircle className="h-5 w-5 text-success" />
      });
      setLastCheckIn({ ...employee, type: "in" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8">
      {showRegistration && (
        <FaceRegistration
          onComplete={() => {
            setShowRegistration(false);
            loadEmployees();
          }}
          onCancel={() => setShowRegistration(false)}
        />
      )}
      
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Zeiterfassung Terminal
          </h1>
          <p className="text-xl text-muted-foreground">
            Positionieren Sie Ihr Gesicht vor der Kamera
          </p>
        </div>

        <Card className="p-8 shadow-xl">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden shadow-lg">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              
              <div className="space-y-3">
                <Button
                  size="lg"
                  onClick={captureAndRecognize}
                  disabled={isProcessing}
                  className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                >
                  {isProcessing ? (
                    <>
                      <Clock className="mr-2 h-6 w-6 animate-spin" />
                      Gesichtserkennung läuft...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-6 w-6" />
                      Gesicht scannen
                    </>
                  )}
                </Button>
                
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowRegistration(true)}
                  className="w-full h-14 text-base font-semibold shadow-md hover:bg-primary/10"
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  Neu? Gesicht registrieren
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Letzte Aktion
                </h3>
                {lastCheckIn ? (
                  <Card className="p-6 bg-gradient-to-br from-card to-card/50">
                    <div className="flex items-center gap-4">
                      {lastCheckIn.type === "in" ? (
                        <CheckCircle className="h-12 w-12 text-success" />
                      ) : (
                        <XCircle className="h-12 w-12 text-destructive" />
                      )}
                      <div>
                        <p className="text-2xl font-bold">
                          {lastCheckIn.first_name} {lastCheckIn.last_name}
                        </p>
                        <p className="text-muted-foreground">
                          {lastCheckIn.type === "in" ? "Eingestempelt" : "Ausgestempelt"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date().toLocaleTimeString("de-DE")}
                        </p>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-6 text-center text-muted-foreground">
                    Noch keine Aktion durchgeführt
                  </Card>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Registrierte Mitarbeiter</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {employees.map((emp) => (
                    <Card key={emp.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {emp.employee_number}
                          </p>
                        </div>
                        {emp.face_profiles ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.location.href = "/admin"}
            className="shadow-md"
          >
            Admin-Bereich
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
