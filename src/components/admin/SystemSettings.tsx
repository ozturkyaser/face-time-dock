import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Save, Calendar } from "lucide-react";

export const SystemSettings = () => {
  const [weekdayHour, setWeekdayHour] = useState("19");
  const [weekdayMinute, setWeekdayMinute] = useState("57");
  const [weekendHour, setWeekendHour] = useState("18");
  const [weekendMinute, setWeekendMinute] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['auto_checkout_time', 'auto_checkout_time_weekend']);

      if (error) throw error;

      data?.forEach(setting => {
        const timeValue = setting.value as { hour: number; minute: number };
        if (setting.key === 'auto_checkout_time') {
          setWeekdayHour(timeValue.hour.toString().padStart(2, '0'));
          setWeekdayMinute(timeValue.minute.toString().padStart(2, '0'));
        } else if (setting.key === 'auto_checkout_time_weekend') {
          setWeekendHour(timeValue.hour.toString().padStart(2, '0'));
          setWeekendMinute(timeValue.minute.toString().padStart(2, '0'));
        }
      });
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
    const wdHour = parseInt(weekdayHour);
    const wdMinute = parseInt(weekdayMinute);
    const weHour = parseInt(weekendHour);
    const weMinute = parseInt(weekendMinute);

    if (
      wdHour < 0 || wdHour > 23 || wdMinute < 0 || wdMinute > 59 ||
      weHour < 0 || weHour > 23 || weMinute < 0 || weMinute > 59
    ) {
      toast({
        title: "Ungültige Zeit",
        description: "Bitte geben Sie eine gültige Zeit ein (Stunde: 0-23, Minute: 0-59)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const updates = [
        supabase
          .from('system_settings')
          .update({
            value: { hour: wdHour, minute: wdMinute },
            updated_at: new Date().toISOString()
          })
          .eq('key', 'auto_checkout_time'),
        supabase
          .from('system_settings')
          .update({
            value: { hour: weHour, minute: weMinute },
            updated_at: new Date().toISOString()
          })
          .eq('key', 'auto_checkout_time_weekend')
      ];

      const results = await Promise.all(updates);
      
      if (results.some(r => r.error)) {
        throw new Error('Failed to update settings');
      }

      toast({
        title: "Erfolgreich gespeichert",
        description: `Abmeldezeiten: Wochentag ${weekdayHour}:${weekdayMinute} Uhr, Wochenende ${weekendHour}:${weekendMinute} Uhr`,
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
          Konfigurieren Sie die automatische Abmeldezeit für Wochentage und Wochenenden
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Wochentage (Mo-Fr)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="23"
              value={weekdayHour}
              onChange={(e) => setWeekdayHour(e.target.value.padStart(2, '0'))}
              className="w-20 text-center"
              placeholder="HH"
            />
            <span className="text-lg font-semibold">:</span>
            <Input
              type="number"
              min="0"
              max="59"
              value={weekdayMinute}
              onChange={(e) => setWeekdayMinute(e.target.value.padStart(2, '0'))}
              className="w-20 text-center"
              placeholder="MM"
            />
            <span className="ml-2 text-muted-foreground">Uhr</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Wochenende (Sa-So)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="23"
              value={weekendHour}
              onChange={(e) => setWeekendHour(e.target.value.padStart(2, '0'))}
              className="w-20 text-center"
              placeholder="HH"
            />
            <span className="text-lg font-semibold">:</span>
            <Input
              type="number"
              min="0"
              max="59"
              value={weekendMinute}
              onChange={(e) => setWeekendMinute(e.target.value.padStart(2, '0'))}
              className="w-20 text-center"
              placeholder="MM"
            />
            <span className="ml-2 text-muted-foreground">Uhr</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Alle nicht abgemeldeten Mitarbeiter werden automatisch zur konfigurierten Zeit abgemeldet (Berliner Zeit).
        </p>

        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          Speichern
        </Button>
      </CardContent>
    </Card>
  );
};
