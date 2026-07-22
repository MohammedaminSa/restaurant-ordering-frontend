import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { getMenuItems, getCategories, createMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemAvailability, createCategory, updateCategory, deleteCategory, uploadImage, type MenuItem, type Category } from "@/lib/api";
import { UtensilsCrossed, Clock, Loader2, Plus, Pencil, Trash2, X, Search, Tags, ImageIcon, Upload } from "lucide-react";
import { fmt } from "@/lib/cart";
import { useState, useRef } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/admin/menu-items")({
  component: AdminMenuItems,
});

function AdminMenuItems() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState({ name: "", description: "", base_price: 0, category_id: "", preparation_time: 10, is_available: true, image_url: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", description: "" });
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const itemsQuery = useQuery({
    queryKey: ["admin-menu-items", user?.restaurant_id],
    queryFn: () => getMenuItems({ restaurantId: user?.restaurant_id }),
    enabled: !!user,
  });

  const catsQuery = useQuery({
    queryKey: ["admin-categories", user?.restaurant_id],
    queryFn: () => getCategories(user?.restaurant_id),
    enabled: !!user,
  });

  const items = (itemsQuery.data?.data || []) as MenuItem[];
  const categories = (catsQuery.data?.data || []) as Category[];

  const getCategoryName = (catId: string) => categories.find((c) => c.id === catId)?.name || "Unknown";

  const filtered = items.filter((i) => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.description || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || i.category_id === categoryFilter;
    return matchSearch && matchCat;
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createMenuItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu-items"] });
      toast.success("Menu item created");
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create item"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateMenuItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu-items"] });
      toast.success("Menu item updated");
      setShowModal(false);
      setEditingItem(null);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update item"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMenuItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu-items"] });
      toast.success("Menu item deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete item"),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => toggleMenuItemAvailability(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu-items"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to toggle availability"),
  });

  const createCatMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => createCategory({ ...data, restaurant_id: user?.restaurant_id || "" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category created");
      setCatForm({ name: "", description: "" });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create category"),
  });

  const updateCatMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category updated");
      setEditingCat(null);
      setCatForm({ name: "", description: "" });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update category"),
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete category"),
  });

  const resetForm = () => {
    setForm({ name: "", description: "", base_price: 0, category_id: categories[0]?.id || "", preparation_time: 10, is_available: true, image_url: "" });
    setImageFile(null);
    setImagePreview(null);
  };

  const openCreate = () => {
    setEditingItem(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || "",
      base_price: parseFloat(item.base_price),
      category_id: item.category_id,
      preparation_time: item.preparation_time || 10,
      is_available: item.is_available,
      image_url: item.image_url || "",
    });
    setImagePreview(item.image_url || null);
    setImageFile(null);
    setShowModal(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setForm({ ...form, image_url: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let imageUrl = form.image_url;

    if (imageFile) {
      setUploading(true);
      try {
        const uploadRes = await uploadImage(imageFile);
        imageUrl = uploadRes.data.url;
      } catch (err: any) {
        toast.error(err.message || "Failed to upload image");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const payload = {
      name: form.name,
      description: form.description || undefined,
      base_price: form.base_price,
      category_id: form.category_id,
      preparation_time: form.preparation_time || undefined,
      is_available: form.is_available,
      image_url: imageUrl || undefined,
      restaurant_id: user?.restaurant_id,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCat) {
      updateCatMutation.mutate({ id: editingCat.id, data: catForm });
    } else {
      createCatMutation.mutate(catForm);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Menu Items</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} items · {categories.length} categories
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditingCat(null); setCatForm({ name: "", description: "" }); setShowCatModal(true); }} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 lg:px-4 text-sm font-medium text-foreground hover:bg-accent">
            <Tags className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Categories</span>
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 lg:px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full sm:w-auto rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {itemsQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400">
          Failed to load menu items: {(itemsQuery.error as any)?.message || "Unknown error"}
        </div>
      )}

      {itemsQuery.isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}

      {!itemsQuery.isLoading && !itemsQuery.isError && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-foreground">Item</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Price</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Prep Time</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Available</th>
                <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <UtensilsCrossed className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                    {search || categoryFilter !== "all" ? "No items match your filters" : "No menu items yet"}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="bg-card hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <UtensilsCrossed className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                        {getCategoryName(item.category_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {fmt(parseFloat(item.base_price))}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.preparation_time ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {item.preparation_time} min
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleMutation.mutate(item.id)} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        item.is_available
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50"
                          : "bg-muted text-muted-foreground hover:bg-accent/50"
                      }`}>
                        {item.is_available ? "Available" : "Unavailable"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(item)} className="rounded-lg border border-border p-2 text-foreground hover:bg-accent hover:text-accent-foreground">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => { if (confirm("Delete this item?")) deleteMutation.mutate(item.id); }} className="rounded-lg border border-destructive/30 p-2 text-destructive hover:bg-destructive/10">
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
              <h2 className="font-serif text-xl text-foreground">{editingItem ? "Edit Menu Item" : "Add Menu Item"}</h2>
              <button onClick={() => { setShowModal(false); setEditingItem(null); resetForm(); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Image</label>
                <div className="flex items-start gap-4">
                  <div className="h-24 w-24 rounded-lg overflow-hidden bg-muted shrink-0 border border-border">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                    >
                      <Upload className="h-4 w-4" />
                      {imagePreview ? "Change Image" : "Upload Image"}
                    </button>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    )}
                    <p className="text-xs text-muted-foreground">JPG, PNG, WebP or GIF. Max 5MB.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Price</label>
                  <input type="number" step="0.01" min={0} value={form.base_price} onChange={(e) => setForm({ ...form, base_price: parseFloat(e.target.value) || 0 })} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Prep Time (min)</label>
                  <input type="number" min={0} value={form.preparation_time} onChange={(e) => setForm({ ...form, preparation_time: parseInt(e.target.value) || 0 })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_available" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} className="rounded border-border" />
                <label htmlFor="is_available" className="text-sm text-foreground">Available</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingItem(null); resetForm(); }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
                  Cancel
                </button>
                <button type="submit" disabled={uploading || createMutation.isPending || updateMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {uploading ? "Uploading..." : createMutation.isPending || updateMutation.isPending ? "Saving..." : editingItem ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCatModal(false)}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-foreground">Manage Categories</h2>
              <button onClick={() => setShowCatModal(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCatSubmit} className="flex flex-col sm:flex-row gap-2 mb-6">
              <input type="text" placeholder={editingCat ? "Edit category name" : "New category name"} value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} required className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              <input type="text" placeholder="Description (optional)" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
              <div className="flex gap-2">
                {editingCat && (
                  <button type="button" onClick={() => { setEditingCat(null); setCatForm({ name: "", description: "" }); }} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent">
                    Cancel
                  </button>
                )}
                <button type="submit" disabled={createCatMutation.isPending || updateCatMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap">
                  {createCatMutation.isPending || updateCatMutation.isPending ? "..." : editingCat ? "Update" : "Add"}
                </button>
              </div>
            </form>

            {catsQuery.isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            )}

            {!catsQuery.isLoading && categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No categories yet. Add one above.</p>
            )}

            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{cat.name}</p>
                    {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingCat(cat); setCatForm({ name: cat.name, description: cat.description || "" }); }} className="rounded-lg border border-border p-1.5 text-foreground hover:bg-accent hover:text-accent-foreground">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { if (confirm(`Delete category "${cat.name}"?`)) deleteCatMutation.mutate(cat.id); }} disabled={deleteCatMutation.isPending} className="rounded-lg border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
