import { useState, useEffect, useRef } from "react";
import { Scan, CheckCircle, XCircle, Clock, CalendarDays, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VacationRequest from "@/components/terminal/VacationRequest";
import { BrowserMultiFormatReader } from "@zxing/library";

const Terminal = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<any>(null);
  const [showVacationRequest, setShowVacationRequest] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [scanMode, setScanMode] = useState<'input' | 'camera'>('input');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (scanMode === 'input' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
    
    return () => {
      stopCamera();
    };
  }, [scanMode]);

  const startCamera = async () => {
    try {
      // First, request camera permission explicitly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      // Stop the permission stream immediately
      stream.getTracks().forEach(track => track.stop());

      setIsCameraActive(true);
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      const videoInputDevices = await codeReader.listVideoInputDevices();
      if (videoInputDevices.length === 0) {
        toast.error("Keine Kamera gefunden");
        setIsCameraActive(false);
        return;
      }

      // Use the first available camera (or back camera if available)
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      const selectedDeviceId = backCamera?.deviceId || videoInputDevices[0].deviceId;

      await codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current!,
        (result, error) => {
          if (result) {
            const scannedCode = result.getText();
            console.log("Barcode detected:", scannedCode);
            handleBarcodeSubmit(scannedCode);
            stopCamera();
          }
          if (error && error.name !== 'NotFoundException') {
            console.error("Barcode scan error:", error);
          }
        }
      );
    } catch (error: any) {
      console.error("Camera error:", error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error("Kamera-Zugriff verweigert", {
          description: "Bitte erlauben Sie den Kamera-Zugriff in Ihren Browser-Einstellungen"
        });
      } else if (error.name === 'NotFoundError') {
        toast.error("Keine Kamera gefunden");
      } else {
        toast.error("Kamera konnte nicht gestartet werden", {
          description: error.message || "Unbekannter Fehler"
        });
      }
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleBarcodeSubmit = async (scannedBarcode: string) => {
    if (!scannedBarcode.trim() || isProcessing) return;

    setIsProcessing(true);

    try {
      // Find employee by barcode
      const { data: employee, error } = await supabase
        .from("employees")
        .select("*")
        .eq("barcode", scannedBarcode)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Database error:", error);
        toast.error("Fehler bei der Datenbankabfrage");
        setBarcode("");
        setIsProcessing(false);
        return;
      }

      if (!employee) {
        toast.error("Barcode nicht erkannt", {
          icon: <XCircle className="h-5 w-5 text-destructive" />,
          description: "Kein aktiver Mitarbeiter mit diesem Barcode gefunden"
        });
        setBarcode("");
        setIsProcessing(false);
        return;
      }

      await handleCheckInOut(employee);
      setBarcode("");
    } catch (error) {
      console.error("Error during barcode authentication:", error);
      toast.error("Fehler bei der Anmeldung");
      setBarcode("");
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
      {showVacationRequest && (
        <VacationRequest
          onComplete={() => setShowVacationRequest(false)}
          onCancel={() => setShowVacationRequest(false)}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Zeiterfassung Terminal
          </h1>
          <p className="text-xl text-muted-foreground">
            Scannen Sie Ihren Barcode zum An- oder Abmelden
          </p>
        </div>

        <Card className="p-12 shadow-xl">
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
                {scanMode === 'camera' ? (
                  <Camera className="h-16 w-16 text-primary animate-pulse" />
                ) : (
                  <Scan className="h-16 w-16 text-primary animate-pulse" />
                )}
              </div>
              <h2 className="text-3xl font-bold">
                {scanMode === 'camera' ? 'Barcode mit Kamera scannen' : 'Barcode scannen'}
              </h2>
              <p className="text-xl text-muted-foreground">
                {scanMode === 'camera' 
                  ? 'Halten Sie den Barcode vor die Kamera' 
                  : 'Bitte scannen Sie Ihren Mitarbeiter-Barcode'}
              </p>
            </div>

            <div className="flex gap-2 justify-center">
              <Button
                variant={scanMode === 'input' ? 'default' : 'outline'}
                onClick={() => {
                  setScanMode('input');
                  stopCamera();
                }}
                disabled={isProcessing}
              >
                <Scan className="h-4 w-4 mr-2" />
                Scanner
              </Button>
              <Button
                variant={scanMode === 'camera' ? 'default' : 'outline'}
                onClick={() => {
                  setScanMode('camera');
                  if (!isCameraActive) {
                    startCamera();
                  }
                }}
                disabled={isProcessing}
              >
                <Camera className="h-4 w-4 mr-2" />
                Kamera
              </Button>
            </div>

            {scanMode === 'input' ? (
              <div className="space-y-4">
                <Input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleBarcodeSubmit(barcode);
                    }
                  }}
                  className="w-full h-16 text-center text-2xl font-mono"
                  placeholder="Barcode wird hier angezeigt..."
                  disabled={isProcessing}
                  autoFocus
                />
                <p className="text-sm text-muted-foreground text-center">
                  Der Barcode-Scanner fügt den Code automatisch ein
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                  />
                  {!isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <p className="text-muted-foreground">Kamera wird gestartet...</p>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Der Barcode wird automatisch erkannt
                </p>
              </div>
            )}

            {isProcessing && (
              <div className="text-center">
                <Clock className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="mt-4 text-lg">Wird verarbeitet...</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowVacationRequest(true)}
                className="flex-1 h-14 text-base"
                disabled={isProcessing}
              >
                <CalendarDays className="mr-2 h-5 w-5" />
                Urlaubsantrag
              </Button>
            </div>

            {lastCheckIn && (
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
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Terminal;
