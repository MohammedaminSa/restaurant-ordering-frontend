
-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);

-- Menu items
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  prep_minutes INT NOT NULL DEFAULT 15,
  available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX menu_items_category_idx ON public.menu_items(category_id);
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Menu items are viewable by everyone" ON public.menu_items FOR SELECT USING (true);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_idx ON public.orders(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create their own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));
CREATE POLICY "Users add items to their own orders" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));

-- Seed
INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Starters', 'starters', 1),
  ('Mains', 'mains', 2),
  ('Pasta & Risotto', 'pasta', 3),
  ('Desserts', 'desserts', 4),
  ('Drinks', 'drinks', 5);

INSERT INTO public.menu_items (category_id, name, description, price, ingredients, prep_minutes, sort_order) VALUES
  ((SELECT id FROM public.categories WHERE slug='starters'), 'Burrata & Heirloom Tomato', 'Creamy burrata with vine-ripened tomatoes, basil oil and toasted sourdough.', 14.00, ARRAY['burrata','tomato','basil','sourdough','olive oil'], 8, 1),
  ((SELECT id FROM public.categories WHERE slug='starters'), 'Truffle Arancini', 'Crispy saffron risotto balls with black truffle and parmesan aioli.', 12.00, ARRAY['arborio rice','truffle','parmesan','saffron'], 12, 2),
  ((SELECT id FROM public.categories WHERE slug='mains'), 'Pan-Seared Sea Bass', 'Mediterranean sea bass with lemon-caper butter and roasted fennel.', 28.00, ARRAY['sea bass','lemon','capers','fennel','butter'], 20, 1),
  ((SELECT id FROM public.categories WHERE slug='mains'), 'Wagyu Ribeye', '10oz grass-fed ribeye, rosemary jus, confit potato.', 42.00, ARRAY['wagyu beef','rosemary','potato','garlic'], 25, 2),
  ((SELECT id FROM public.categories WHERE slug='pasta'), 'Wild Mushroom Tagliatelle', 'House-made tagliatelle, porcini, thyme cream, aged parmesan.', 22.00, ARRAY['tagliatelle','porcini','thyme','cream','parmesan'], 15, 1),
  ((SELECT id FROM public.categories WHERE slug='pasta'), 'Lobster Risotto', 'Carnaroli risotto with butter-poached lobster and chive oil.', 32.00, ARRAY['carnaroli rice','lobster','chive','butter','shallot'], 22, 2),
  ((SELECT id FROM public.categories WHERE slug='desserts'), 'Dark Chocolate Fondant', 'Warm 70% cacao fondant with vanilla bean gelato.', 11.00, ARRAY['dark chocolate','egg','butter','vanilla'], 14, 1),
  ((SELECT id FROM public.categories WHERE slug='desserts'), 'Tiramisu', 'Classic mascarpone tiramisu with espresso-soaked ladyfingers.', 10.00, ARRAY['mascarpone','espresso','ladyfingers','cocoa'], 5, 2),
  ((SELECT id FROM public.categories WHERE slug='drinks'), 'House Red Wine', 'Glass of Tuscan Sangiovese blend.', 9.00, ARRAY['sangiovese'], 2, 1),
  ((SELECT id FROM public.categories WHERE slug='drinks'), 'Sparkling Water', 'Italian sparkling mineral water, 750ml.', 5.00, ARRAY['mineral water'], 1, 2);
