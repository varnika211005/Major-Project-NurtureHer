import { ReactNode, useEffect, useState } from "react";
import { api, setTokens, User } from "@/lib/api";
import { AuthContext } from "@/context/auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then(setUser).catch(() => setTokens(null)).finally(() => setLoading(false));
  }, []);

  async function signIn(email: string, password: string) {
    const tokens = await api.login(email, password);
    setTokens(tokens);
    setUser(await api.me());
  }

  async function signUp(payload: { email: string; name: string; password: string; phone?: string; role?: string; preferred_language?: string }) {
    await api.register(payload);
    await signIn(payload.email, payload.password);
  }

  async function signOut() {
    try { await api.logout(); } finally { setTokens(null); setUser(null); }
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}