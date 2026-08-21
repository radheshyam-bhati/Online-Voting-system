"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, UserPlus, Shield, Lock, Loader2, Check, X, Edit, Trash2, MoreHorizontal, ChevronDown } from "lucide-react";
import { format } from "date-fns";

interface AdminGrant {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  isSuperAdmin: boolean;
  grantedAt: string;
  revokedAt: string | null;
  grantedBy: string | null;
  grantedByName: string | null;
  permissions: Array<{
    function: string;
    campusId: string | null;
    campusName: string | null;
  }>;
}

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
}

const adminFunctions = [
  { value: "members", label: "Members Management" },
  { value: "content", label: "Content Management" },
  { value: "elections", label: "Elections Management" },
  { value: "admins", label: "Admin Management" },
] as const;

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState<AdminGrant[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminGrant | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    userId: "",
    isSuperAdmin: false,
    permissions: [] as Array<{ function: string; campusId: string | null }>,
  });
  const [campuses, setCampuses] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const [adminsRes, usersRes, campusesRes] = await Promise.all([
        fetch("/api/admin/admins"),
        fetch("/api/admin/users"),
        fetch("/api/admin/campuses"),
      ]);
      const [adminsData, usersData, campusesData] = await Promise.all([
        adminsRes.json(),
        usersRes.json(),
        campusesRes.json(),
      ]);
      setAdmins(adminsData);
      setUsers(usersData);
      setCampuses(campusesData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionChange = (functionName: string, campusId: string | null, checked: boolean) => {
    setFormData(prev => {
      const exists = prev.permissions.find(
        p => p.function === functionName && p.campusId === campusId
      );
      if (checked && !exists) {
        return {
          ...prev,
          permissions: [...prev.permissions, { function: functionName, campusId }],
        };
      }
      if (!checked && exists) {
        return {
          ...prev,
          permissions: prev.permissions.filter(
            p => p.function !== functionName || p.campusId !== campusId
          ),
        };
      }
      return prev;
    });
  };

  const isPermissionChecked = (functionName: string, campusId: string | null) => {
    return formData.permissions.some(
      p => p.function === functionName && p.campusId === campusId
    );
  };

  const openCreateDialog = () => {
    setEditingAdmin(null);
    setFormData({
      userId: "",
      isSuperAdmin: false,
      permissions: [],
    });
    setDialogOpen(true);
  };

  const openEditDialog = (admin: AdminGrant) => {
    setEditingAdmin(admin);
    setFormData({
      userId: admin.userId,
      isSuperAdmin: admin.isSuperAdmin,
      permissions: admin.permissions.map(p => ({
        function: p.function,
        campusId: p.campusId,
      })),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.userId) {
      setError("Please select a user");
      return;
    }
    if (!formData.isSuperAdmin && formData.permissions.length === 0) {
      setError("Please assign at least one permission or make super admin");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const url = editingAdmin
        ? `/api/admin/admins/${editingAdmin.id}`
        : "/api/admin/admins";
      const method = editingAdmin ? "PATCH" : "POST";
      const body = editingAdmin
        ? { permissions: formData.permissions, isSuperAdmin: formData.isSuperAdmin }
        : { userId: formData.userId, isSuperAdmin: formData.isSuperAdmin, permissions: formData.permissions };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save admin");
        return;
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      setError("Failed to save admin");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (grantId: string) => {
    if (!confirm("Are you sure you want to revoke this admin's access? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/admins/${grantId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to revoke admin");
        return;
      }

      fetchData();
    } catch (error) {
      alert("Failed to revoke admin");
    }
  };

  const getPermissionBadge = (perm: { function: string; campusId: string | null; campusName: string | null }) => {
    const func = adminFunctions.find(f => f.value === perm.function);
    const label = func?.label || perm.function;
    const campus = perm.campusName ? ` - ${perm.campusName}` : " (All Campuses)";
    return `${label}${campus}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary">Admin Management</h1>
          <p className="text-muted-foreground">Manage admin users and their permissions</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Add Admin
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Admin Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {admins.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-heading text-xl text-muted-foreground mb-2">No admins yet</h3>
                <p className="text-muted-foreground mb-6">Add your first admin user to get started</p>
                <Button onClick={openCreateDialog} className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add Admin
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Granted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">{admin.userName}</TableCell>
                        <TableCell>
                          <Badge variant={admin.isSuperAdmin ? "default" : "secondary"}>
                            {admin.isSuperAdmin ? "Super Admin" : "Scoped Admin"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {admin.permissions.map((perm, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {adminFunctions.find(f => f.value === perm.function)?.label || perm.function}
                                {perm.campusName && ` - ${perm.campusName}`}
                              </Badge>
                            ))}
                            {admin.permissions.length === 0 && !admin.isSuperAdmin && (
                              <Badge variant="destructive" className="text-xs">No permissions</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{format(new Date(admin.grantedAt), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={admin.revokedAt ? "destructive" : "default"}>
                            {admin.revokedAt ? "Revoked" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {!admin.revokedAt && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(admin)}
                              disabled={admin.isSuperAdmin}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {!admin.revokedAt && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleRevoke(admin.id)}
                              disabled={admin.isSuperAdmin}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          {admin.isSuperAdmin && (
                            <Badge variant="outline" className="text-xs">Protected</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAdmin ? "Edit Admin" : "Add Admin"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingAdmin ? (
              <p className="text-sm text-muted-foreground">
                Editing <strong>{editingAdmin.userName}</strong> ({editingAdmin.userEmail})
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="userId">Select User</Label>
                <Select value={formData.userId} onValueChange={(v: string | null) => setFormData({ ...formData, userId: v || "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => !admins.some(a => a.userId === u.id)).map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="isSuperAdmin">Super Admin</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="checkbox"
                  id="isSuperAdmin"
                  checked={formData.isSuperAdmin}
                  onChange={e => setFormData({ ...formData, isSuperAdmin: e.target.checked })}
                />
                <Label htmlFor="isSuperAdmin">Full access to all functions and campuses</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Super admins have unrestricted access and cannot be revoked if they are the last super admin.
              </p>
            </div>

            {!formData.isSuperAdmin && (
              <div className="space-y-4">
                <Label className="font-medium">Permissions</Label>
                <p className="text-sm text-muted-foreground">
                  Assign campus-scoped permissions for each function. "All Campuses" grants access across all campuses.
                </p>
                <div className="space-y-3">
                  {adminFunctions.map(func => (
                    <div key={func.value} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{func.label}</h4>
                        <div className="flex items-center gap-2">
                          <Input
                            type="checkbox"
                            id={`${func.value}-all`}
                            checked={isPermissionChecked(func.value, null)}
                            onChange={e => handlePermissionChange(func.value, null, e.target.checked)}
                          />
                          <Label htmlFor={`${func.value}-all`} className="text-sm">All Campuses</Label>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {campuses.map(campus => (
                          <div key={campus.id} className="flex items-center gap-2">
                            <Input
                              type="checkbox"
                              id={`${func.value}-${campus.id}`}
                              checked={isPermissionChecked(func.value, campus.id)}
                              onChange={e => handlePermissionChange(func.value, campus.id, e.target.checked)}
                              disabled={isPermissionChecked(func.value, null)}
                            />
                            <Label htmlFor={`${func.value}-${campus.id}`} className="text-sm">
                              {campus.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm" role="alert">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingAdmin(null); setError(""); setFormData({ userId: "", isSuperAdmin: false, permissions: [] }); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingAdmin ? "Update Admin" : "Create Admin"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}