import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { getRestaurants, createRestaurant, updateRestaurant, deleteRestaurant, toggleRestaurantStatus, type Restaurant, type CreateRestaurantRequest, type UpdateRestaurantRequest } from "@/lib/api";
import { Building2, Loader2, Plus, Pencil, Trash2, X, Search, Power, PowerOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/admin/restaurants")({
  component: AdminRestaurants,
});

function AdminRestaurants() {
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    logo_url: "",
    currency: "USD",
    tax_rate: "0",
    service_charge_rate: "0",
    timezone: "UTC",
    telebirr_account_name: "",
    telebirr_phone: "",
    bank_name: "",
    bank_account_holder: "",
    bank_account_number: "",
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["super-admin-restaurants", search, statusFilter],
    queryFn: () => getRestaurants(search || undefined, statusFilter || undefined),
    enabled: currentUser?.role === "super_admin",
  });

  const restaurants = (data?.data || []) as Restaurant[];

  const createMutation = useMutation({
    mutationFn: (data: CreateRestaurantRequest) => createRestaurant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-restaurants"] });
      toast.success("Restaurant created successfully");
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create restaurant"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRestaurantRequest }) => updateRestaurant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-restaurants"] });
      toast.success("Restaurant updated successfully");
      setShowModal(false);
      setEditingRestaurant(null);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update restaurant"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRestaurant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-restaurants"] });
      toast.success("Restaurant deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete restaurant"),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => toggleRestaurantStatus(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-restaurants"] });
      toast.success(res.message || "Status updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to toggle status"),
  });

  const resetForm = () => setForm({
    name: "", description: "", address: "", phone: "", email: "", logo_url: "",
    currency: "USD", tax_rate: "0", service_charge_rate: "0", timezone: "UTC",
    telebirr_account_name: "", telebirr_phone: "",
    bank_name: "", bank_account_holder: "", bank_account_number: "",
  });

  const openCreate = () => {
    setEditingRestaurant(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (r: Restaurant) => {
    setEditingRestaurant(r);
    setForm({
      name: r.name,
      description: r.description || "",
      address: r.address || "",
      phone: r.phone || "",
      email: r.email || "",
      logo_url: r.logo_url || "",
      currency: r.currency || "USD",
      tax_rate: String(r.tax_rate || 0),
      service_charge_rate: String(r.service_charge_rate || 0),
      timezone: r.timezone || "UTC",
      telebirr_account_name: r.payment_details?.telebirr?.account_name || "",
      telebirr_phone: r.payment_details?.telebirr?.phone || "",
      bank_name: r.payment_details?.bank_transfer?.bank_name || "",
      bank_account_holder: r.payment_details?.bank_transfer?.account_holder || "",
      bank_account_number: r.payment_details?.bank_transfer?.account_number || "",
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: form.name,
      description: form.description || undefined,
      address: form.address || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      logo_url: form.logo_url || undefined,
      currency: form.currency,
      tax_rate: parseFloat(form.tax_rate) || 0,
      service_charge_rate: parseFloat(form.service_charge_rate) || 0,
      timezone: form.timezone,
      payment_details: {
        telebirr: {
          account_name: form.telebirr_account_name || undefined,
          phone: form.telebirr_phone || undefined,
        },
        bank_transfer: {
          bank_name: form.bank_name || undefined,
          account_holder: form.bank_account_holder || undefined,
          account_number: form.bank_account_number || undefined,
        },
      },
    };
    if (editingRestaurant) {
      updateMutation.mutate({ id: editingRestaurant.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-col sm:flex-row gap-3">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Restaurants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {restaurants.length} registered restaurants
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Restaurant
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search restaurants..."
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
          Failed to load restaurants: {(error as any)?.message || "Unknown error"}
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
                <th className="px-4 py-3 text-left font-medium text-foreground">Address</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Contact</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Admins</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Created</th>
                <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {restaurants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                    {search || statusFilter ? "No restaurants match your filters" : "No restaurants yet"}
                  </td>
                </tr>
              ) : (
                restaurants.map((r) => (
                  <tr key={r.id} className="bg-card hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent text-xs font-bold">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{r.name}</p>
                          {r.email && <p className="text-xs text-muted-foreground">{r.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.address || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.phone || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-foreground font-medium">{r.admin_count || 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.is_active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                      }`}>
                        {r.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => toggleMutation.mutate(r.id)}
                          disabled={toggleMutation.isPending}
                          className="rounded-lg border border-border p-2 text-foreground hover:bg-accent hover:text-accent-foreground"
                          title={r.is_active ? "Deactivate" : "Activate"}
                        >
                          {r.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </button>
                        <button onClick={() => openEdit(r)} className="rounded-lg border border-border p-2 text-foreground hover:bg-accent hover:text-accent-foreground">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => { if (confirm("Delete this restaurant and all associated data?")) deleteMutation.mutate(r.id); }} className="rounded-lg border border-destructive/30 p-2 text-destructive hover:bg-destructive/10">
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
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-foreground">{editingRestaurant ? "Edit Restaurant" : "Add Restaurant"}</h2>
              <button onClick={() => { setShowModal(false); setEditingRestaurant(null); resetForm(); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Restaurant Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Address</label>
                  <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Logo URL</label>
                <input type="url" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://example.com/logo.png" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Currency</label>
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="ETB">ETB</option>
                    <option value="NGN">NGN</option>
                    <option value="KES">KES</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Timezone</label>
                  <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="UTC">UTC</option>
                    <option value="Africa/Addis_Ababa">Africa/Addis_Ababa (UTC+3)</option>
                    <option value="Africa/Nairobi">Africa/Nairobi (UTC+3)</option>
                    <option value="Africa/Lagos">Africa/Lagos (UTC+1)</option>
                    <option value="Africa/Cairo">Africa/Cairo (UTC+2)</option>
                    <option value="Africa/Casablanca">Africa/Casablanca (UTC+1)</option>
                    <option value="America/New_York">America/New_York (UTC-5)</option>
                    <option value="America/Chicago">America/Chicago (UTC-6)</option>
                    <option value="America/Denver">America/Denver (UTC-7)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
                    <option value="Europe/London">Europe/London (UTC+0)</option>
                    <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                    <option value="Europe/Dubai">Europe/Dubai (UTC+4)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</option>
                    <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                    <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                    <option value="Australia/Sydney">Australia/Sydney (UTC+11)</option>
                    <option value="Pacific/Auckland">Pacific/Auckland (UTC+13)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Tax Rate (%)</label>
                  <input type="number" step="0.01" min="0" max="100" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Service Charge (%)</label>
                  <input type="number" step="0.01" min="0" max="100" value={form.service_charge_rate} onChange={(e) => setForm({ ...form, service_charge_rate: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-serif text-base text-foreground mb-3">Payment Settings</h3>
                <p className="text-xs text-muted-foreground mb-3">Configure merchant details displayed to customers for non-cash payments</p>
                <div className="space-y-4">
                  <div className="rounded-lg border border-border p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-accent/10 text-accent text-xs font-bold">T</span>
                      Telebirr
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">Account Name</label>
                        <input type="text" value={form.telebirr_account_name} onChange={(e) => setForm({ ...form, telebirr_account_name: e.target.value })} placeholder="e.g. ABC Restaurant" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">Phone Number</label>
                        <input type="text" value={form.telebirr_phone} onChange={(e) => setForm({ ...form, telebirr_phone: e.target.value })} placeholder="e.g. 0911XXXXXX" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-accent/10 text-accent text-xs font-bold">B</span>
                      Bank Transfer
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">Bank Name</label>
                        <input type="text" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="e.g. CBE" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">Account Holder</label>
                        <input type="text" value={form.bank_account_holder} onChange={(e) => setForm({ ...form, bank_account_holder: e.target.value })} placeholder="e.g. ABC Restaurant PLC" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">Account Number</label>
                        <input type="text" value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} placeholder="e.g. 10000XXXXXX" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingRestaurant(null); resetForm(); }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingRestaurant ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
