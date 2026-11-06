import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { cart as cartApi } from '../api';
import { useAuth } from './AuthContext';
import * as guest from '../utils/guestCart';

const CartContext = createContext(null);

const fromServer = (c) => ({
  items: c.items.map((l) => ({
    id: l.itemId, productId: l.product, slug: l.slug, name: l.productName, image: l.image, sku: l.sku,
    label: l.variantLabel, unitPrice: l.unitPrice, quantity: l.quantity, stock: l.stock, issue: l.issue,
  })),
  subtotal: c.subtotal, shippingFee: c.shippingFee, totalAmount: c.totalAmount, hasIssues: c.hasIssues,
});

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ items: [], subtotal: 0, shippingFee: null, totalAmount: null, hasIssues: false });
  const [loading, setLoading] = useState(true);
  const merged = useRef(null);

  const refresh = useCallback(async () => {
    if (user) {
      try { setState(fromServer((await cartApi.get()).cart)); } finally { setLoading(false); }
    } else {
      const items = guest.load();
      setState({ items, subtotal: guest.subtotal(items), shippingFee: null, totalAmount: null, hasIssues: false });
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      if (user && merged.current !== user.id) {
        merged.current = user.id;
        const items = guest.load();
        if (items.length) {
          try {
            await cartApi.merge(items.map((i) => ({ productId: i.productId, variantSku: i.sku, quantity: i.quantity })));
            guest.clear();
          } catch { /* keep guest cart if merge fails */ }
        }
      }
      if (!user) merged.current = null;
      await refresh().catch(() => setLoading(false));
    })();
  }, [user, authLoading, refresh]);

  // product: {id, slug, name, images/image}, variant: {sku, label, price, stock}
  const add = useCallback(async (product, variant, quantity = 1) => {
    if (user) {
      setState(fromServer((await cartApi.add({ productId: product.id, variantSku: variant.sku, quantity })).cart));
    } else {
      const items = guest.addItem(guest.load(), {
        productId: product.id, slug: product.slug, name: product.name, image: product.image, sku: variant.sku,
        label: variant.label, unitPrice: variant.price, stock: variant.stock, quantity,
      });
      guest.save(items);
      setState({ items, subtotal: guest.subtotal(items), shippingFee: null, totalAmount: null, hasIssues: false });
    }
  }, [user]);

  const setQuantity = useCallback(async (id, quantity) => {
    if (user) setState(fromServer((await cartApi.update(id, quantity)).cart));
    else { const items = guest.setQuantity(guest.load(), id, quantity); guest.save(items); setState((s) => ({ ...s, items, subtotal: guest.subtotal(items) })); }
  }, [user]);

  const remove = useCallback(async (id) => {
    if (user) setState(fromServer((await cartApi.remove(id)).cart));
    else { const items = guest.removeItem(guest.load(), id); guest.save(items); setState((s) => ({ ...s, items, subtotal: guest.subtotal(items) })); }
  }, [user]);

  const value = useMemo(
    () => ({ ...state, loading, count: guest.count(state.items), add, setQuantity, remove, refresh }),
    [state, loading, add, setQuantity, remove, refresh]
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
