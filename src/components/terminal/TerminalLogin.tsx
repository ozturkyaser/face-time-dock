import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { checkGeofence, formatDistance } from "@/utils/geolocation";

interface TerminalLoginProps {
  onLoginSuccess: (terminalId: string, locationId: string, locationName: string) => void;
}

export const TerminalLogin = ({ onLoginSuccess }: TerminalLoginProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use Edge Function to verify terminal credentials
      const { data, error } = await supabase.functions.invoke('verify-terminal-password', {
        body: { username, password }
      });

      if (error) {
        console.error("Login error:", error);
        toast.error("Anmeldefehler");
        setIsLoading(false);
        return;
      }

      if (!data?.valid || !data?.terminal) {
        toast.error("Ungültige Anmeldedaten");
        setIsLoading(false);
        return;
      }

      const terminal = data.terminal;

      // Fetch location details for geofence check
      const { data: locationData } = await supabase
        .from('locations')
        .select('latitude, longitude, geofence_radius_meters')
        .eq('id', terminal.location_id)
        .single();

      // Check geofence
      const geofenceCheck = await checkGeofence(
        locationData?.latitude || null,
        locationData?.longitude || null,
        locationData?.geofence_radius_meters || null
      );
      
      if (!geofenceCheck.allowed) {
        const distance = geofenceCheck.distance || 0;
        const formattedDistance = formatDistance(distance);
        toast.error(
          `Sie sind außerhalb des erlaubten Bereichs (${formattedDistance} entfernt)`,
          { duration: 5000 }
        );
        setIsLoading(false);
        return;
      }

      toast.success("Erfolgreich angemeldet");
      onLoginSuccess(terminal.id, terminal.location_id, terminal.location_name);
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Anmeldefehler");
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