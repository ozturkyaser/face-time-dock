import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInMinutes, subDays, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { de } from "date-fns/locale";
import { Download, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TimeEntriesView = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<string>("month");

  useEffect(() => {
    loadEntries();
  }, [timeFilter]);

  const getDateRange = () => {
    const now = new Date();
    switch (timeFilter) {
      case "week":
        return {
          start: startOfWeek(now, { locale: de }),
          end: endOfWeek(now, { locale: de })
        };
      case "month":
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case "90days":
        return {
          start: subDays(now, 90),
          end: now
        };
      case "year":
        return {
          start: startOfYear(now),
          end: endOfYear(now)
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
    }
  };

  const loadEntries = async () => {
    const { start, end } = getDateRange();
    
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
      .gte("check_in", start.toISOString())
      .lte("check_in", end.toISOString())
      .order("check_in", { ascending: false });
    
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

  const getFilterLabel = () => {
    switch (timeFilter) {
      case "week":
        return "Woche";
      case "month":
        return "Monat";
      case "90days":
        return "90-Tage";
      case "year":
        return "Jahr";
      default:
        return "Monat";
    }
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
    
    const filterLabel = getFilterLabel();
    link.setAttribute("href", url);
    link.setAttribute("download", `zeiterfassungen_${filterLabel}_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`);
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Diese Woche</SelectItem>
                  <SelectItem value="month">Dieser Monat</SelectItem>
                  <SelectItem value="90days">Letzte 90 Tage</SelectItem>
                  <SelectItem value="year">Dieses Jahr</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              CSV Exportieren
            </Button>
          </div>
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
