import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInMinutes } from "date-fns";
import { de } from "date-fns/locale";

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
          last_name
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

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Zeiterfassungen</CardTitle>
        <CardDescription>
          Übersicht aller Check-in und Check-out Aktivitäten
        </CardDescription>
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
