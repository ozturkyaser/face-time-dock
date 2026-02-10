import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Save, Calendar, Monitor, RefreshCw, MapPin } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Terminal {
  id: string;
  name: string;
  username: string;
  is_active: boolean;
  is_permanent: boolean;
  geofence_disabled: boolean;
  locations: { name: string };
}

export const SystemSettings = () => {
  const [weekdayHour, setWeekdayHour] = useState("19");
  const [weekdayMinute, setWeekdayMinute] = useState("57");
  const [weekendHour, setWeekendHour] = useState("18");
  const [weekendMinute, setWeekendMinute] = useState("0");
  const [lateHour, setLateHour] = useState("9");
  const [lateMinute, setLateMinute] = useState("10");
  const [isLoading, setIsLoading] = useState(false);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    loadTerminals();
  }, []);

  const loadTerminals = async () => {
    const { data, error } = await supabase
      .from("terminals")
      .select("id, name, username, is_active, is_permanent, geofence_disabled, locations(name)")
      .order("name");

    if (error) {
      console.error("Error loading terminals:", error);
      return;
    }
    setTerminals((data as any) || []);
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['auto_checkout_time', 'auto_checkout_time_weekend', 'late_checkin_time']);

      if (error) throw error;

      data?.forEach(setting => {
        const timeValue = setting.value as { hour: number; minute: number };
        if (setting.key === 'auto_checkout_time') {
          setWeekdayHour(timeValue.hour.toString().padStart(2, '0'));
          setWeekdayMinute(timeValue.minute.toString().padStart(2, '0'));
        } else if (setting.key === 'auto_checkout_time_weekend') {
          setWeekendHour(timeValue.hour.toString().padStart(2, '0'));
          setWeekendMinute(timeValue.minute.toString().padStart(2, '0'));
        } else if (setting.key === 'late_checkin_time') {
          setLateHour(timeValue.hour.toString().padStart(2, '0'));
          setLateMinute(timeValue.minute.toString().padStart(2, '0'));
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

  const handleToggleTerminal = async (terminalId: string, field: 'is_permanent' | 'geofence_disabled', value: boolean) => {
    const { error } = await supabase
      .from("terminals")
      .update({ [field]: value })
      .eq("id", terminalId);

    if (error) {
      toast({
        title: "Fehler",
        description: "Terminal konnte nicht aktualisiert werden",
        variant: "destructive",
      });
      return;
    }

    setTerminals(prev =>
      prev.map(t => t.id === terminalId ? { ...t, [field]: value } : t)
    );
    toast({
      title: "Gespeichert",
      description: "Terminal-Einstellung aktualisiert",
    });
  };

  const handleSave = async () => {
    const wdHour = parseInt(weekdayHour);
    const wdMinute = parseInt(weekdayMinute);
    const weHour = parseInt(weekendHour);
    const weMinute = parseInt(weekendMinute);
    const ltHour = parseInt(lateHour);
    const ltMinute = parseInt(lateMinute);

    if (
      wdHour < 0 || wdHour > 23 || wdMinute < 0 || wdMinute > 59 ||
      weHour < 0 || weHour > 23 || weMinute < 0 || weMinute > 59 ||
      ltHour < 0 || ltHour > 23 || ltMinute < 0 || ltMinute > 59
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
          .update({ value: { hour: wdHour, minute: wdMinute }, updated_at: new Date().toISOString() })
          .eq('key', 'auto_checkout_time'),
        supabase
          .from('system_settings')
          .update({ value: { hour: weHour, minute: weMinute }, updated_at: new Date().toISOString() })
          .eq('key', 'auto_checkout_time_weekend'),
        supabase
          .from('system_settings')
          .update({ value: { hour: ltHour, minute: ltMinute }, updated_at: new Date().toISOString() })
          .eq('key', 'late_checkin_time')
      ];

      const results = await Promise.all(updates);
      
      if (results.some(r => r.error)) {
        throw new Error('Failed to update settings');
      }

      toast({
        title: "Erfolgreich gespeichert",
        description: "Einstellungen erfolgreich aktualisiert",
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

  const handleRestart = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Verbundene Terminals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Verbundene Terminals (Mag-ID)
          </CardTitle>
          <CardDescription>
            Übersicht aller Terminals mit Optionen für dauerhafte Verbindung und Radiusbegrenzung
          </CardDescription>
        </CardHeader>
        <CardContent>
          {terminals.length === 0 ? (
            <p className="text-muted-foreground text-sm">Keine Terminals konfiguriert.</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name / ID</TableHead>
                    <TableHead>Standort</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Dauerhaft</TableHead>
                    <TableHead className="text-center">Keine Radiusbegrenzung</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terminals.map((terminal) => (
                    <TableRow key={terminal.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{terminal.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{terminal.id.slice(0, 8)}...</p>
                        </div>
                      </TableCell>
                      <TableCell>{terminal.locations?.name || "-"}</TableCell>
                      <TableCell>
                        <span className={terminal.is_active ? "text-green-600 font-medium" : "text-red-600"}>
                          {terminal.is_active ? "Aktiv" : "Inaktiv"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={terminal.is_permanent}
                          onCheckedChange={(val) => handleToggleTerminal(terminal.id, 'is_permanent', val)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={terminal.geofence_disabled}
                          onCheckedChange={(val) => handleToggleTerminal(terminal.id, 'geofence_disabled', val)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zeiteinstellungen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Zeiteinstellungen
          </CardTitle>
          <CardDescription>
            Konfigurieren Sie die automatische Abmeldezeit und Verspätungsgrenze
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Wochentage (Mo-Fr)
            </Label>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" max="23" value={weekdayHour}
                onChange={(e) => setWeekdayHour(e.target.value.padStart(2, '0'))}
                className="w-20 text-center" placeholder="HH" />
              <span className="text-lg font-semibold">:</span>
              <Input type="number" min="0" max="59" value={weekdayMinute}
                onChange={(e) => setWeekdayMinute(e.target.value.padStart(2, '0'))}
                className="w-20 text-center" placeholder="MM" />
              <span className="ml-2 text-muted-foreground">Uhr</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Wochenende (Sa-So)
            </Label>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" max="23" value={weekendHour}
                onChange={(e) => setWeekendHour(e.target.value.padStart(2, '0'))}
                className="w-20 text-center" placeholder="HH" />
              <span className="text-lg font-semibold">:</span>
              <Input type="number" min="0" max="59" value={weekendMinute}
                onChange={(e) => setWeekendMinute(e.target.value.padStart(2, '0'))}
                className="w-20 text-center" placeholder="MM" />
              <span className="ml-2 text-muted-foreground">Uhr</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Verspätungsgrenze
            </Label>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" max="23" value={lateHour}
                onChange={(e) => setLateHour(e.target.value.padStart(2, '0'))}
                className="w-20 text-center" placeholder="HH" />
              <span className="text-lg font-semibold">:</span>
              <Input type="number" min="0" max="59" value={lateMinute}
                onChange={(e) => setLateMinute(e.target.value.padStart(2, '0'))}
                className="w-20 text-center" placeholder="MM" />
              <span className="ml-2 text-muted-foreground">Uhr</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Mitarbeiter die nach dieser Zeit einstempeln werden als verspätet markiert
            </p>
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

      {/* Neustart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Applikation
          </CardTitle>
          <CardDescription>
            Seite neu laden und Applikation neustarten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleRestart} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Applikation neustarten
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
