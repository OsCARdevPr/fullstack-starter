import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  /** The user's choice. */
  theme: Theme;
  /** What is shown: the system preference resolved to light or dark. */
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

// Also read by the inline script in index.html, which applies the theme before React loads.
const STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function subscribeToSystemTheme(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const prefersDark = () => window.matchMedia(DARK_QUERY).matches;

/** Light, dark or system theme, saved in localStorage and applied as a class on <html>. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const systemDark = useSyncExternalStore(subscribeToSystemTheme, prefersDark);
  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the choice still applies to this visit.
    }
    setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
}
