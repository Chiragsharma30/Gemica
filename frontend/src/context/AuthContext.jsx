import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    auth.me().then((d) => alive && setUser(d.user)).catch(() => alive && setUser(null)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const login = useCallback(async (body) => { const d = await auth.login(body); setUser(d.user); return d.user; }, []);
  const register = useCallback(async (body) => { const d = await auth.register(body); setUser(d.user); return d.user; }, []);
  const logout = useCallback(async () => { await auth.logout().catch(() => {}); setUser(null); }, []);

  const updateProfile = useCallback(async (name) => { const d = await auth.updateProfile(name); setUser(d.user); return d.user; }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout, updateProfile, isAdmin: user?.role === 'admin' }), [user, loading, login, register, logout, updateProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
