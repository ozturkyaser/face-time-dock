import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Camera } from "lucide-react";
import { extractFaceDescriptor, findBestMatch } from "@/utils/faceRecognition";

interface EmployeeLoginProps {
  onLoginSuccess: (employee: any) => void;
}

const EmployeeLogin = ({ onLoginSuccess }: EmployeeLoginProps) => {
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"pin" | "face">("pin");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (loginMethod === "face" && !isCameraActive) {
      startCamera();
    } else if (loginMethod === "pin" && isCameraActive) {
      stopCamera();
    }
    return () => stopCamera();
  }, [loginMethod]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error("Error starting camera:", error);
      toast.error("Kamera konnte nicht gestartet werden");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCameraActive(false);
    }
  };

  const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeNumber || !pin) {
      toast.error("Bitte Mitarbeiternummer und PIN eingeben");
      return;
    }

    setIsLoading(true);

    try {
      const pinHash = await hashPin(pin);

      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("employee_number", employeeNumber)
        .eq("pin_hash", pinHash)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        toast.error("Ungültige Mitarbeiternummer oder PIN");
        setIsLoading(false);
        return;
      }

      toast.success(`Willkommen ${data.first_name}!`);
      onLoginSuccess(data);
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Fehler beim Anmelden");
      setIsLoading(false);
    }
  };

  const handleFaceLogin = async () => {
    if (!videoRef.current || !canvasRef.current || isRecognizing) return;

    setIsRecognizing(true);

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error("Canvas context not available");
      }

      ctx.drawImage(video, 0, 0);

      const descriptor = await extractFaceDescriptor(canvas);
      
      if (!descriptor) {
        toast.error("Kein Gesicht erkannt. Bitte positionieren Sie sich vor der Kamera.");
        setIsRecognizing(false);
        return;
      }

      console.log('✓ Face descriptor extracted:', descriptor.length, 'dimensions');

      const { data: profiles, error } = await supabase
        .from("face_profiles")
        .select(`
          *,
          employees!inner (
            id,
            employee_number,
            first_name,
            last_name,
            is_active
          )
        `);

      if (error || !profiles || profiles.length === 0) {
        console.error('No profiles found:', error);
        toast.error("Keine registrierten Mitarbeiter gefunden");
        setIsRecognizing(false);
        return;
      }

      console.log(`Found ${profiles.length} total profiles`);

      // Filter nur Profile mit dem neuen Modell (1000 Dimensionen)
      const compatibleProfiles = profiles.filter(profile => {
        const faceDesc = profile.face_descriptor as any;
        const descriptorLength = faceDesc?.descriptor?.length;
        console.log(`Profile for ${profile.employees.first_name}: ${descriptorLength} dimensions`);
        return descriptorLength === 1000;
      });

      console.log(`✓ Found ${compatibleProfiles.length} compatible profiles (1000 dimensions)`);

      if (compatibleProfiles.length === 0) {
        toast.error("Ihr Gesichtsprofil ist veraltet. Bitte melden Sie sich beim Administrator, um Ihr Gesicht neu zu registrieren.", {
          duration: 5000
        });
        setIsRecognizing(false);
        return;
      }

      // Lower threshold for better matching
      const match = findBestMatch(descriptor, compatibleProfiles, 0.70);

      if (match) {
        const employee = match.employee.employees;
        console.log(`✓ Match found: ${employee.first_name} ${employee.last_name} (${(match.similarity * 100).toFixed(1)}%)`);
        
        if (!employee.is_active) {
          toast.error("Ihr Konto ist deaktiviert");
          setIsRecognizing(false);
          return;
        }

        toast.success(`Willkommen ${employee.first_name}! (${(match.similarity * 100).toFixed(0)}% Übereinstimmung)`);
        stopCamera();
        onLoginSuccess(employee);
      } else {
        console.log('✗ No match found above threshold');
        toast.error("Gesicht nicht erkannt. Bitte versuchen Sie es erneut oder verwenden Sie die PIN.", {
          description: "Stellen Sie sicher, dass Ihr Gesicht gut beleuchtet ist und Sie direkt in die Kamera schauen."
        });
        setIsRecognizing(false);
      }
    } catch (error) {
      console.error("Face recognition error:", error);
      toast.error("Fehler bei der Gesichtserkennung");
      setIsRecognizing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">Mitarbeiter Portal</CardTitle>
          <CardDescription>
            Melden Sie sich mit Ihrer Mitarbeiternummer und PIN an
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as "pin" | "face")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pin" className="gap-2">
                <User className="h-4 w-4" />
                PIN
              </TabsTrigger>
              <TabsTrigger value="face" className="gap-2">
                <Camera className="h-4 w-4" />
                Gesichtserkennung
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pin" className="space-y-4 mt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeNumber">Mitarbeiternummer</Label>
                  <Input
                    id="employeeNumber"
                    type="text"
                    placeholder="z.B. 001"
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pin">PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    disabled={isLoading}
                    maxLength={6}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Anmelden..." : "Anmelden"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="face" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {!isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  Positionieren Sie Ihr Gesicht vor der Kamera
                </div>

                <Button 
                  onClick={handleFaceLogin} 
                  className="w-full gap-2" 
                  disabled={!isCameraActive || isRecognizing}
                >
                  <Camera className="h-4 w-4" />
                  {isRecognizing ? "Erkenne..." : "Mit Gesicht anmelden"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeLogin;
