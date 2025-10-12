import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInMinutes } from "date-fns";
import { de } from "date-fns/locale";
import { Clock } from "lucide-react";

interface EmployeeTimeEntriesProps {
  employeeId: string;
}

const EmployeeTimeEntries = ({ employeeId }: EmployeeTimeEntriesProps) => {
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    loadEntries();
  }, [employeeId]);

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from("time_entries")
      .select("*")
      .eq("employee_id", employeeId)
      .order("check_in", { ascending: false })
      .limit(30);
    
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
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Meine Zeiterfassungen</CardTitle>
            <CardDescription>Übersicht Ihrer Check-in und Check-out Zeiten</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Dauer</TableHead>
              <TableHead>Pause</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Keine Zeiterfassungen vorhanden
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
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
                    {entry.break_duration_minutes || 0} Min
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
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default EmployeeTimeEntries;
