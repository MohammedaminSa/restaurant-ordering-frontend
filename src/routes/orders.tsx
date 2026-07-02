import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/lib/auth";
import { fmt } from "@/lib/cart";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

type OrderRow = {
  id: string; status: string; total: number; created_at: string;
  customer_name: string; notes: string;
  order_items: { id: string; item_name: string; unit_price: number; quantity: number }[];
};

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,status,total,created_at,customer_name,notes,order_items(id,item_name,unit_price,quantity)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrderRow[];
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="font-serif text-4xl text-foreground">Your Orders</h1>

        {(isLoading || loading) && <p className="mt-8 text-muted-foreground">Loading…</p>}

        {data && data.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-muted-foreground">No orders yet.</p>
            <Link to="/" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground">
              Order something
            </Link>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {data?.map((o) => (
            <article key={o.id} className="rounded-2xl border border-border bg-card p-6">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <p className="font-serif text-lg text-card-foreground">Order · {o.id.slice(0, 8)}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {new Date(o.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-accent/15 px-3 py-1 text-xs uppercase tracking-wider text-accent">
                    {o.status}
                  </span>
                  <span className="font-serif text-xl text-foreground">{fmt(Number(o.total))}</span>
                </div>
              </header>
              <ul className="mt-4 space-y-1 text-sm">
                {o.order_items.map((it) => (
                  <li key={it.id} className="flex justify-between text-muted-foreground">
                    <span>{it.quantity} × {it.item_name}</span>
                    <span>{fmt(Number(it.unit_price) * it.quantity)}</span>
                  </li>
                ))}
              </ul>
              {o.notes && <p className="mt-3 border-t border-border pt-3 text-xs italic text-muted-foreground">Note: {o.notes}</p>}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
