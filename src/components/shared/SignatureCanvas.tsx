import { useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface SignatureCanvasComponentProps {
  onSave: (signature: string) => void;
  label?: string;
}

const SignatureCanvasComponent = ({ onSave, label = "Unterschrift" }: SignatureCanvasComponentProps) => {
  const sigCanvas = useRef<SignatureCanvas>(null);

  const clear = () => {
    sigCanvas.current?.clear();
  };

  const save = () => {
    if (sigCanvas.current?.isEmpty()) {
      return;
    }
    const dataUrl = sigCanvas.current?.toDataURL();
    if (dataUrl) {
      onSave(dataUrl);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="border-2 border-dashed rounded-lg bg-background">
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            className: "w-full h-32 cursor-crosshair",
          }}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear} className="gap-1">
          <X className="h-3 w-3" />
          Löschen
        </Button>
        <Button type="button" size="sm" onClick={save}>
          Unterschrift übernehmen
        </Button>
      </div>
    </div>
  );
};

export default SignatureCanvasComponent;
