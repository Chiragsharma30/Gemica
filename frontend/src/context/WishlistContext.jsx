import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { wishlist as api } from '../api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { setItems([]); return undefined; }
    let alive = true;
    setLoading(true);
    api.get().then((d) => alive && setItems(d.items)).catch(() => {}).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [user]);

  const has = useCallback((id) => items.some((p) => p.id === id), [items]);
  const toggle = useCallback(async (productId) => {
    const d = has(productId) ? await api.remove(productId) : await api.add(productId);
    setItems(d.items);
  }, [has]);

  const value = useMemo(() => ({ items, loading, has, toggle }), [items, loading, has, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
