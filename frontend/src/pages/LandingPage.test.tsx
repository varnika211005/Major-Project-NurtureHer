import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "@/context/LanguageContext";
import LandingPage from "./landing/LandingPage";

afterEach(() => cleanup());

function renderLanding() {
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </LanguageProvider>,
  );
}

describe("LandingPage", () => {
  it("renders the hero and auth entry points", () => {
    renderLanding();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Support.*stays.*her\./);
    const loginLinks = screen.getAllByRole("link", { name: "Login" });
    expect(loginLinks.length).toBeGreaterThan(0);
    for (const link of loginLinks) expect(link).toHaveAttribute("href", "/login");
    const registerLinks = screen.getAllByRole("link", { name: /Register|Get Started/ });
    expect(registerLinks.length).toBeGreaterThan(0);
    for (const link of registerLinks) expect(link).toHaveAttribute("href", "/register");
  });

  it("opens the menu overlay and the talk modal", async () => {
    const user = userEvent.setup();
    renderLanding();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: /talk to us/i })[0]);
    expect(screen.getByRole("dialog", { name: "Let’s talk it through" })).toBeInTheDocument();
  });

  it("runs the demo quiz and records a run", async () => {
    const user = userEvent.setup();
    renderLanding();
    expect(document.getElementById("demo")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Mostly well" }));
    await user.click(screen.getByRole("button", { name: "Mostly good" }));
    await user.click(screen.getByRole("button", { name: "Yes, easily" }));
    await user.click(screen.getByRole("button", { name: /^Run$/ }));
    expect(await screen.findByText("Steady for now")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Runs" }));
    expect(screen.getByText("0 / 6")).toBeInTheDocument();
  });

  it("toggles the landing theme and persists it", async () => {
    const user = userEvent.setup();
    window.localStorage.removeItem("nurtureher_landing_theme");
    const { container } = renderLanding();
    const root = container.querySelector(".nh-landing") as HTMLElement;
    expect(root.style.getPropertyValue("--bg")).toBe("#FFF8FA");
    await user.click(screen.getByRole("button", { name: "Switch dark or light mode" }));
    expect(root.style.getPropertyValue("--bg")).toBe("#1B1430");
    expect(window.localStorage.getItem("nurtureher_landing_theme")).toBe("1");
    window.localStorage.removeItem("nurtureher_landing_theme");
  });

  it("falls back to the light theme for invalid stored values", () => {
    window.localStorage.setItem("nurtureher_landing_theme", "garbage");
    const { container, unmount } = renderLanding();
    const root = container.querySelector(".nh-landing") as HTMLElement;
    expect(root.style.getPropertyValue("--bg")).toBe("#FFF8FA");
    unmount();
    window.localStorage.removeItem("nurtureher_landing_theme");
  });

  it("renders Hindi copy when the app language is Hindi", () => {
    window.localStorage.setItem("nurtureher_language", "hi");
    try {
      renderLanding();
      const ctaLinks = screen.getAllByRole("link", { name: "शुरू करें" });
      expect(ctaLinks.length).toBeGreaterThan(0);
      for (const link of ctaLinks) expect(link).toHaveAttribute("href", "/register");
      expect(screen.getByText("चेक-इन ऐप")).toBeInTheDocument();
    } finally {
      window.localStorage.removeItem("nurtureher_language");
    }
  });

  it("steps the WHY cards on click and on wheel without trapping scroll", async () => {
    const user = userEvent.setup();
    renderLanding();
    const secondButton = screen.getByRole("button", { name: /Gentle guidance/ });
    expect(secondButton).toHaveAttribute("aria-pressed", "false");
    await user.click(secondButton);
    expect(secondButton).toHaveAttribute("aria-pressed", "true");
    const { fireEvent } = await import("@testing-library/react");
    const track = document.getElementById("why-hover") as HTMLElement;
    fireEvent.wheel(track, { deltaY: 120 });
    const thirdButton = screen.getByRole("button", { name: /Early awareness/ });
    expect(thirdButton).toHaveAttribute("aria-pressed", "true");
  });

  it("shows a readable Guide Assistant popup and both buttons work", async () => {
    const user = userEvent.setup();
    renderLanding();
    const dialog = await screen.findByRole("dialog", { name: "Guide Assistant" }, { timeout: 8000 });
    expect(dialog).toHaveStyle({ background: "var(--surface)", color: "var(--ink)" });
    const dismiss = screen.getByRole("button", { name: "Dismiss" });
    expect(dismiss).toHaveStyle({ color: "var(--ink)" });
    const accept = screen.getByRole("button", { name: "Accept" });
    expect(accept).toHaveStyle({ background: "#F3C6C0", color: "#3A2750" });
    await user.click(dismiss);
    expect(screen.queryByRole("dialog", { name: "Guide Assistant" })).not.toBeInTheDocument();
  });

  it("accepting the Guide Assistant switches to the Guide tab", async () => {
    const user = userEvent.setup();
    renderLanding();
    await screen.findByRole("dialog", { name: "Guide Assistant" }, { timeout: 8000 });
    await user.click(screen.getByRole("button", { name: "Accept" }));
    expect(screen.queryByRole("dialog", { name: "Guide Assistant" })).not.toBeInTheDocument();
    expect(screen.getByText(/Take it one question at a time/)).toBeInTheDocument();
  });

  it("switches FAQ tabs and toggles answers", async () => {
    const user = userEvent.setup();
    renderLanding();
    await user.click(screen.getByRole("button", { name: "PCOS" }));
    expect(screen.getByRole("button", { name: /common signs of PCOS/i })).toBeInTheDocument();
    // First item is open by default after switching tabs.
    expect(screen.getByText(/Symptoms vary from person to person/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /how is PCOS diagnosed/i }));
    expect(screen.getByText(/physical exam, blood tests/)).toBeInTheDocument();
  });
});
