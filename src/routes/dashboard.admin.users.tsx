import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { getUsers, createUser, updateUser, deleteUser, updateUserPassword, getRestaurants, ROLE_LABELS, type User, type CreateUserRequest, type Restaurant } from "@/lib/api";
import { Users, Shield, Mail, UserCheck, Loader2, Plus, Pencil, Trash2, X, Search, KeyRound, Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const currentUser = useAuthStore((s) => s.user);

  // Super Admin view → manage restaurant_admins only
  if (currentUser?.role === "super_admin") {
    return <SuperAdminUsers />;
  }

  // Restaurant Admin view → manage all staff
  return <RestaurantAdminUsers />;
}

function SuperAdminUsers() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", restaurant_id: "",
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["super-admin-admins", search, statusFilter],
    queryFn: () => getUsers(undefined, "restaurant_admin"),
  });

  const { data: restaurantsData } = useQuery({
    queryKey: ["super-admin-restaurants-list"],
    queryFn: () => getRestaurants(),
  });

  const admins = (data?.data || []) as User[];
  const restaurants = (restaurantsData?.data || []) as Restaurant[];

  const filteredAdmins = admins.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !a.email.toLowerCase().includes(q)) return false;
    }
    if (statusFilter === "active" && !a.is_active) return false;
    if (statusFilter === "inactive" && a.is_active) return false;
    return true;
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-admins"] });
      toast.success("Admin created successfully");
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create admin"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-admins"] });
      toast.success("Admin updated successfully");
      setShowModal(false);
      setEditingUser(null);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update admin"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-admins"] });
      toast.success("Admin deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete admin"),
  });

  const passwordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      updateUserPassword(userId, password),
    onSuccess: () => {
      toast.success("Password reset successfully");
      setShowPasswordModal(false);
      setPasswordTarget(null);
      setNewPassword("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to reset password"),
  });

  const resetForm = () => setForm({ name: "", email: "", password: "", phone: "", restaurant_id: "" });

  const openCreate = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      phone: u.phone || "",
      restaurant_id: u.restaurant_id || "",
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const payload: any = {
        name: form.name,
        email: form.email,
        role: "restaurant_admin",
        phone: form.phone,
        restaurant_id: form.restaurant_id || undefined,
      };
      if (form.password) payload.password = form.password;
      updateMutation.mutate({ id: editingUser.id, data: payload });
    } else {
      if (!form.password) { toast.error("Password is required for new users"); return; }
      createMutation.mutate({
        name: form.name,
        email: form.email,
        password: form.password,
        role: "restaurant_admin",
        phone: form.phone || undefined,
        restaurant_id: form.restaurant_id || undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-col sm:flex-row gap-3">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Restaurant Admins</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {admins.length} admin accounts
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Admin
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search admins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400">
          Failed to load admins: {(error as any)?.message || "Unknown error"}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Restaurant</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    <Shield className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                    {search || statusFilter ? "No admins match your filters" : "No admin accounts yet"}
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((u) => {
                  const restaurant = restaurants.find((r) => r.id === u.restaurant_id);
                  return (
                    <tr key={u.id} className="bg-card hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10 text-purple-500 text-xs font-bold">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{u.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {u.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-foreground">
                            {restaurant ? restaurant.name : "Unassigned"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          u.is_active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                        }`}>
                          <UserCheck className="h-3 w-3" />
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setPasswordTarget(u); setNewPassword(""); setShowPasswordModal(true); }}
                            className="rounded-lg border border-border p-2 text-foreground hover:bg-accent hover:text-accent-foreground"
                            title="Reset Password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEdit(u)} className="rounded-lg border border-border p-2 text-foreground hover:bg-accent hover:text-accent-foreground">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => { if (confirm("Delete this admin?")) deleteMutation.mutate(u.id); }} className="rounded-lg border border-destructive/30 p-2 text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-foreground">{editingUser ? "Edit Admin" : "Add Admin"}</h2>
              <button onClick={() => { setShowModal(false); setEditingUser(null); resetForm(); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{editingUser ? "New Password (leave blank to keep)" : "Password"}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingUser} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Assign to Restaurant</label>
                <select value={form.restaurant_id} onChange={(e) => setForm({ ...form, restaurant_id: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— Select Restaurant —</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingUser(null); resetForm(); }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingUser ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && passwordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-foreground">Reset Password</h2>
              <button onClick={() => { setShowPasswordModal(false); setPasswordTarget(null); setNewPassword(""); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Reset password for <strong className="text-foreground">{passwordTarget.name}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowPasswordModal(false); setPasswordTarget(null); setNewPassword(""); }}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newPassword || newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
                    passwordMutation.mutate({ userId: passwordTarget.id, password: newPassword });
                  }}
                  disabled={passwordMutation.isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {passwordMutation.isPending ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RestaurantAdminUsers() {
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "waiter" as User['role'], phone: "" });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-users", currentUser?.restaurant_id],
    queryFn: () => getUsers(currentUser?.restaurant_id),
    enabled: !!currentUser,
  });

  const users = (data?.data || []) as User[];

  const createMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User created successfully");
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create user"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User updated successfully");
      setShowModal(false);
      setEditingUser(null);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update user"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete user"),
  });

  const resetForm = () => setForm({ name: "", email: "", password: "", role: "waiter", phone: "" });

  const openCreate = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role, phone: user.phone || "" });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const payload: any = { name: form.name, email: form.email, role: form.role, phone: form.phone };
      if (form.password) payload.password = form.password;
      updateMutation.mutate({ id: editingUser.id, data: payload });
    } else {
      if (!form.password) { toast.error("Password is required for new users"); return; }
      createMutation.mutate({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        restaurant_id: currentUser?.restaurant_id,
        phone: form.phone || undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Staff Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {users.length} registered staff
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Staff
        </button>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400">
          Failed to load users: {(error as any)?.message || "Unknown error"}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                    No staff accounts yet
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="bg-card hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.id === currentUser?.id && "You"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {u.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-foreground">{ROLE_LABELS[u.role]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        u.is_active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                      }`}>
                        <UserCheck className="h-3 w-3" />
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(u)} className="rounded-lg border border-border p-2 text-foreground hover:bg-accent hover:text-accent-foreground">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => { if (confirm("Delete this user?")) deleteMutation.mutate(u.id); }} className="rounded-lg border border-destructive/30 p-2 text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-foreground">{editingUser ? "Edit Staff" : "Add Staff"}</h2>
              <button onClick={() => { setShowModal(false); setEditingUser(null); resetForm(); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{editingUser ? "New Password (leave blank to keep)" : "Password"}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingUser} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring">
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingUser(null); resetForm(); }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingUser ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
