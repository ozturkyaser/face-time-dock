import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Printer, X } from "lucide-react";
import { toast } from "sonner";

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  barcode: string;
  department: string | null;
}

interface QRCodePrintProps {
  onClose: () => void;
}

const QRCodePrint = ({ onClose }: QRCodePrintProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map());
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, employee_number, first_name, last_name, barcode, department")
      .eq("is_active", true)
      .not("barcode", "is", null)
      .order("employee_number");

    if (error) {
      console.error("Error loading employees:", error);
      toast.error("Fehler beim Laden der Mitarbeiter");
      return;
    }

    setEmployees(data || []);
    generateQRCodes(data || []);
  };

  const generateQRCodes = async (employeesList: Employee[]) => {
    const codes = new Map<string, string>();
    
    for (const employee of employeesList) {
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(employee.barcode, {
          width: 300,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF"
          }
        });
        codes.set(employee.id, qrCodeDataUrl);
      } catch (error) {
        console.error("Error generating QR code:", error);
      }
    }
    
    setQrCodes(codes);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="no-print sticky top-0 bg-background border-b p-4 flex justify-between items-center shadow-sm z-10">
        <h2 className="text-2xl font-bold">QR-Codes drucken</h2>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Drucken
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div ref={printRef} className="p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2">
          {employees.map((employee) => (
            <Card key={employee.id} className="p-6 break-inside-avoid">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  {qrCodes.get(employee.id) && (
                    <img
                      src={qrCodes.get(employee.id)}
                      alt={`QR Code for ${employee.first_name} ${employee.last_name}`}
                      className="w-48 h-48"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg">
                    {employee.first_name} {employee.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Nr. {employee.employee_number}
                  </p>
                  {employee.department && (
                    <p className="text-xs text-muted-foreground">
                      {employee.department}
                    </p>
                  )}
                  <p className="text-xs font-mono text-muted-foreground mt-2">
                    {employee.barcode}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }
            @page {
              size: A4;
              margin: 1cm;
            }
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        `}
      </style>
    </div>
  );
};

export default QRCodePrint;
