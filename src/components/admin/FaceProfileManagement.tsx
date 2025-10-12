import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, User, AlertCircle, CheckCircle } from "lucide-react";
import FaceReRegistration from "./FaceReRegistration";

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  department: string;
  is_active: boolean;
  face_profiles: {
    id: string;
    created_at: string;
    updated_at: string;
  } | null;
}

const FaceProfileManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showReRegistration, setShowReRegistration] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .select(`
        *,
        face_profiles (
          id,
          created_at,
          updated_at
        )
      `)
      .eq("is_active", true)
      .order("employee_number");

    if (error) {
      console.error("Fehler beim Laden:", error);
      toast.error("Fehler beim Laden der Mitarbeiter");
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  const handleReRegister = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowReRegistration(true);
  };

  const handleComplete = () => {
    setShowReRegistration(false);
    setSelectedEmployee(null);
    loadEmployees();
  };

  const employeesWithFaces = employees.filter(e => e.face_profiles).length;
  const employeesWithoutFaces = employees.length - employeesWithFaces;

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Camera className="h-6 w-6 text-primary" />
                Gesichtsverwaltung
              </CardTitle>
              <CardDescription className="mt-2">
                Verwalten Sie Gesichtsprofile für Mitarbeiter
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-success/10">
                <CheckCircle className="h-3 w-3 mr-1" />
                {employeesWithFaces} mit Profil
              </Badge>
              {employeesWithoutFaces > 0 && (
                <Badge variant="outline" className="bg-destructive/10">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {employeesWithoutFaces} ohne Profil
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {employees.length === 0 && !loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine aktiven Mitarbeiter gefunden
            </div>
          ) : (
            <div className="space-y-3">
              {employees.map((employee) => (
                <Card key={employee.id} className="bg-card/50">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 rounded-full p-3">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">
                            {employee.first_name} {employee.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Nr. {employee.employee_number}
                            {employee.department && ` • ${employee.department}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {employee.face_profiles ? (
                          <Badge variant="outline" className="bg-success/10">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Registriert
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Nicht registriert
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReRegister(employee)}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          {employee.face_profiles ? "Neu registrieren" : "Registrieren"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showReRegistration && selectedEmployee && (
        <FaceReRegistration
          employee={selectedEmployee}
          onComplete={handleComplete}
          onCancel={() => {
            setShowReRegistration(false);
            setSelectedEmployee(null);
          }}
        />
      )}
    </>
  );
};

export default FaceProfileManagement;
