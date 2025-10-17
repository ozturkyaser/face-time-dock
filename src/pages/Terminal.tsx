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
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [barcode, setBarcode] = useState("");
  const [scanMode, setScanMode] = useState<'input' | 'camera'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanningEnabled, setScanningEnabled] = useState(true);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (scanMode === 'input' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    } else if (scanMode === 'camera' && !isCameraActive) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [scanMode]);

  const startCamera = async () => {
    try {
      console.log("Starting camera...");
      
      // First cleanup any existing camera
      if (codeReaderRef.current) {
        console.log("Cleaning up existing camera reader");
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      }

      // Request camera with high resolution and autofocus
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      // Stop the permission stream immediately
      stream.getTracks().forEach(track => track.stop());

      const codeReader = new BrowserMultiFormatReader();
      
      // Set hints for better barcode detection
      const hints = new Map();
      const { DecodeHintType, BarcodeFormat } = await import('@zxing/library');
      
      // Specify common barcode formats
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE
      ]);
      
      // Enable more thorough scanning
      hints.set(DecodeHintType.TRY_HARDER, true);
      
      codeReader.hints = hints;
      codeReaderRef.current = codeReader;

      const videoInputDevices = await codeReader.listVideoInputDevices();
      if (videoInputDevices.length === 0) {
        toast.error("Keine Kamera gefunden");
        setIsCameraActive(false);
        return;
      }

      // Prefer back camera
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      const selectedDeviceId = backCamera?.deviceId || videoInputDevices[0].deviceId;

      console.log("Decoding from video device...");
      await codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current!,
        (result, error) => {
          if (result) {
            console.log("QR Code detected, scanningEnabled:", scanningEnabled);
            if (scanningEnabled && !isProcessing) {
              const scannedCode = result.getText();
              console.log("Processing barcode:", scannedCode);
              setScanningEnabled(false);
              handleBarcodeSubmit(scannedCode);
            } else {
              console.log("Scan ignored - already processing or disabled");
            }
          }
          // Only log non-NotFoundException errors
          if (error && error.name !== 'NotFoundException') {
            console.error("Barcode scan error:", error);
          }
        }
      );
      
      setIsCameraActive(true);
      console.log("Camera started successfully");
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
    console.log("Stopping camera...");
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
        console.log("Camera reset successful");
      } catch (error) {
        console.error("Error resetting camera:", error);
      }
      codeReaderRef.current = null;
    }
    setIsCameraActive(false);
    console.log("Camera stopped");
  };

  const handleBarcodeSubmit = async (scannedBarcode: string) => {
    if (!scannedBarcode.trim() || isProcessing) return;

    setIsProcessing(true);
    stopCamera(); // Kamera ausschalten

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
        if (scanMode === 'camera') startCamera(); // Kamera wieder einschalten bei Fehler
        return;
      }

      if (!employee) {
        toast.error("Barcode nicht erkannt", {
          icon: <XCircle className="h-5 w-5 text-destructive" />,
          description: "Kein aktiver Mitarbeiter mit diesem Barcode gefunden"
        });
        setBarcode("");
        setIsProcessing(false);
        if (scanMode === 'camera') startCamera(); // Kamera wieder einschalten bei Fehler
        return;
      }

      await handleCheckInOut(employee);
      setBarcode("");
    } catch (error) {
      console.error("Error during barcode authentication:", error);
      toast.error("Fehler bei der Anmeldung");
      setBarcode("");
      setIsProcessing(false);
      if (scanMode === 'camera') startCamera(); // Kamera wieder einschalten bei Fehler
    }
  };

  const handleCheckInOut = async (employee: any) => {
    const currentTime = new Date().toISOString();
    
    // Check if there's an open time entry
    const { data: openEntries } = await supabase
      .from("time_entries")
      .select("*")
      .eq("employee_id", employee.id)
      .is("check_out", null)
      .order("check_in", { ascending: false })
      .limit(1);

    let actionType = "";
    let actionTime = currentTime;

    if (openEntries && openEntries.length > 0) {
      // Check out
      const { error } = await supabase
        .from("time_entries")
        .update({ check_out: currentTime })
        .eq("id", openEntries[0].id);

      if (error) {
        toast.error("Fehler beim Ausstempeln");
        return;
      }

      actionType = "out";
      toast.success(`${employee.first_name} ${employee.last_name} erfolgreich ausgestempelt`, {
        icon: <XCircle className="h-5 w-5 text-destructive" />
      });
    } else {
      // Check in
      const { error } = await supabase
        .from("time_entries")
        .insert({
          employee_id: employee.id,
          check_in: currentTime
        });

      if (error) {
        toast.error("Fehler beim Einstempeln");
        return;
      }

      actionType = "in";
      toast.success(`${employee.first_name} ${employee.last_name} erfolgreich eingestempelt`, {
        icon: <CheckCircle className="h-5 w-5 text-success" />
      });
    }

    // Show confirmation screen
    setConfirmationData({
      employee,
      type: actionType,
      time: actionTime
    });
    setShowConfirmation(true);
    setLastCheckIn({ ...employee, type: actionType });
  };

  const handleConfirmationClose = () => {
    console.log("Closing confirmation, resetting states...");
    setShowConfirmation(false);
    setConfirmationData(null);
    
    // Reset all states before restarting camera
    setIsProcessing(false);
    
    // Small delay to ensure states are updated
    setTimeout(() => {
      console.log("Setting scanningEnabled to true");
      setScanningEnabled(true);
      
      if (scanMode === 'camera') {
        console.log("Restarting camera after confirmation");
        startCamera();
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8">
      {showVacationRequest && (
        <VacationRequest
          onComplete={() => setShowVacationRequest(false)}
          onCancel={() => setShowVacationRequest(false)}
        />
      )}

      {showConfirmation && confirmationData && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <Card className="w-full max-w-2xl p-12 shadow-2xl">
            <div className="text-center space-y-8">
              <div className="mx-auto w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                {confirmationData.type === "in" ? (
                  <CheckCircle className="h-16 w-16 text-white" />
                ) : (
                  <XCircle className="h-16 w-16 text-white" />
                )}
              </div>
              
              <div className="space-y-4">
                <h2 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {confirmationData.employee.first_name} {confirmationData.employee.last_name}
                </h2>
                <p className="text-3xl font-semibold">
                  {confirmationData.type === "in" ? "Eingestempelt" : "Ausgestempelt"}
                </p>
                <p className="text-6xl font-bold text-primary">
                  {new Date(confirmationData.time).toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                  })}
                </p>
                <p className="text-2xl text-muted-foreground">
                  {new Date(confirmationData.time).toLocaleDateString("de-DE", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                  })}
                </p>
              </div>

              <Button
                onClick={handleConfirmationClose}
                size="lg"
                className="text-2xl h-16 px-12"
              >
                OK
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Zeiterfassung Terminal
          </h1>
          <p className="text-xl text-muted-foreground">
            Scannen Sie Ihren QR-Code zum An- oder Abmelden
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
                {scanMode === 'camera' ? 'QR-Code mit Kamera scannen' : 'QR-Code scannen'}
              </h2>
              <p className="text-xl text-muted-foreground">
                {scanMode === 'camera' 
                  ? 'Halten Sie den QR-Code vor die Kamera' 
                  : 'Bitte scannen Sie Ihren Mitarbeiter-QR-Code'}
              </p>
            </div>

            <div className="flex gap-2 justify-center">
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
                  placeholder="QR-Code wird hier angezeigt..."
                  disabled={isProcessing}
                  autoFocus
                />
                <p className="text-sm text-muted-foreground text-center">
                  Der Scanner fügt den Code automatisch ein
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
                  {isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-64 h-32 border-4 border-primary rounded-lg shadow-lg">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Halten Sie den QR-Code zentral im Zielbereich
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
