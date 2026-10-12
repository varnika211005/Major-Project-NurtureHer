import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { AuthContext } from "./context/auth-context";
import { LanguageProvider } from "./context/LanguageContext";

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, me: vi.fn().mockRejectedValue(new Error("no session")) } };
});

afterEach(() => cleanup());

function renderAppAt(path: string) {
  return render(
    <LanguageProvider>
      <AuthContext.Provider
        value={{
          user: null,
          loading: false,
          signIn: async () => undefined,
          signUp: async () => undefined,
          signOut: async () => undefined,
        }}
      >
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </AuthContext.Provider>
    </LanguageProvider>,
  );
}

describe("public routing (logged out)", () => {
  it("renders the landing page at /", async () => {
    const { container } = renderAppAt("/");
    // LandingPage arrives via a lazy chunk; allow extra time under parallel workers.
    const registerLinks = await screen.findAllByRole("link", { name: "Register" }, { timeout: 8000 });
    expect(registerLinks.length).toBeGreaterThan(0);
    for (const link of registerLinks) expect(link).toHaveAttribute("href", "/register");
    expect(container.querySelector(".nh-landing")).not.toBeNull();
    expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
  });

  it("renders the existing login page at /login", async () => {
    const { container } = renderAppAt("/login");
    expect(await screen.findByText("Welcome back")).toBeInTheDocument();
    expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();
    expect(container.querySelector(".nh-auth")).not.toBeNull();
  });

  it("renders the existing registration page at /register", async () => {
    const { container } = renderAppAt("/register");
    expect(await screen.findByRole("heading", { name: "Create your account" })).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(container.querySelector(".nh-auth")).not.toBeNull();
  });

  it("paints the viewport background on body only while an auth page is mounted", async () => {
    const { unmount } = renderAppAt("/login");
    expect(await screen.findByText("Welcome back")).toBeInTheDocument();
    expect(document.body.classList.contains("nh-auth-bg")).toBe(true);
    unmount();
    expect(document.body.classList.contains("nh-auth-bg")).toBe(false);
  });
});
