import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
  employeeName?: string;
}

const QRCodeDisplay = ({ value, size = 80, className = "", employeeName }: QRCodeDisplayProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    generateQRCode();
  }, [value]);

  const generateQRCode = async () => {
    try {
      const url = await QRCode.toDataURL(value, {
        width: size * 4, // Higher resolution for download
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF"
        }
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const handleDownload = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `QR-Code-${employeeName || value}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!qrCodeUrl) {
    return <div className={`bg-muted ${className}`} style={{ width: size, height: size }} />;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <img 
        src={qrCodeUrl} 
        alt="QR Code" 
        className={className}
        style={{ width: size, height: size }}
      />
      {employeeName && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="gap-2"
        >
          <Download className="h-3 w-3" />
          Download
        </Button>
      )}
    </div>
  );
};

export default QRCodeDisplay;
