import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "./LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "./language-context";
import { useLanguage } from "./useLanguage";

function Probe() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="dashboard-label">{t.nav.dashboard}</span>
      <button type="button" onClick={() => setLanguage("hi")}>
        switch
      </button>
    </div>
  );
}

describe("LanguageProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = "en";
  });

  afterEach(cleanup);

  it("defaults to English and syncs document language", () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("language").textContent).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("switches language, translations, storage, and document language together", () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "switch" }));

    expect(screen.getByTestId("language").textContent).toBe("hi");
    expect(screen.getByTestId("dashboard-label").textContent).toBe("डैशबोर्ड");
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("hi");
    expect(document.documentElement.lang).toBe("hi");
  });

  it("restores a supported stored language", () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "ta");

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("language").textContent).toBe("ta");
    expect(document.documentElement.lang).toBe("ta");
  });

  it("ignores unsupported stored languages", () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "fr");

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("language").textContent).toBe("en");
  });
});
