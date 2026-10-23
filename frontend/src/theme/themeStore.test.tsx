import { act, fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getTheme,
  resetThemeStoreForTests,
  setTheme,
  subscribeTheme,
  toggleTheme,
} from "./themeStore";
import { useTheme } from "./useTheme";

const CANONICAL = "nurtureher_landing_theme";
const LEGACY_UNDERSCORE = "nurtureher_theme";
const LEGACY_DASH = "nurtureher-theme";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
  resetThemeStoreForTests();
});

describe("themeStore persistence", () => {
  it("defaults to the light theme when nothing is stored", () => {
    expect(getTheme()).toBe("light");
  });

  it("reads the canonical landing key: '1' = dark, '0' = light", () => {
    window.localStorage.setItem(CANONICAL, "1");
    expect(getTheme()).toBe("dark");
    window.localStorage.setItem(CANONICAL, "0");
    expect(getTheme()).toBe("light");
  });

  it("treats an invalid canonical value as light and never promotes a legacy key", () => {
    window.localStorage.setItem(CANONICAL, "garbage");
    window.localStorage.setItem(LEGACY_UNDERSCORE, "dark");
    expect(getTheme()).toBe("light");
  });

  it("falls back to the legacy underscore key when the canonical key is absent", () => {
    window.localStorage.setItem(LEGACY_UNDERSCORE, "dark");
    expect(getTheme()).toBe("dark");
  });

  it("falls back to the legacy dash key when canonical and underscore are absent", () => {
    window.localStorage.setItem(LEGACY_DASH, "dark");
    expect(getTheme()).toBe("dark");
  });

  it("migrates a legacy value to the canonical key without overwriting other legacy keys", () => {
    window.localStorage.setItem(LEGACY_UNDERSCORE, "dark");
    expect(getTheme()).toBe("dark");
    expect(window.localStorage.getItem(CANONICAL)).toBe("1");
    expect(window.localStorage.getItem(LEGACY_UNDERSCORE)).toBe("dark");
  });

  it("setTheme writes the canonical and legacy keys together and applies the DOM state", () => {
    setTheme("dark");
    expect(window.localStorage.getItem(CANONICAL)).toBe("1");
    expect(window.localStorage.getItem(LEGACY_UNDERSCORE)).toBe("dark");
    expect(window.localStorage.getItem(LEGACY_DASH)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.documentElement.style.getPropertyValue("--nh-bg")).toBe("27 20 48");

    setTheme("light");
    expect(window.localStorage.getItem(CANONICAL)).toBe("0");
    expect(window.localStorage.getItem(LEGACY_UNDERSCORE)).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(document.documentElement.style.getPropertyValue("--nh-bg")).toBe("255 248 250");
  });

  it("toggleTheme flips between dark and light", () => {
    expect(getTheme()).toBe("light");
    toggleTheme();
    expect(getTheme()).toBe("dark");
    toggleTheme();
    expect(getTheme()).toBe("light");
  });
});

describe("themeStore shared state (landing + app)", () => {
  it("notifies subscribers when the theme changes", () => {
    let seen = "";
    const unsubscribe = subscribeTheme(() => {
      seen = getTheme();
    });
    setTheme("dark");
    expect(seen).toBe("dark");
    setTheme("light");
    expect(seen).toBe("light");
    unsubscribe();
  });

  it("keeps useTheme consumers in sync with the singleton", () => {
    function Probe() {
      const { theme } = useTheme();
      return <span data-testid="theme">{theme}</span>;
    }
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("theme")).toHaveTextContent("light");

    act(() => setTheme("dark"));
    expect(getByTestId("theme")).toHaveTextContent("dark");
  });

  it("applies dark mode to <html> so Tailwind dark: variants follow the store", () => {
    function Probe() {
      const { toggleTheme } = useTheme();
      return (
        <button type="button" onClick={toggleTheme}>
          flip
        </button>
      );
    }
    const { getByRole } = render(<Probe />);
    fireEvent.click(getByRole("button", { name: "flip" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
