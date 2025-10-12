import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MasterReset = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleMasterReset = async () => {
    if (confirmText !== "ALLES LÖSCHEN") {
      toast.error("Bitte geben Sie 'ALLES LÖSCHEN' ein, um fortzufahren");
      return;
    }

    setIsDeleting(true);

    try {
      // Delete in correct order (child tables first)
      console.log("Starting master reset...");
      
      // Face profiles
      const { error: faceError } = await supabase
        .from("face_profiles")
        .delete()
        .not("id", "is", null);
      if (faceError) throw new Error(`face_profiles: ${faceError.message}`);
      
      // Time entries
      const { error: timeError } = await supabase
        .from("time_entries")
        .delete()
        .not("id", "is", null);
      if (timeError) throw new Error(`time_entries: ${timeError.message}`);
      
      // Vacation requests
      const { error: vacationError } = await supabase
        .from("vacation_requests")
        .delete()
        .not("id", "is", null);
      if (vacationError) throw new Error(`vacation_requests: ${vacationError.message}`);
      
      // Salary advances
      const { error: advanceError } = await supabase
        .from("salary_advances")
        .delete()
        .not("id", "is", null);
      if (advanceError) throw new Error(`salary_advances: ${advanceError.message}`);
      
      // Employees
      const { error: employeeError } = await supabase
        .from("employees")
        .delete()
        .not("id", "is", null);
      if (employeeError) throw new Error(`employees: ${employeeError.message}`);
      
      // Terminals
      const { error: terminalError } = await supabase
        .from("terminals")
        .delete()
        .not("id", "is", null);
      if (terminalError) throw new Error(`terminals: ${terminalError.message}`);
      
      // Locations
      const { error: locationError } = await supabase
        .from("locations")
        .delete()
        .not("id", "is", null);
      if (locationError) throw new Error(`locations: ${locationError.message}`);

      toast.success("Alle Daten wurden erfolgreich gelöscht", {
        duration: 5000
      });
      
      setIsDialogOpen(false);
      setConfirmText("");
      
      // Reload page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Master reset error:", error);
      toast.error(error instanceof Error ? error.message : "Fehler beim Zurücksetzen");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="shadow-lg border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            Gefahrenzone - Master Reset
          </CardTitle>
          <CardDescription>
            Löscht ALLE Daten aus dem System. Diese Aktion kann NICHT rückgängig gemacht werden!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <h3 className="font-semibold text-destructive mb-2">⚠️ Dies löscht unwiderruflich:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Alle Mitarbeiter und ihre Daten</li>
                <li>Alle Gesichtsprofile</li>
                <li>Alle Zeiterfassungen</li>
                <li>Alle Urlaubsanträge</li>
                <li>Alle Gehaltsvorschüsse</li>
                <li>Alle Terminals</li>
                <li>Alle Standorte</li>
              </ul>
            </div>

            <Button
              variant="destructive"
              size="lg"
              onClick={() => setIsDialogOpen(true)}
              className="w-full gap-2"
            >
              <Trash2 className="h-5 w-5" />
              Alle Daten löschen
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              Sind Sie absolut sicher?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="font-semibold">
                Diese Aktion löscht ALLE Daten aus dem System und kann NICHT rückgängig gemacht werden!
              </p>
              
              <div>
                <Label htmlFor="confirm" className="text-foreground">
                  Geben Sie <span className="font-bold">"ALLES LÖSCHEN"</span> ein, um zu bestätigen:
                </Label>
                <Input
                  id="confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="ALLES LÖSCHEN"
                  className="mt-2"
                  disabled={isDeleting}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMasterReset}
              disabled={confirmText !== "ALLES LÖSCHEN" || isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Löscht..." : "Alle Daten löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MasterReset;
