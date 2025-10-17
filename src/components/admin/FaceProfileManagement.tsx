import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Scan, User, AlertCircle, CheckCircle, Camera } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/library";
import QRCodeDisplay from "./QRCodeDisplay";

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  department: string;
  is_active: boolean;
  barcode: string | null;
}

const BarcodeManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanMode, setScanMode] = useState<'input' | 'camera'>('input');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("is_active", true)
      .order("employee_number");

    if (error) {
      console.error("Fehler beim Laden:", error);
      toast.error("Fehler beim Laden der Mitarbeiter");
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  const startCamera = async () => {
    try {
      // Request camera with high resolution
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      // Stop the permission stream immediately
      stream.getTracks().forEach(track => track.stop());

      setIsCameraActive(true);
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
            setBarcodeInput(scannedCode);
            stopCamera();
            setScanMode('input');
            toast.success("Barcode erkannt");
          }
          // Only log non-NotFoundException errors
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

  const handleAssignBarcode = (employee: Employee) => {
    setSelectedEmployee(employee);
    setBarcodeInput(employee.barcode || "");
    setScanMode('input');
    stopCamera();
    setShowBarcodeDialog(true);
  };

  const handleSaveBarcode = async () => {
    if (!selectedEmployee) {
      toast.error("Kein Mitarbeiter ausgewählt");
      return;
    }

    if (!barcodeInput.trim()) {
      toast.error("Bitte geben Sie einen Barcode ein");
      return;
    }

    console.log("Saving barcode:", barcodeInput, "for employee:", selectedEmployee.id);

    try {
      const { data, error } = await supabase
        .from("employees")
        .update({ barcode: barcodeInput.trim() })
        .eq("id", selectedEmployee.id)
        .select();

      if (error) {
        console.error("Barcode save error:", error);
        toast.error("Fehler beim Speichern des Barcodes", {
          description: error.message
        });
        return;
      }

      console.log("Barcode saved successfully:", data);
      toast.success("Barcode erfolgreich gespeichert");
      stopCamera();
      setShowBarcodeDialog(false);
      setSelectedEmployee(null);
      setBarcodeInput("");
      setScanMode('input');
      loadEmployees();
    } catch (error: any) {
      console.error("Unexpected error saving barcode:", error);
      toast.error("Unerwarteter Fehler beim Speichern");
    }
  };

  const employeesWithBarcodes = employees.filter(e => e.barcode).length;
  const employeesWithoutBarcodes = employees.length - employeesWithBarcodes;

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Scan className="h-6 w-6 text-primary" />
                QR-Code-Verwaltung
              </CardTitle>
              <CardDescription className="mt-2">
                Verwalten Sie QR-Codes für Mitarbeiter - automatisch generiert beim Erstellen
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-success/10">
                <CheckCircle className="h-3 w-3 mr-1" />
                {employeesWithBarcodes} mit QR-Code
              </Badge>
              {employeesWithoutBarcodes > 0 && (
                <Badge variant="outline" className="bg-destructive/10">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {employeesWithoutBarcodes} ohne QR-Code
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {employees.length === 0 && !loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine aktiven Mitarbeiter gefunden
            </div>
          ) : (
            <div className="space-y-3">
              {employees.map((employee) => (
                <Card key={employee.id} className="bg-card/50">
                  <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {employee.barcode ? (
                          <QRCodeDisplay value={employee.barcode} size={60} className="rounded" />
                        ) : (
                          <div className="bg-primary/10 rounded-full p-3">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">
                            {employee.first_name} {employee.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Nr. {employee.employee_number}
                            {employee.department && ` • ${employee.department}`}
                          </p>
                          {employee.barcode && (
                            <p className="text-xs text-muted-foreground font-mono">
                              Code: {employee.barcode}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {employee.barcode ? (
                          <Badge variant="outline" className="bg-success/10">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            QR-Code zugewiesen
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Kein QR-Code
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignBarcode(employee)}
                        >
                          <Scan className="h-4 w-4 mr-2" />
                          {employee.barcode ? "QR-Code ändern" : "QR-Code zuweisen"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showBarcodeDialog} onOpenChange={(open) => {
        setShowBarcodeDialog(open);
        if (!open) {
          stopCamera();
          setSelectedEmployee(null);
          setBarcodeInput("");
          setScanMode('input');
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>QR-Code zuweisen</DialogTitle>
            <DialogDescription>
              {scanMode === 'camera' 
                ? 'Halten Sie den QR-Code vor die Kamera' 
                : 'Scannen Sie den QR-Code oder geben Sie den Code manuell ein'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 justify-center">
              <Button
                variant={scanMode === 'input' ? 'default' : 'outline'}
                onClick={() => {
                  setScanMode('input');
                  stopCamera();
                }}
                size="sm"
              >
                <Scan className="h-4 w-4 mr-2" />
                Manuell / Scanner
              </Button>
              <Button
                variant={scanMode === 'camera' ? 'default' : 'outline'}
                onClick={() => {
                  setScanMode('camera');
                  if (!isCameraActive) {
                    startCamera();
                  }
                }}
                size="sm"
              >
                <Camera className="h-4 w-4 mr-2" />
                Kamera
              </Button>
            </div>

            {scanMode === 'input' ? (
              <div className="space-y-2">
                <Label htmlFor="barcode">QR-Code</Label>
                <Input
                  id="barcode"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="QR-Code scannen oder eingeben..."
                  autoFocus
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Kamera-Scan</Label>
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
                      <div className="w-48 h-48 border-4 border-primary rounded-lg shadow-lg">
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

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  stopCamera();
                  setShowBarcodeDialog(false);
                  setSelectedEmployee(null);
                  setBarcodeInput("");
                  setScanMode('input');
                }}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSaveBarcode}
                className="flex-1"
                disabled={!barcodeInput.trim()}
              >
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BarcodeManagement;
