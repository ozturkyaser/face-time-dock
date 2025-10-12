import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock } from "lucide-react";

interface TerminalLoginProps {
  onLoginSuccess: (terminalId: string, locationId: string, locationName: string) => void;
}

export const TerminalLogin = ({ onLoginSuccess }: TerminalLoginProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const passwordHash = await hashPassword(password);

      const { data, error } = await supabase
        .from("terminals")
        .select("*, locations(name)")
        .eq("username", username)
        .eq("password_hash", passwordHash)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast.error("Ungültige Anmeldedaten");
        setIsLoading(false);
        return;
      }

      toast.success(`Angemeldet als ${data.name}`);
      onLoginSuccess(data.id, data.location_id, data.locations.name);
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Fehler bei der Anmeldung");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-8">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center space-y-2 mb-8">
          <div className="flex justify-center mb-4">
            <Lock className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Terminal Anmeldung
          </h1>
          <p className="text-muted-foreground">
            Bitte melden Sie sich mit Ihren Terminal-Zugangsdaten an
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Benutzername</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={isLoading}
          >
            {isLoading ? "Anmelden..." : "Anmelden"}
          </Button>
        </form>
      </Card>
    </div>
  );
};