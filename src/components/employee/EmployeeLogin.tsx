import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "lucide-react";

interface EmployeeLoginProps {
  onLoginSuccess: (employee: any) => void;
}

const EmployeeLogin = ({ onLoginSuccess }: EmployeeLoginProps) => {
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeNumber || !pin) {
      toast.error("Bitte Mitarbeiternummer und PIN eingeben");
      return;
    }

    setIsLoading(true);

    try {
      const pinHash = await hashPin(pin);

      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("employee_number", employeeNumber)
        .eq("pin_hash", pinHash)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        toast.error("Ungültige Mitarbeiternummer oder PIN");
        setIsLoading(false);
        return;
      }

      toast.success(`Willkommen ${data.first_name}!`);
      onLoginSuccess(data);
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Fehler beim Anmelden");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">Mitarbeiter Portal</CardTitle>
          <CardDescription>
            Melden Sie sich mit Ihrer Mitarbeiternummer und PIN an
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeNumber">Mitarbeiternummer</Label>
              <Input
                id="employeeNumber"
                type="text"
                placeholder="z.B. 001"
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={isLoading}
                maxLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Anmelden..." : "Anmelden"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeLogin;
