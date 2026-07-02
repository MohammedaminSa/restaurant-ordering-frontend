import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { useCart, fmt } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2, "Name too short").max(80),
  phone: z.string().trim().min(6, "Phone too short").max(30),
  notes: z.string().trim().max(500).optional().default(""),
});

function CartPage() {
  const { items, setQty, remove, total, clear } = useCart();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ customer_name: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const placeOrder = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (items.length === 0) { toast.error("Your cart is empty"); return; }

    setSubmitting(true);
    try {
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({ user_id: user.id, total, ...parsed.data })
        .select("id")
        .single();
      if (orderErr || !order) throw orderErr ?? new Error("Failed to create order");

      const { error: itemsErr } = await supabase.from("order_items").insert(
        items.map((i) => ({
          order_id: order.id, menu_item_id: i.id, item_name: i.name,
          unit_price: i.price, quantity: i.quantity,
        }))
      );
      if (itemsErr) throw itemsErr;

      clear();
      toast.success("Order placed! We're preparing it now.");
      navigate({ to: "/orders" });
    } catch (e) {
      console.error(e);
      toast.error("Couldn't place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="font-serif text-4xl text-foreground">Your Order</h1>

        {items.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border py-16 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Nothing in your cart yet.</p>
            <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground">
              Browse the menu
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            <ul className="space-y-3">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                  <div className="flex-1">
                    <p className="font-serif text-lg text-card-foreground">{i.name}</p>
                    <p className="text-sm text-muted-foreground">{fmt(i.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-border p-1">
                    <button onClick={() => setQty(i.id, i.quantity - 1)} className="rounded-full p-1.5 hover:bg-secondary" aria-label="Decrease">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm">{i.quantity}</span>
                    <button onClick={() => setQty(i.id, i.quantity + 1)} className="rounded-full p-1.5 hover:bg-secondary" aria-label="Increase">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="w-20 text-right font-serif text-lg text-foreground">{fmt(i.price * i.quantity)}</div>
                  <button onClick={() => remove(i.id)} className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-destructive" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>

            <aside className="h-fit rounded-2xl border border-border bg-card p-6">
              <h2 className="font-serif text-xl text-card-foreground">Checkout</h2>
              <div className="mt-5 space-y-3">
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Your name" value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  maxLength={80}
                />
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Phone" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  maxLength={30}
                />
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Notes (allergies, preferences)" rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  maxLength={500}
                />
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-serif text-2xl text-foreground">{fmt(total)}</span>
              </div>
              <button
                onClick={placeOrder}
                disabled={submitting || loading}
                className="mt-5 w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60"
              >
                {submitting ? "Placing order…" : user ? "Place order" : "Sign in to order"}
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
