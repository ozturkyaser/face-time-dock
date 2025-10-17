import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

const QRCodeDisplay = ({ value, size = 80, className = "" }: QRCodeDisplayProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    generateQRCode();
  }, [value]);

  const generateQRCode = async () => {
    try {
      const url = await QRCode.toDataURL(value, {
        width: size,
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

  if (!qrCodeUrl) {
    return <div className={`bg-muted ${className}`} style={{ width: size, height: size }} />;
  }

  return (
    <img 
      src={qrCodeUrl} 
      alt="QR Code" 
      className={className}
      style={{ width: size, height: size }}
    />
  );
};

export default QRCodeDisplay;
