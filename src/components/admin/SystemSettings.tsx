import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Save } from "lucide-react";

export const SystemSettings = () => {
  const [autoCheckoutHour, setAutoCheckoutHour] = useState("19");
  const [autoCheckoutMinute, setAutoCheckoutMinute] = useState("57");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'auto_checkout_time')
        .single();

      if (error) throw error;

      if (data?.value) {
        const timeValue = data.value as { hour: number; minute: number };
        setAutoCheckoutHour(timeValue.hour.toString().padStart(2, '0'));
        setAutoCheckoutMinute(timeValue.minute.toString().padStart(2, '0'));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht geladen werden",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    const hour = parseInt(autoCheckoutHour);
    const minute = parseInt(autoCheckoutMinute);

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      toast({
        title: "Ungültige Zeit",
        description: "Bitte geben Sie eine gültige Zeit ein (Stunde: 0-23, Minute: 0-59)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          value: { hour, minute },
          updated_at: new Date().toISOString()
        })
        .eq('key', 'auto_checkout_time');

      if (error) throw error;

      toast({
        title: "Erfolgreich gespeichert",
        description: `Automatische Abmeldezeit auf ${autoCheckoutHour}:${autoCheckoutMinute} Uhr gesetzt`,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Systemeinstellungen
        </CardTitle>
        <CardDescription>
          Konfigurieren Sie die automatische Abmeldezeit für alle Mitarbeiter
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Automatische Abmeldezeit</Label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="0"
                max="23"
                value={autoCheckoutHour}
                onChange={(e) => setAutoCheckoutHour(e.target.value.padStart(2, '0'))}
                className="w-20 text-center"
                placeholder="HH"
              />
              <span className="text-lg font-semibold">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={autoCheckoutMinute}
                onChange={(e) => setAutoCheckoutMinute(e.target.value.padStart(2, '0'))}
                className="w-20 text-center"
                placeholder="MM"
              />
              <span className="ml-2 text-muted-foreground">Uhr</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Alle nicht abgemeldeten Mitarbeiter werden automatisch zu dieser Zeit abgemeldet (Berliner Zeit).
          </p>
        </div>
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          Speichern
        </Button>
      </CardContent>
    </Card>
  );
};
