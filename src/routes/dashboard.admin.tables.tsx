import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { getTables, createTable, updateTable, deleteTable, generateTableQR, getUsers, assignTableToWaiter, type WaiterTable, type CreateTableRequest, type User } from "@/lib/api";
import { Table as TableIcon, Users, MapPin, Loader2, Plus, Pencil, Trash2, X, QrCode, UserPlus, UserCheck, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/admin/tables")({
  component: AdminTables,
});

function AdminTables() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState<WaiterTable | null>(null);
  const [form, setForm] = useState({ table_number: "", capacity: 4, location: "main" });
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrTableNumber, setQrTableNumber] = useState<string>("");
  const [assignTableId, setAssignTableId] = useState<string | null>(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-tables", user?.restaurant_id],
    queryFn: () => getTables(user?.restaurant_id),
    enabled: !!user,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-waiters", user?.restaurant_id],
    queryFn: () => getUsers(user?.restaurant_id),
    enabled: !!user,
  });

  const tables = (data?.data || []) as WaiterTable[];
  const staff = (usersQuery.data?.data || []) as User[];
  const waiters = staff.filter((s) => s.role === "waiter");

  const createMutation = useMutation({
    mutationFn: (data: CreateTableRequest) => createTable(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tables"] });
      toast.success("Table created successfully");
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create table"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTable(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tables"] });
      toast.success("Table updated successfully");
      setShowModal(false);
      setEditingTable(null);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update table"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tables"] });
      toast.success("Table deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete table"),
  });

  const qrMutation = useMutation({
    mutationFn: (id: string) => generateTableQR(id),
    onSuccess: (res) => {
      setQrImage(res.data?.qr_code_image || null);
      toast.success("QR code generated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to generate QR"),
  });

  const assignMutation = useMutation({
    mutationFn: ({ tableId, waiterId }: { tableId: string; waiterId: string }) => assignTableToWaiter(tableId, waiterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tables"] });
      toast.success("Waiter assigned to table");
      setAssignTableId(null);
      setSelectedWaiterId("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to assign waiter"),
  });

  const resetForm = () => setForm({ table_number: "", capacity: 4, location: "main" });

  const openCreate = () => {
    setEditingTable(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (table: WaiterTable) => {
    setEditingTable(table);
    setForm({ table_number: table.table_number, capacity: table.capacity, location: table.location });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTable) {
      updateMutation.mutate({ id: editingTable.id, data: form });
    } else {
      if (!user?.restaurant_id) { toast.error("No restaurant found"); return; }
      createMutation.mutate({ ...form, restaurant_id: user.restaurant_id, table_number: form.table_number });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Tables</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tables.length} total tables
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Table
        </button>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400">
          Failed to load tables: {(error as any)?.message || "Unknown error"}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}

      {!isLoading && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-foreground">Table</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Capacity</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Location</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Waiter</th>
                <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tables.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <TableIcon className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                    No tables configured yet
                  </td>
                </tr>
              ) : (
                tables.map((table) => (
                  <tr key={table.id} className="bg-card hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-accent/10 p-2">
                          <TableIcon className="h-4 w-4 text-accent" />
                        </div>
                        <span className="font-medium text-foreground">Table {table.table_number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {table.capacity}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {table.location}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        table.status === "available"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : table.status === "occupied"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                      }`}>
                        {table.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(table as any).assigned_waiter_id ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <UserCheck className="h-3 w-3" />
                          Assigned
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setAssignTableId(table.id); setSelectedWaiterId(""); }} className="rounded-lg border border-border p-2 text-foreground hover:bg-accent hover:text-accent-foreground" title="Assign Waiter">
                          <UserPlus className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setQrTableNumber(table.table_number); qrMutation.mutate(table.id); }} className="rounded-lg border border-border p-2 text-foreground hover:bg-accent hover:text-accent-foreground" title="Generate QR Code">
                          <QrCode className="h-4 w-4" />
                        </button>
                        <button onClick={() => openEdit(table)} className="rounded-lg border border-border p-2 text-foreground hover:bg-accent hover:text-accent-foreground">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => { if (confirm("Delete this table?")) deleteMutation.mutate(table.id); }} className="rounded-lg border border-destructive/30 p-2 text-destructive hover:bg-destructive/10">
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
              <h2 className="font-serif text-xl text-foreground">{editingTable ? "Edit Table" : "Add Table"}</h2>
              <button onClick={() => { setShowModal(false); setEditingTable(null); resetForm(); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Table Number</label>
                <input type="text" value={form.table_number} onChange={(e) => setForm({ ...form, table_number: e.target.value })} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Capacity</label>
                <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Location</label>
                <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingTable(null); resetForm(); }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingTable ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assignTableId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAssignTableId(null)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-foreground">Assign Waiter</h2>
              <button onClick={() => setAssignTableId(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Select Waiter</label>
                <select value={selectedWaiterId} onChange={(e) => setSelectedWaiterId(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Choose a waiter...</option>
                  {waiters.map((w) => (
                    <option key={w.id} value={w.id}>{w.name} ({w.email})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setAssignTableId(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
                  Cancel
                </button>
                <button type="button" onClick={() => { if (selectedWaiterId) assignMutation.mutate({ tableId: assignTableId, waiterId: selectedWaiterId }); }} disabled={!selectedWaiterId || assignMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {assignMutation.isPending ? "Assigning..." : "Assign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {qrImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setQrImage(null)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-foreground">QR Code</h2>
              <button onClick={() => setQrImage(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <img src={qrImage} alt="Table QR Code" className="w-full rounded-lg" />
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.download = `table-qr-${qrTableNumber || ''}.png`;
                link.href = qrImage;
                link.click();
              }}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-4 w-4" /> Download PNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
