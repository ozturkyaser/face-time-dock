import { useState, useRef, useEffect } from "react";
import { Calendar, Camera, CheckCircle, AlertCircle, Scan, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

interface VacationRequestProps {
  onComplete: () => void;
  onCancel: () => void;
}

const VacationRequest = ({ onComplete, onCancel }: VacationRequestProps) => {
  const [step, setStep] = useState<"scan" | "form">("scan");
  const [employee, setEmployee] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [barcode, setBarcode] = useState("");
  const [scanMode, setScanMode] = useState<'input' | 'camera'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    request_type: "vacation",
    notes: ""
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const codeReaderRef = useRef<any>(null);

  useEffect(() => {
    loadEmployees();
    if (step === "scan" && scanMode === 'camera') {
      startCameraForScan();
    }
    return () => stopCameraForScan();
  }, [step, scanMode]);

  const loadEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("is_active", true);
    setEmployees(data || []);
  };

  const startCameraForScan = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { BrowserMultiFormatReader } = await import('@zxing/library');
      const codeReader = new BrowserMultiFormatReader();
      
      const hints = new Map();
      const { DecodeHintType, BarcodeFormat } = await import('@zxing/library');
      
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      codeReader.hints = hints;
      codeReaderRef.current = codeReader;

      const videoInputDevices = await codeReader.listVideoInputDevices();
      if (videoInputDevices.length === 0) {
        toast.error("Keine Kamera gefunden");
        return;
      }

      const selectedDeviceId = videoInputDevices[0].deviceId;

      await codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current!,
        (result) => {
          if (result && !isProcessing) {
            handleBarcodeSubmit(result.getText());
          }
        }
      );
      
      setIsCameraActive(true);
    } catch (error: any) {
      console.error("Camera error:", error);
      toast.error("Kamera konnte nicht gestartet werden");
    }
  };

  const stopCameraForScan = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (error) {
        console.error("Error resetting camera:", error);
      }
      codeReaderRef.current = null;
    }
    
    setIsCameraActive(false);
  };

  const handleBarcodeSubmit = async (scannedBarcode: string) => {
    if (!scannedBarcode.trim() || isProcessing) return;

    setIsProcessing(true);
    stopCameraForScan();

    try {
      const { data: employee, error } = await supabase
        .from("employees")
        .select("*")
        .eq("barcode", scannedBarcode)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !employee) {
        toast.error("Barcode nicht erkannt", {
          icon: <AlertCircle className="h-5 w-5 text-destructive" />,
          description: "Kein aktiver Mitarbeiter mit diesem Barcode gefunden"
        });
        setIsProcessing(false);
        setBarcode("");
        if (scanMode === 'camera') {
          startCameraForScan();
        }
        return;
      }

      setEmployee(employee);
      setStep("form");
      setIsProcessing(false);
      toast.success(`Willkommen ${employee.first_name} ${employee.last_name}!`);
    } catch (error) {
      console.error("Error during barcode authentication:", error);
      toast.error("Fehler bei der Anmeldung");
      setIsProcessing(false);
      setBarcode("");
      if (scanMode === 'camera') {
        startCameraForScan();
      }
    }
  };

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const days = differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1;
    return days > 0 ? days : 0;
  };

  const handleSubmit = async () => {
    if (!employee || !formData.start_date || !formData.end_date) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }

    const totalDays = calculateDays();
    if (totalDays <= 0) {
      toast.error("Enddatum muss nach Startdatum liegen");
      return;
    }

    setIsProcessing(true);

    const { error } = await supabase
      .from("vacation_requests")
      .insert({
        employee_id: employee.id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        total_days: totalDays,
        request_type: formData.request_type,
        notes: formData.notes,
        status: "pending"
      });

    setIsProcessing(false);

    if (error) {
      console.error("Fehler beim Speichern:", error);
      toast.error("Fehler beim Erstellen des Urlaubsantrags");
      return;
    }

    toast.success(
      "Urlaubsantrag erfolgreich eingereicht!",
      {
        icon: <CheckCircle className="h-5 w-5 text-success" />,
        description: `${totalDays} Tage vom ${new Date(formData.start_date).toLocaleDateString("de-DE")} bis ${new Date(formData.end_date).toLocaleDateString("de-DE")}`
      }
    );

    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl shadow-2xl my-4 max-h-[95vh] overflow-y-auto">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Urlaubsantrag
          </CardTitle>
          <CardDescription className="text-sm">
            {step === "scan" 
              ? "Scannen Sie Ihren QR-Code" 
              : "Geben Sie die Urlaubsdaten ein"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "scan" ? (
            <div className="space-y-4">
              <div className="flex gap-2 justify-center">
                <Button
                  variant={scanMode === 'camera' ? 'default' : 'outline'}
                  onClick={() => {
                    setScanMode('camera');
                    if (!isCameraActive) {
                      startCameraForScan();
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
                    stopCameraForScan();
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
                    className="w-full h-14 text-center text-xl font-mono"
                    placeholder="QR-Code wird hier angezeigt..."
                    disabled={isProcessing}
                    autoFocus
                  />
                  <p className="text-xs text-center text-muted-foreground">
                    Der Scanner fügt den Code automatisch ein
                  </p>
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
                    {!isCameraActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <p className="text-muted-foreground">Kamera wird gestartet...</p>
                      </div>
                    )}
                    {isCameraActive && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-32 border-4 border-primary rounded-lg">
                          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Halten Sie den QR-Code zentral vor die Kamera
                  </p>
                </div>
              )}

              {isProcessing && (
                <div className="text-center">
                  <Clock className="h-10 w-10 animate-spin mx-auto text-primary" />
                  <p className="mt-2 text-sm">Wird verarbeitet...</p>
                </div>
              )}

              <Button
                variant="outline"
                size="lg"
                onClick={onCancel}
                className="w-full h-12"
              >
                Abbrechen
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {employee && (
                <Card className="bg-primary/10 border-primary/20">
                  <CardContent className="py-3 sm:py-4">
                    <div className="text-center space-y-1">
                      <p className="text-xs text-muted-foreground">Antrag von:</p>
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

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="request_type" className="text-sm">Art des Antrags *</Label>
                  <Select
                    value={formData.request_type}
                    onValueChange={(value) => setFormData({ ...formData, request_type: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">Urlaub</SelectItem>
                      <SelectItem value="sick_leave">Krankheit</SelectItem>
                      <SelectItem value="personal">Persönlich</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="start_date" className="text-sm">Von *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date" className="text-sm">Bis *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="h-11"
                    />
                  </div>
                </div>

                {formData.start_date && formData.end_date && (
                  <Card className="bg-accent/10 border-accent/20">
                    <CardContent className="py-3">
                      <p className="text-center">
                        <span className="font-semibold text-xl text-accent">
                          {calculateDays()}
                        </span>
                        {" "}Tage
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm">Notizen</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onCancel}
                  className="flex-1 h-12"
                >
                  Abbrechen
                </Button>
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="flex-1 h-12 bg-gradient-to-r from-success to-success/80"
                >
                  {isProcessing ? "Wird eingereicht..." : "Einreichen"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VacationRequest;
