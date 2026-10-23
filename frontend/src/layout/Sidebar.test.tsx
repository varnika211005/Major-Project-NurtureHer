import { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";
import { Sidebar } from "./Sidebar";
import { AuthContext, AuthContextValue } from "@/context/auth-context";
import { LanguageProvider } from "@/context/LanguageContext";
import type { User } from "@/lib/api";

const motherUser: User = {
  id: "user-1",
  name: "Ananya Sharma",
  email: "mother@nurtureher.com",
  phone: null,
  role: "mother",
  preferred_language: "en",
  is_verified: true,
  is_active: true,
};

const authValue: AuthContextValue = {
  user: motherUser,
  loading: false,
  signIn: async () => undefined,
  signUp: async () => undefined,
  signOut: async () => undefined,
};

/** jsdom's matchMedia always reports false; simulate desktop vs mobile widths. */
function mockViewport(desktop: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: desktop && query.includes("min-width: 1024px"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

function renderSidebar(props: Partial<ComponentProps<typeof Sidebar>> = {}, onClose = () => {}) {
  return render(
    <LanguageProvider>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={["/"]}>
          <Sidebar
            open={false}
            collapsed={false}
            onToggleCollapsed={() => {}}
            onToggle={() => {}}
            onClose={onClose}
            {...props}
          />
        </MemoryRouter>
      </AuthContext.Provider>
    </LanguageProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Sidebar responsive layout", () => {
  it("shows labels, section headings and the profile card when expanded on desktop", () => {
    mockViewport(true);
    renderSidebar({ collapsed: false });
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText(/Ananya Sharma/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "NurtureHer" })).toBeInTheDocument();
    expect(screen.getByTestId("brand-wordmark")).toHaveTextContent("NurtureHer");
    expect(screen.getByTestId("brand-emblem").querySelector("img")).toHaveAttribute("src", "/nurtureher-logo.png");
  });

  it("collapses to icon-only navigation with accessible labels and tooltips trigger", () => {
    mockViewport(true);
    renderSidebar({ collapsed: true });
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "AI Health Coach" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cycle Tracker" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Logout" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "NurtureHer" })).toBeInTheDocument();
    expect(screen.getByTestId("brand-icon").querySelector("img")).toHaveAttribute("src", "/nurtureher-icon.png");
    expect(screen.queryByTestId("brand-wordmark")).not.toBeInTheDocument();
  });

  it("keeps full labels inside the mobile drawer even when collapsed", () => {
    mockViewport(false);
    renderSidebar({ collapsed: true, open: true });
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("brand-wordmark")).toHaveTextContent("NurtureHer");
    expect(screen.queryByRole("button", { name: "Open navigation" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Close navigation" }).length).toBeGreaterThanOrEqual(1);
  });

  it("closes the mobile drawer on Escape", () => {
    mockViewport(false);
    const onClose = vi.fn();
    renderSidebar({ collapsed: false, open: true }, onClose);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("AppShell sidebar persistence", () => {
  it("restores and updates the collapsed preference in localStorage", () => {
    mockViewport(true);
    window.localStorage.setItem("nurtureher_sidebar_collapsed", "1");
    render(
      <LanguageProvider>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={["/"]}>
            <AppShell>
              <div />
            </AppShell>
          </MemoryRouter>
        </AuthContext.Provider>
      </LanguageProvider>,
    );
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(window.localStorage.getItem("nurtureher_sidebar_collapsed")).toBe("0");
  });
});
