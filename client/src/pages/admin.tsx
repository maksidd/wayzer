import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // fetch current user
  const { data: me } = useQuery({
    queryKey: ['/api/users/me'],
    queryFn: () => apiRequest('/api/users/me').then(r => r.json()),
  });

  // redirect if not admin
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      sessionStorage.setItem('returnUrl', '/admin');
      navigate('/auth');
      return;
    }
    if (me && me.role !== 'admin') {
      navigate('/');
    }
  }, [me]);

  // fetch users list
  const { data: users = [] } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('/api/admin/users', { cache: 'no-store' }).then(r => r.json()),
    enabled: me?.role === 'admin',
    staleTime: 0,
    gcTime: 0,
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnMount: 'always',
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "blocked" }) => {
      await apiRequest(`/api/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: (_, variables) => {
      toast({ title: `User ${variables.status === 'blocked' ? 'blocked' : 'unblocked'}` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: () => {
      toast({ title: 'Status update error', variant: 'destructive' });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">Admin panel</h1>
        <Card>
          <CardHeader>Users</CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="capitalize">{u.role}</TableCell>
                    <TableCell>
                      <span className={u.status === 'blocked' ? 'text-red-600 font-semibold' : 'text-green-600'}>
                        {u.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={u.status === 'blocked' ? 'secondary' : 'destructive'}
                        size="sm"
                        disabled={statusMutation.isPending || u.id === me?.id}
                        onClick={() => {
                          const nextStatus = u.status === 'blocked' ? 'active' : 'blocked';
                          const confirmed = confirm(
                            nextStatus === 'blocked'
                              ? 'Заблокировать пользователя?'
                              : 'Разблокировать пользователя?',
                          );
                          if (!confirmed) return;
                          statusMutation.mutate({ id: u.id, status: nextStatus });
                        }}
                      >
                        {u.status === 'blocked' ? 'Unblock' : 'Block'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 