import { useState, useEffect } from "react";
import { Users, Clock, Calendar, DollarSign, LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import EmployeeManagement from "@/components/admin/EmployeeManagement";
import TimeEntriesView from "@/components/admin/TimeEntriesView";
import VacationManagement from "@/components/admin/VacationManagement";
import SalaryAdvances from "@/components/admin/SalaryAdvances";

const Admin = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    todayEntries: 0,
    pendingVacations: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [employeesRes, entriesRes, vacationsRes] = await Promise.all([
      supabase.from("employees").select("id, is_active", { count: "exact" }),
      supabase.from("time_entries").select("id", { count: "exact" })
        .gte("check_in", new Date().toISOString().split('T')[0]),
      supabase.from("vacation_requests").select("id", { count: "exact" })
        .eq("status", "pending")
    ]);

    setStats({
      totalEmployees: employeesRes.count || 0,
      activeEmployees: employeesRes.data?.filter(e => e.is_active).length || 0,
      todayEntries: entriesRes.count || 0,
      pendingVacations: vacationsRes.count || 0
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Verwaltung und Übersicht des Zeiterfassungssystems
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.href = "/"}
            className="shadow-md"
          >
            Zum Terminal
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mitarbeiter</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeEmployees} aktiv
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Heute Einträge</CardTitle>
              <Clock className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.todayEntries}</div>
              <p className="text-xs text-muted-foreground">
                Zeiterfassungen heute
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urlaubsanträge</CardTitle>
              <Calendar className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingVacations}</div>
              <p className="text-xs text-muted-foreground">
                Warten auf Genehmigung
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System</CardTitle>
              <LayoutDashboard className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">✓</div>
              <p className="text-xs text-muted-foreground">
                Alle Systeme aktiv
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="employees" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="employees" className="gap-2">
              <Users className="h-4 w-4" />
              Mitarbeiter
            </TabsTrigger>
            <TabsTrigger value="time" className="gap-2">
              <Clock className="h-4 w-4" />
              Zeiterfassung
            </TabsTrigger>
            <TabsTrigger value="vacation" className="gap-2">
              <Calendar className="h-4 w-4" />
              Urlaub
            </TabsTrigger>
            <TabsTrigger value="advances" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Vorschüsse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="space-y-4">
            <EmployeeManagement onUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="time" className="space-y-4">
            <TimeEntriesView />
          </TabsContent>

          <TabsContent value="vacation" className="space-y-4">
            <VacationManagement onUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="advances" className="space-y-4">
            <SalaryAdvances />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
