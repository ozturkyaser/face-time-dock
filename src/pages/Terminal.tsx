import { useState, useEffect, useRef } from "react";
import { Scan, CheckCircle, XCircle, Clock, CalendarDays, Camera, LogIn, LogOut, Users, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VacationRequest from "@/components/terminal/VacationRequest";
import { BrowserMultiFormatReader } from "@zxing/library";
import { checkGeofence, formatDistance } from "@/utils/geolocation";

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
  const [checkedInEmployees, setCheckedInEmployees] = useState<any[]>([]);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [showVacationScan, setShowVacationScan] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanningEnabledRef = useRef(true);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    loadCheckedInEmployees();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('time_entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries'
        },
        () => {
          loadCheckedInEmployees();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const loadCheckedInEmployees = async () => {
    const { data, error } = await supabase
      .from("time_entries")
      .select(`
        *,
        employees (
          id,
          first_name,
          last_name,
          employee_number,
          position
        )
      `)
      .is("check_out", null)
      .order("check_in", { ascending: false });

    if (!error && data) {
      setCheckedInEmployees(data);
    }
  };

  const startCamera = async () => {
    try {
      console.log("Starting camera...");
      
      // First cleanup any existing camera
      stopCamera();
      
      // Wait a bit to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const codeReader = new BrowserMultiFormatReader();
      
      // Set hints for better barcode detection
      const hints = new Map();
      const { DecodeHintType, BarcodeFormat } = await import('@zxing/library');
      
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE
      ]);
      
      hints.set(DecodeHintType.TRY_HARDER, true);
      
      codeReader.hints = hints;
      codeReaderRef.current = codeReader;

      const videoInputDevices = await codeReader.listVideoInputDevices();
      if (videoInputDevices.length === 0) {
        toast.error("Keine Kamera gefunden");
        setIsCameraActive(false);
        return;
      }

      setAvailableCameras(videoInputDevices);

      let selectedDevice;
      if (cameraFacing === 'back') {
        selectedDevice = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
      } else {
        selectedDevice = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('front') || 
          device.label.toLowerCase().includes('user') ||
          device.label.toLowerCase().includes('face')
        );
      }
      
      const selectedDeviceId = selectedDevice?.deviceId || videoInputDevices[0].deviceId;

      console.log("Decoding from video device...");
      await codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current!,
        (result, error) => {
          if (result) {
            console.log("QR Code detected, scanningEnabled:", scanningEnabledRef.current, "isProcessing:", isProcessingRef.current);
            if (scanningEnabledRef.current && !isProcessingRef.current) {
              const scannedCode = result.getText();
              console.log("Processing barcode:", scannedCode);
              scanningEnabledRef.current = false;
              setScanningEnabled(false);
              handleBarcodeSubmit(scannedCode);
            } else {
              console.log("Scan ignored - already processing or disabled");
            }
          }
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
    
    // Stop video element streams directly
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log("Stopped track:", track.kind);
      });
      videoRef.current.srcObject = null;
    }
    
    // Reset the code reader
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

    console.log("handleBarcodeSubmit called, setting isProcessing to true");
    setIsProcessing(true);
    isProcessingRef.current = true;
    stopCamera(); // Kamera ausschalten

    try {
      // Find employee by barcode with location data
      const { data: employee, error } = await supabase
        .from("employees")
        .select(`
          *,
          locations (
            id,
            name,
            latitude,
            longitude,
            geofence_radius_meters
          )
        `)
        .eq("barcode", scannedBarcode)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Database error:", error);
        toast.error("Fehler bei der Datenbankabfrage");
        setBarcode("");
        setIsProcessing(false);
        isProcessingRef.current = false;
        if (scanMode === 'camera') {
          scanningEnabledRef.current = true;
          setScanningEnabled(true);
          startCamera();
        }
        return;
      }

      if (!employee) {
        toast.error("Barcode nicht erkannt", {
          icon: <XCircle className="h-5 w-5 text-destructive" />,
          description: "Kein aktiver Mitarbeiter mit diesem Barcode gefunden"
        });
        setBarcode("");
        setIsProcessing(false);
        isProcessingRef.current = false;
        if (scanMode === 'camera') {
          scanningEnabledRef.current = true;
          setScanningEnabled(true);
          startCamera();
        }
        return;
      }

      await handleCheckInOut(employee);
      setBarcode("");
    } catch (error) {
      console.error("Error during barcode authentication:", error);
      toast.error("Fehler bei der Anmeldung");
      setBarcode("");
      setIsProcessing(false);
      isProcessingRef.current = false;
      if (scanMode === 'camera') {
        scanningEnabledRef.current = true;
        setScanningEnabled(true);
        startCamera();
      }
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
      // Check out - no geofence check required
      const { error } = await supabase
        .from("time_entries")
        .update({ check_out: currentTime })
        .eq("id", openEntries[0].id);

      if (error) {
        toast.error("Fehler beim Ausstempeln");
        setIsProcessing(false);
        isProcessingRef.current = false;
        if (scanMode === 'camera') {
          scanningEnabledRef.current = true;
          setScanningEnabled(true);
          startCamera();
        }
        return;
      }

      actionType = "out";
      toast.success(`${employee.first_name} ${employee.last_name} erfolgreich ausgestempelt`, {
        icon: <XCircle className="h-5 w-5 text-destructive" />
      });
    } else {
      // Check in - perform geofence check
      if (employee.locations) {
        const geofenceResult = await checkGeofence(
          employee.locations.latitude,
          employee.locations.longitude,
          employee.locations.geofence_radius_meters
        );

        if (!geofenceResult.allowed) {
          if (geofenceResult.error) {
            toast.error(`Standortfehler: ${geofenceResult.error}`, {
              description: "Bitte aktivieren Sie die Standortfreigabe"
            });
          } else if (geofenceResult.distance) {
            toast.error(
              `Einstempeln nicht möglich`,
              {
                description: `Sie befinden sich ${formatDistance(geofenceResult.distance)} vom Standort "${employee.locations.name}" entfernt. Erlaubter Radius: ${formatDistance(employee.locations.geofence_radius_meters)}`
              }
            );
          } else {
            toast.error("Einstempeln nicht möglich", {
              description: "Sie befinden sich nicht am richtigen Standort"
            });
          }
          setIsProcessing(false);
          isProcessingRef.current = false;
          if (scanMode === 'camera') {
            scanningEnabledRef.current = true;
            setScanningEnabled(true);
            startCamera();
          }
          return;
        }
      }

      const { error } = await supabase
        .from("time_entries")
        .insert({
          employee_id: employee.id,
          check_in: currentTime
        });

      if (error) {
        toast.error("Fehler beim Einstempeln");
        setIsProcessing(false);
        isProcessingRef.current = false;
        if (scanMode === 'camera') {
          scanningEnabledRef.current = true;
          setScanningEnabled(true);
          startCamera();
        }
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
    console.log("Closing confirmation and reloading page...");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8">
      {showVacationScan && (
        <VacationRequest
          onComplete={() => {
            setShowVacationScan(false);
          }}
          onCancel={() => {
            setShowVacationScan(false);
          }}
        />
      )}

      {showConfirmation && confirmationData && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <Card className="w-full max-w-2xl p-12 shadow-2xl">
            <div className="text-center space-y-8">
              <div className={`mx-auto w-40 h-40 rounded-full flex items-center justify-center ${
                confirmationData.type === "in" 
                  ? "bg-green-500/20" 
                  : "bg-red-500/20"
              }`}>
                {confirmationData.type === "in" ? (
                  <LogIn className="h-24 w-24 text-green-600" strokeWidth={2.5} />
                ) : (
                  <LogOut className="h-24 w-24 text-red-600" strokeWidth={2.5} />
                )}
              </div>
              
              <div className="space-y-4">
                <h2 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {confirmationData.employee.first_name} {confirmationData.employee.last_name}
                </h2>
                <p className={`text-4xl font-bold ${
                  confirmationData.type === "in" ? "text-green-600" : "text-red-600"
                }`}>
                  {confirmationData.type === "in" ? "EINGESTEMPELT" : "AUSGESTEMPELT"}
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

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Linke Seite: Kamera/Scanner Hauptbereich */}
          <div className="flex-1 space-y-6">
            <Card className="p-8 shadow-xl">
              <div className="space-y-6">
                <div className="flex gap-2 justify-center flex-wrap">
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
                  {scanMode === 'camera' && availableCameras.length > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCameraFacing(prev => prev === 'back' ? 'front' : 'back');
                        if (isCameraActive) {
                          startCamera();
                        }
                      }}
                      disabled={isProcessing}
                    >
                      <SwitchCamera className="h-4 w-4 mr-2" />
                      {cameraFacing === 'back' ? 'Vorne' : 'Hinten'}
                    </Button>
                  )}
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
                    onClick={() => setShowVacationScan(true)}
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

            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Zeiterfassung Terminal
              </h1>
              <p className="text-lg text-muted-foreground">
                Scannen Sie Ihren QR-Code zum An- oder Abmelden
              </p>
            </div>
          </div>

          {/* Rechte Seite: Anwesende Mitarbeiter */}
          <div className="lg:w-80 xl:w-96 shrink-0">
            <Card className="p-6 shadow-xl sticky top-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Anwesende</h3>
                    <p className="text-sm text-muted-foreground">{checkedInEmployees.length} angemeldet</p>
                  </div>
                </div>

                {checkedInEmployees.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Keine Mitarbeiter angemeldet
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    {checkedInEmployees.map((entry: any) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <LogIn className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {entry.employees.first_name} {entry.employees.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Nr. {entry.employees.employee_number}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-primary">
                            {new Date(entry.check_in).toLocaleTimeString("de-DE", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
