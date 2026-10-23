import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { RequireRole } from "./RequireRole";
import { AuthContext, AuthContextValue } from "@/context/auth-context";
import type { User, UserRole } from "@/lib/api";

function authFor(role: UserRole): AuthContextValue {
  const user: User = {
    id: "guard-user",
    name: "Guard User",
    email: "guard@example.com",
    phone: null,
    role,
    preferred_language: "en",
    is_verified: true,
    is_active: true,
  };
  return {
    user,
    loading: false,
    signIn: async () => undefined,
    signUp: async () => undefined,
    signOut: async () => undefined,
  };
}

function renderGuard(role: UserRole) {
  return render(
    <AuthContext.Provider value={authFor(role)}>
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RequireRole roles={["admin"]}>
                <div>Admin console</div>
              </RequireRole>
            }
          />
          <Route path="/" element={<div>Role home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

afterEach(cleanup);

describe("RequireRole", () => {
  it("renders the protected route for an allowed role", () => {
    renderGuard("admin");
    expect(screen.getByText("Admin console")).toBeInTheDocument();
  });

  it("redirects a signed-in user without the required role", () => {
    renderGuard("mother");
    expect(screen.queryByText("Admin console")).not.toBeInTheDocument();
    expect(screen.getByText("Role home")).toBeInTheDocument();
  });
});
