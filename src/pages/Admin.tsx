import { useState, useEffect } from "react";
import { Users, Clock, Calendar, DollarSign, LayoutDashboard, Camera, Trash2, ShieldCheck, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import EmployeeManagement from "@/components/admin/EmployeeManagement";
import { LocationManagement } from "@/components/admin/LocationManagement";
import { TerminalManagement } from "@/components/admin/TerminalManagement";
import TimeEntriesView from "@/components/admin/TimeEntriesView";
import VacationManagement from "@/components/admin/VacationManagement";
import SalaryAdvances from "@/components/admin/SalaryAdvances";
import ManualTimeTracking from "@/components/admin/ManualTimeTracking";
import FaceProfileManagement from "@/components/admin/FaceProfileManagement";
import MasterReset from "@/components/admin/MasterReset";
import EmployeeTimeDetails from "@/components/admin/EmployeeTimeDetails";
import UserManagement from "@/components/admin/UserManagement";

const Admin = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    todayEntries: 0,
    pendingVacations: 0
  });
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('Checking auth...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        navigate("/auth");
        return;
      }
      
      if (!session) {
        console.log('No session found');
        navigate("/auth");
        return;
      }

      console.log('Session found, loading user roles for:', session.user.id);
      
      // Load user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      console.log('Roles query result:', { roles, rolesError });

      if (rolesError) {
        console.error('Error loading roles:', rolesError);
        navigate("/auth");
        return;
      }

      const userRolesList = roles?.map(r => r.role) || [];
      setUserRoles(userRolesList);
      console.log('User roles:', userRolesList);
      
      if (userRolesList.length === 0) {
        console.log('No roles found for user');
        navigate("/auth");
        return;
      }

      console.log('Auth check complete');
      setLoading(false);
      loadStats();
    } catch (error) {
      console.error('Unexpected error in checkAuth:', error);
      setLoading(false);
      navigate("/auth");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

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

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Laden...</div>;
  }

  const isAdmin = userRoles.includes("admin");
  const isManager = userRoles.includes("manager");

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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.location.href = "/"}
              className="shadow-md"
            >
              Zum Terminal
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="shadow-md"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Abmelden
            </Button>
          </div>
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
          <TabsList className={`grid w-full h-auto p-1 ${isAdmin ? 'grid-cols-9' : 'grid-cols-7'}`}>
            <TabsTrigger value="employees" className="flex flex-col gap-1 py-3">
              <Users className="h-5 w-5" />
              <span className="text-xs sm:text-sm">Mitarbeiter</span>
            </TabsTrigger>
            <TabsTrigger value="faces" className="flex flex-col gap-1 py-3">
              <Camera className="h-5 w-5" />
              <span className="text-xs sm:text-sm">Gesichter</span>
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex flex-col gap-1 py-3">
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-xs sm:text-sm">Standorte</span>
            </TabsTrigger>
            <TabsTrigger value="terminals" className="flex flex-col gap-1 py-3">
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-xs sm:text-sm">Terminals</span>
            </TabsTrigger>
            <TabsTrigger value="time" className="flex flex-col gap-1 py-3">
              <Clock className="h-5 w-5" />
              <span className="text-xs sm:text-sm">Zeiterfassung</span>
            </TabsTrigger>
            <TabsTrigger value="vacation" className="flex flex-col gap-1 py-3">
              <Calendar className="h-5 w-5" />
              <span className="text-xs sm:text-sm">Urlaub</span>
            </TabsTrigger>
            <TabsTrigger value="advances" className="flex flex-col gap-1 py-3">
              <DollarSign className="h-5 w-5" />
              <span className="text-xs sm:text-sm">Vorschüsse</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="flex flex-col gap-1 py-3">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs sm:text-sm">Benutzer</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="danger" className="flex flex-col gap-1 py-3 text-destructive">
                <Trash2 className="h-5 w-5" />
                <span className="text-xs sm:text-sm">Danger</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="employees" className="space-y-4">
            <EmployeeManagement onUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="faces" className="space-y-4">
            <FaceProfileManagement />
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            <LocationManagement onUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="terminals" className="space-y-4">
            <TerminalManagement />
          </TabsContent>

          <TabsContent value="time" className="space-y-4">
            <EmployeeTimeDetails />
            <ManualTimeTracking />
            <TimeEntriesView />
          </TabsContent>

          <TabsContent value="vacation" className="space-y-4">
            <VacationManagement onUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="advances" className="space-y-4">
            <SalaryAdvances />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users" className="space-y-4">
              <UserManagement />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="danger" className="space-y-4">
              <MasterReset />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
