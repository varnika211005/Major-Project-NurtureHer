import { createContext } from "react";
import { LoginIdentifiers, RegisterPayload, User, UserRole } from "@/lib/api";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
    portal?: UserRole,
    identifiers?: LoginIdentifiers,
  ) => Promise<void>;
  signUp: (payload: RegisterPayload) => Promise<User | void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);