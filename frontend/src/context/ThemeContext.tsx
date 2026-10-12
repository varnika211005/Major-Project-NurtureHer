import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode =
  | "light"
  | "dark"
  | "lilac"
  | "ocean"
  | "mint"
  | "sunrise";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem("nurtureher-theme");

    if (
      savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "lilac" ||
      savedTheme === "ocean" ||
      savedTheme === "mint" ||
      savedTheme === "sunrise"
    ) {
      return savedTheme;
    }

    return "light";
  });

  const setTheme = (nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    localStorage.setItem("nurtureher-theme", nextTheme);
  };

  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove(
      "light",
      "dark",
      "theme-lilac",
      "theme-ocean",
      "theme-mint",
      "theme-sunrise"
    );

    if (theme === "light" || theme === "dark") {
      root.classList.add(theme);
    } else {
      root.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}