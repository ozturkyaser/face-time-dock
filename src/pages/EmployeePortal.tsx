import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import EmployeeLogin from "@/components/employee/EmployeeLogin";
import EmployeeTimeEntries from "@/components/employee/EmployeeTimeEntries";
import EmployeeVacations from "@/components/employee/EmployeeVacations";
import EmployeeAdvances from "@/components/employee/EmployeeAdvances";
import VacationRequestForm from "@/components/employee/VacationRequestForm";
import AdvanceRequestForm from "@/components/employee/AdvanceRequestForm";
import { LogOut, User, Clock, Calendar, DollarSign } from "lucide-react";

const EmployeePortal = () => {
  const [employee, setEmployee] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLogout = () => {
    setEmployee(null);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (!employee) {
    return <EmployeeLogin onLoginSuccess={setEmployee} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Mitarbeiter Portal
            </h1>
            <p className="text-muted-foreground mt-2">
              Willkommen {employee.first_name} {employee.last_name}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2 shadow-md"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mitarbeiter</CardTitle>
              <User className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employee.employee_number}</div>
              <p className="text-xs text-muted-foreground">
                {employee.position || "Position nicht angegeben"}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abteilung</CardTitle>
              <User className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {employee.department || "-"}
              </div>
              <p className="text-xs text-muted-foreground">
                Ihre Abteilung
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urlaubstage</CardTitle>
              <Calendar className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(employee.vacation_days_total || 30) - (employee.vacation_days_used || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                von {employee.vacation_days_total || 30} Tagen verfügbar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {employee.vacation_days_used || 0} Tage verbraucht
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <EmployeeTimeEntries employeeId={employee.id} key={`time-${refreshKey}`} />
          
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="flex gap-2">
                <VacationRequestForm employeeId={employee.id} onSuccess={handleRefresh} />
              </div>
              <EmployeeVacations employeeId={employee.id} key={`vacation-${refreshKey}`} />
            </div>
            
            <div className="space-y-6">
              <div className="flex gap-2">
                <AdvanceRequestForm employeeId={employee.id} onSuccess={handleRefresh} />
              </div>
              <EmployeeAdvances employeeId={employee.id} key={`advance-${refreshKey}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeePortal;
