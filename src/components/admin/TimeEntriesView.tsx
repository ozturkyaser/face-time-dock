import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInMinutes } from "date-fns";
import { de } from "date-fns/locale";
import { Download } from "lucide-react";

const TimeEntriesView = () => {
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from("time_entries")
      .select(`
        *,
        employees (
          employee_number,
          first_name,
          last_name,
          department,
          position,
          locations (
            name
          )
        )
      `)
      .order("check_in", { ascending: false })
      .limit(50);
    
    if (error) {
      console.error("Error loading entries:", error);
      return;
    }
    setEntries(data || []);
  };

  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return "Aktiv";
    const minutes = differenceInMinutes(new Date(checkOut), new Date(checkIn));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const exportToCSV = () => {
    const csvHeaders = [
      "Mitarbeiternummer",
      "Vorname",
      "Nachname",
      "Abteilung",
      "Position",
      "Standort",
      "Check-in Datum",
      "Check-in Uhrzeit",
      "Check-out Datum",
      "Check-out Uhrzeit",
      "Dauer (Minuten)",
      "Pause (Minuten)",
      "Notizen",
      "Status"
    ].join(",");

    const csvRows = entries.map(entry => {
      const checkIn = new Date(entry.check_in);
      const checkOut = entry.check_out ? new Date(entry.check_out) : null;
      const durationMinutes = checkOut ? differenceInMinutes(checkOut, checkIn) : 0;
      const status = checkOut ? "Abgeschlossen" : "Aktiv";

      return [
        entry.employees?.employee_number || "",
        entry.employees?.first_name || "",
        entry.employees?.last_name || "",
        entry.employees?.department || "",
        entry.employees?.position || "",
        entry.employees?.locations?.name || "",
        format(checkIn, "dd.MM.yyyy", { locale: de }),
        format(checkIn, "HH:mm", { locale: de }),
        checkOut ? format(checkOut, "dd.MM.yyyy", { locale: de }) : "",
        checkOut ? format(checkOut, "HH:mm", { locale: de }) : "",
        durationMinutes.toString(),
        (entry.break_duration_minutes || 0).toString(),
        (entry.notes || "").replace(/,/g, ";"),
        status
      ].join(",");
    });

    const csv = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `zeiterfassungen_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Zeiterfassungen</CardTitle>
            <CardDescription>
              Übersicht aller Check-in und Check-out Aktivitäten
            </CardDescription>
          </div>
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            CSV Exportieren
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mitarbeiter</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Dauer</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">
                  {entry.employees ? (
                    <>
                      {entry.employees.first_name} {entry.employees.last_name}
                      <div className="text-sm text-muted-foreground">
                        {entry.employees.employee_number}
                      </div>
                    </>
                  ) : (
                    "Unbekannt"
                  )}
                </TableCell>
                <TableCell>
                  {format(new Date(entry.check_in), "dd.MM.yyyy HH:mm", { locale: de })}
                </TableCell>
                <TableCell>
                  {entry.check_out ? (
                    format(new Date(entry.check_out), "dd.MM.yyyy HH:mm", { locale: de })
                  ) : (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Nicht ausgestempelt
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {calculateDuration(entry.check_in, entry.check_out)}
                </TableCell>
                <TableCell>
                  {entry.check_out ? (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      Abgeschlossen
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                      Aktiv
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TimeEntriesView;
