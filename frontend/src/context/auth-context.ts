import { createContext } from "react";
import { User } from "@/lib/api";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: { email: string; name: string; password: string; phone?: string; role?: string; preferred_language?: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);