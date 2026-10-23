import { ReactNode, useEffect, useState } from "react";
import { api, hasTokens, setTokens, User, UserRole, LoginIdentifiers, RegisterPayload } from "@/lib/api";
import { AuthContext } from "@/context/auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasTokens()) {
      setLoading(false);
      return;
    }
    api.me().then(setUser).catch(() => setTokens(null)).finally(() => setLoading(false));
  }, []);

  async function signIn(
    email: string,
    password: string,
    portal?: UserRole,
    identifiers?: LoginIdentifiers,
  ) {
    const tokens =
      portal === "admin"
        ? await api.adminLogin(email, password)
        : await api.login(email, password, portal, identifiers);
    setTokens(tokens);
    setUser(await api.me());
  }

  async function signUp(payload: RegisterPayload): Promise<User> {
    const createdUser = await api.register(payload);
    return createdUser;
  }

  async function signOut() {
    try { await api.logout(); } finally { setTokens(null); setUser(null); }
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}