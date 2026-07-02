import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { useCart, fmt } from "@/lib/cart";
import { toast } from "sonner";
import { ArrowLeft, Clock, Plus, Minus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/item/$id")({
  component: ItemDetail,
});

type MenuItem = {
  id: string; name: string; description: string; price: number;
  ingredients: string[]; prep_minutes: number; available: boolean;
  categories: { name: string } | null;
};

function ItemDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["menu-item", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*, categories(name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as MenuItem | null;
    },
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to menu
        </Link>

        {isLoading && <div className="mt-8 h-64 animate-pulse rounded-xl bg-muted" />}
        {(error || (!isLoading && !data)) && (
          <p className="mt-12 text-center text-muted-foreground">This dish isn't available right now.</p>
        )}

        {data && (
          <article className="mt-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
            {data.categories?.name && (
              <p className="text-xs uppercase tracking-[0.25em] text-accent">{data.categories.name}</p>
            )}
            <h1 className="mt-3 font-serif text-4xl text-card-foreground">{data.name}</h1>
            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {data.prep_minutes} min</span>
              <span className="font-serif text-xl text-accent">{fmt(Number(data.price))}</span>
            </div>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">{data.description}</p>

            {data.ingredients.length > 0 && (
              <div className="mt-8">
                <h2 className="font-serif text-lg text-card-foreground">Ingredients</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.ingredients.map((ing) => (
                    <span key={ing} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{ing}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-border pt-6">
              <div className="flex items-center gap-3 rounded-full border border-border p-1">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="rounded-full p-2 hover:bg-secondary" aria-label="Decrease">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center font-medium">{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className="rounded-full p-2 hover:bg-secondary" aria-label="Increase">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => {
                  add({ id: data.id, name: data.name, price: Number(data.price) }, qty);
                  toast.success(`${qty} × ${data.name} added`);
                  navigate({ to: "/" });
                }}
                className="flex-1 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
              >
                Add to order · {fmt(Number(data.price) * qty)}
              </button>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
