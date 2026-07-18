import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type ReactNode } from 'react';

export const fmt = (n: number) => `$${n.toFixed(2)}`;

export interface CartItemVariant {
  variant_id: string;
  variant_name: string;
  option_id: string;
  option_name: string;
  price_modifier: number;
}

export interface CartItem {
  id: string; // Unique ID for cart item (menuItemId + variants hash)
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  selectedVariants: CartItemVariant[];
  specialInstructions?: string;
  itemTotal: number; // Total price for this item (base + variants) * quantity
}

interface CartStore {
  items: CartItem[];
  
  // Actions
  add: (
    id: string,
    name: string,
    price: number,
    quantity?: number,
    selectedVariants?: CartItemVariant[],
    specialInstructions?: string
  ) => void;
  
  remove: (cartItemId: string) => void;
  
  updateQuantity: (cartItemId: string, quantity: number) => void;
  
  updateInstructions: (cartItemId: string, instructions: string) => void;
  
  clear: () => void;
  
  // Computed values
  count: number;
  total: number;
}

// Helper function to generate unique cart item ID
const generateCartItemId = (menuItemId: string, variants: CartItemVariant[]): string => {
  const variantIds = variants
    .map((v) => `${v.variant_id}-${v.option_id}`)
    .sort()
    .join('_');
  return `${menuItemId}_${variantIds || 'no-variants'}`;
};

// Helper function to calculate item total
const calculateItemTotal = (basePrice: number, variants: CartItemVariant[], quantity: number): number => {
  const variantsTotal = variants.reduce((sum, v) => sum + v.price_modifier, 0);
  return (basePrice + variantsTotal) * quantity;
};

const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      count: 0,
      total: 0,

      add: (id, name, price, quantity = 1, selectedVariants = [], specialInstructions) => {
        const cartItemId = generateCartItemId(id, selectedVariants);
        const existingItem = get().items.find((item) => item.id === cartItemId);

        if (existingItem) {
          // Item with same variants exists, update quantity
          set((state) => {
            const newItems = state.items.map((item) =>
              item.id === cartItemId
                ? {
                    ...item,
                    quantity: item.quantity + quantity,
                    itemTotal: calculateItemTotal(
                      price,
                      selectedVariants,
                      item.quantity + quantity
                    ),
                    specialInstructions: specialInstructions || item.specialInstructions,
                  }
                : item
            );
            return {
              items: newItems,
              count: newItems.reduce((total, item) => total + item.quantity, 0),
              total: newItems.reduce((total, item) => total + item.itemTotal, 0),
            };
          });
        } else {
          // New item, add to cart
          const newItem: CartItem = {
            id: cartItemId,
            menuItemId: id,
            name,
            price,
            quantity,
            selectedVariants,
            specialInstructions,
            itemTotal: calculateItemTotal(price, selectedVariants, quantity),
          };

          set((state) => {
            const newItems = [...state.items, newItem];
            return {
              items: newItems,
              count: newItems.reduce((total, item) => total + item.quantity, 0),
              total: newItems.reduce((total, item) => total + item.itemTotal, 0),
            };
          });
        }
      },

      remove: (cartItemId) => {
        set((state) => {
          const newItems = state.items.filter((item) => item.id !== cartItemId);
          return {
            items: newItems,
            count: newItems.reduce((total, item) => total + item.quantity, 0),
            total: newItems.reduce((total, item) => total + item.itemTotal, 0),
          };
        });
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().remove(cartItemId);
          return;
        }

        set((state) => {
          const newItems = state.items.map((item) =>
            item.id === cartItemId
              ? {
                  ...item,
                  quantity,
                  itemTotal: calculateItemTotal(
                    item.price,
                    item.selectedVariants,
                    quantity
                  ),
                }
              : item
          );
          return {
            items: newItems,
            count: newItems.reduce((total, item) => total + item.quantity, 0),
            total: newItems.reduce((total, item) => total + item.itemTotal, 0),
          };
        });
      },

      updateInstructions: (cartItemId, instructions) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === cartItemId
              ? { ...item, specialInstructions: instructions }
              : item
          ),
        }));
      },

      clear: () => {
        set({ items: [], count: 0, total: 0 });
      },
    }),
    {
      name: 'bistro-cart-v1', // localStorage key
    }
  )
);

export function useCart() {
  return useCartStore();
}

// Legacy CartProvider for compatibility - no longer needed with Zustand
export function CartProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
