import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import {
  readThemeCookie,
  resolveThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
  writeThemeCookie,
} from "@/lib/theme-cookie";

export type Theme = ThemePreference;

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function currentTheme(): Theme {
  return resolveThemePreference(document.cookie, readStorage());
}

interface ThemeProviderProps {
  children: ReactNode;
  /** The Gateway's hostname, from `GATEWAY_URL`; null standalone. */
  gatewayHost: string | null;
}

export function ThemeProvider({ children, gatewayHost }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [system, setSystem] = useState<"light" | "dark">("light");
  const [hydrated, setHydrated] = useState(false);
  const resolvedTheme = theme === "system" ? system : theme;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystem(media.matches ? "dark" : "light");
    // A pick made in another app's tab fires no event here: read the cookie
    // again when this tab comes back.
    const onVisible = () => {
      if (document.visibilityState === "visible") setThemeState(currentTheme());
    };
    setThemeState(currentTheme());
    update();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", onVisible);
    setHydrated(true);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // A pick saved here before the cookie existed joins the cookie, once.
  useEffect(() => {
    const own = currentTheme();
    if (own !== "system" && !readThemeCookie(document.cookie)) {
      writeThemeCookie(own, gatewayHost);
    }
  }, [gatewayHost]);

  useIsomorphicLayoutEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [hydrated, resolvedTheme]);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      writeThemeCookie(nextTheme, gatewayHost);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // Storage blocked: the cookie, if any, still holds it.
      }
      setThemeState(nextTheme);
    },
    [gatewayHost],
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, setTheme, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
