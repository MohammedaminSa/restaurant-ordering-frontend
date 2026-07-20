import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMenuItemById, getRestaurantInfo } from "@/lib/api";
import { SiteHeader } from "@/components/site-header";
import { useCart, fmt } from "@/lib/cart";
import { toast } from "sonner";
import { ArrowLeft, Clock, Plus, Minus, ChefHat, Check } from "lucide-react";
import { useState } from "react";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/item/$id")({
  component: ItemDetail,
});

function ItemDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["menu-item", id],
    queryFn: () => getMenuItemById(id),
  });

  const { data: restaurant } = useQuery({
    queryKey: ["restaurant-info"],
    queryFn: getRestaurantInfo,
  });

  const menuItem = data?.data;
  const currency = restaurant?.data?.currency;

  const handleAddToCart = () => {
    if (!menuItem) return;
    
    add(menuItem.id, menuItem.name, Number(menuItem.base_price), qty, [], specialInstructions || undefined);
    toast.success(`${qty}x ${menuItem.name} added to cart`);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button
          onClick={() => navigate({ to: "/" })}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to menu
        </button>

        {isLoading && (
          <div className="space-y-6">
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
          </div>
        )}

        {(error || (!isLoading && !menuItem)) && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <ChefHat className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="font-serif text-2xl text-foreground mb-2">Item Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This dish isn't available right now.
            </p>
            <button
              onClick={() => navigate({ to: "/" })}
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Browse Menu
            </button>
          </div>
        )}

        {menuItem && (
          <div className="space-y-6">
            {/* Main Card */}
            <article className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              {/* Hero Image - Use hero.jpg as fallback for testing */}
              <div className="relative aspect-[21/9] w-full overflow-hidden bg-muted">
                <img 
                  src={menuItem.image_url || heroImg} 
                  alt={menuItem.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="p-8">
                {/* Category Badge */}
                {menuItem.category && (
                  <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary uppercase tracking-wider">
                    {menuItem.category.name}
                  </span>
                )}

                {/* Title and Price */}
                <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
                  <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-foreground">{menuItem.name}</h1>
                  <span className="whitespace-nowrap font-serif text-2xl sm:text-3xl text-primary">{fmt(Number(menuItem.base_price), currency)}</span>
                </div>

                {/* Meta Info */}
                <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
                  {menuItem.preparation_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{menuItem.preparation_time} min</span>
                    </div>
                  )}
                  {menuItem.is_available ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="h-4 w-4" />
                      <span className="font-medium">Available</span>
                    </div>
                  ) : (
                    <span className="font-medium text-destructive">Currently Unavailable</span>
                  )}
                </div>

                {/* Description */}
                <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                  {menuItem.description}
                </p>

                {/* Ingredients */}
                {menuItem.ingredients && menuItem.ingredients.length > 0 && (
                  <div className="mt-8">
                    <h2 className="font-semibold text-lg text-foreground mb-3">Ingredients</h2>
                    <div className="flex flex-wrap gap-2">
                      {menuItem.ingredients.map((ing: string) => (
                        <span
                          key={ing}
                          className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1.5 text-sm text-secondary-foreground"
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allergens */}
                {menuItem.allergens && menuItem.allergens.length > 0 && (
                  <div className="mt-6">
                    <h2 className="font-semibold text-sm text-foreground mb-2">Allergen Information</h2>
                    <div className="flex flex-wrap gap-2">
                      {menuItem.allergens.map((allergen: string) => (
                        <span
                          key={allergen}
                          className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
                        >
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>

            {/* Special Instructions */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold text-lg text-foreground mb-3">
                Special Instructions (Optional)
              </h2>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Any special requests? (e.g., no onions, extra spicy)"
              />
            </div>

            {/* Add to Cart Section */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-center gap-4">
                {/* Quantity Controls */}
                <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-2">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="rounded-full p-2 hover:bg-accent hover:text-accent-foreground transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center font-semibold text-lg">{qty}</span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="rounded-full p-2 hover:bg-accent hover:text-accent-foreground transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={!menuItem.is_available}
                  className="flex-1 rounded-lg bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add to Order · {fmt(Number(menuItem.base_price) * qty, currency)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
