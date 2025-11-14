import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { UserCheck } from "lucide-react";

interface UserWithRole {
  user_id: string;
  role: string;
  email: string;
  full_name: string | null;
}

export const LoggedInUsers = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          profiles:user_id (
            email,
            full_name
          )
        `);

      if (error) throw error;

      const formattedUsers = data?.map(item => ({
        user_id: item.user_id,
        role: item.role,
        email: (item as any).profiles?.email || 'Unbekannt',
        full_name: (item as any).profiles?.full_name || null
      })) || [];

      // Remove duplicates by user_id
      const uniqueUsers = formattedUsers.reduce((acc, user) => {
        if (!acc.find(u => u.user_id === user.user_id)) {
          acc.push(user);
        }
        return acc;
      }, [] as UserWithRole[]);

      setUsers(uniqueUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <>
      <Card 
        className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer" 
        onClick={() => setIsOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Benutzer</CardTitle>
          <UserCheck className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{users.length}</div>
          <p className="text-xs text-muted-foreground">
            Registrierte Benutzer
          </p>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Registrierte Benutzer
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="text-center py-8">Laden...</div>
          ) : (
            <div className="space-y-4">
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Keine Benutzer gefunden
                </div>
              ) : (
                users.map(user => (
                  <Card key={user.user_id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base">
                            {user.full_name || user.email}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {user.email}
                          </CardDescription>
                        </div>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
