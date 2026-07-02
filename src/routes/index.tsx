import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { useCart, fmt } from "@/lib/cart";
import { toast } from "sonner";
import { Plus, Clock } from "lucide-react";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  component: Menu,
});

type Category = { id: string; name: string; slug: string; sort_order: number };
type MenuItem = {
  id: string; name: string; description: string; price: number;
  category_id: string; ingredients: string[]; prep_minutes: number; available: boolean;
};

async function loadMenu() {
  const [cats, items] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("menu_items").select("*").eq("available", true).order("sort_order"),
  ]);
  if (cats.error) throw cats.error;
  if (items.error) throw items.error;
  return { categories: cats.data as Category[], items: items.data as MenuItem[] };
}

function Menu() {
  const { data, isLoading } = useQuery({ queryKey: ["menu"], queryFn: loadMenu });
  const [active, setActive] = useState<string | null>(null);
  const { add } = useCart();

  const categories = data?.categories ?? [];
  const items = data?.items ?? [];
  const shown = active ? items.filter((i) => i.category_id === active) : items;

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-border/60">
        <img src={heroImg} alt="Olivera dining room" width={1600} height={1024}
          className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 md:py-32">
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Est. 2018 · Mediterranean</p>
          <h1 className="mt-4 max-w-2xl font-serif text-5xl leading-tight text-foreground md:text-6xl">
            A seasonal menu, made to order.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
            Browse tonight's dishes, tap through the details, and send your order straight to our kitchen.
          </p>
          <a href="#menu" className="mt-8 inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03]">
            View the menu
          </a>
        </div>
      </section>

      <section id="menu" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl text-foreground md:text-4xl">Tonight's Menu</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tap a dish to see ingredients and prep time.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActive(null)}
              className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition-colors ${active === null ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
              All
            </button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setActive(c.id)}
                className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition-colors ${active === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((item) => (
              <article key={item.id} className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
                <Link to="/item/$id" params={{ id: item.id }} className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-serif text-xl text-card-foreground group-hover:text-accent">{item.name}</h3>
                    <span className="whitespace-nowrap font-serif text-lg text-accent">{fmt(Number(item.price))}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">{item.description}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {item.prep_minutes} min
                  </div>
                </Link>
                <button
                  onClick={() => { add({ id: item.id, name: item.name, price: Number(item.price) }); toast.success(`${item.name} added`); }}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <Plus className="h-4 w-4" /> Add to order
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © Olivera Bistro · 24 Rue de la Vigne · Open 5pm–11pm
      </footer>
    </div>
  );
}
