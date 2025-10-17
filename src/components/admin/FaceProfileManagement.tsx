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
    if (!selectedEmployee) return;

    const { error } = await supabase
      .from("employees")
      .update({ barcode: barcodeInput || null })
      .eq("id", selectedEmployee.id);

    if (error) {
      toast.error("Fehler beim Speichern des Barcodes");
      return;
    }

    toast.success("Barcode erfolgreich gespeichert");
    setShowBarcodeDialog(false);
    setSelectedEmployee(null);
    setBarcodeInput("");
    loadEmployees();
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
                Barcode-Verwaltung
              </CardTitle>
              <CardDescription className="mt-2">
                Verwalten Sie Barcodes für Mitarbeiter
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-success/10">
                <CheckCircle className="h-3 w-3 mr-1" />
                {employeesWithBarcodes} mit Barcode
              </Badge>
              {employeesWithoutBarcodes > 0 && (
                <Badge variant="outline" className="bg-destructive/10">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {employeesWithoutBarcodes} ohne Barcode
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
                        <div className="bg-primary/10 rounded-full p-3">
                          <User className="h-5 w-5 text-primary" />
                        </div>
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
                              Barcode: {employee.barcode}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {employee.barcode ? (
                          <Badge variant="outline" className="bg-success/10">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Barcode zugewiesen
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Kein Barcode
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignBarcode(employee)}
                        >
                          <Scan className="h-4 w-4 mr-2" />
                          {employee.barcode ? "Barcode ändern" : "Barcode zuweisen"}
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
            <DialogTitle>Barcode zuweisen</DialogTitle>
            <DialogDescription>
              {scanMode === 'camera' 
                ? 'Halten Sie den Barcode vor die Kamera' 
                : 'Scannen Sie den Barcode oder geben Sie ihn manuell ein'}
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
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Barcode scannen oder eingeben..."
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
                </div>
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
