import { createContext, useContext, useEffect, useState } from "react";

type Theme =
  | "system"
  | "light"
  | "dark"
  | "retro-future-tech"
  | "urban-mysteries"
  | "micro-adventures"
  | "ai-art-experiments"
  | "digital-magic";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Try to get the saved theme from localStorage
    const savedTheme = localStorage.getItem("theme") as Theme;
    return savedTheme || "system";
  });

  useEffect(() => {
    // Save theme preference to localStorage
    localStorage.setItem("theme", theme);

    // Handle system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const root = window.document.documentElement;
      const isDark =
        theme === "dark" || (theme === "system" && mediaQuery.matches);

      // Reset light/dark classes
      root.classList.remove("light", "dark");
      root.classList.add(isDark ? "dark" : "light");

      // Reset any previously applied themed classes
      root.classList.remove(
        "theme-retro-future-tech",
        "theme-urban-mysteries",
        "theme-micro-adventures",
        "theme-ai-art-experiments",
        "theme-digital-magic",
      );

      // Apply theme-specific class for custom palettes
      switch (theme) {
        case "retro-future-tech":
          root.classList.add("theme-retro-future-tech");
          break;
        case "urban-mysteries":
          root.classList.add("theme-urban-mysteries");
          break;
        case "micro-adventures":
          root.classList.add("theme-micro-adventures");
          break;
        case "ai-art-experiments":
          root.classList.add("theme-ai-art-experiments");
          break;
        case "digital-magic":
          root.classList.add("theme-digital-magic");
          break;
        default:
          // system/light/dark → no additional theme class
          break;
      }
    };

    applyTheme();

    // Listen for system theme changes
    const listener = () => applyTheme();
    mediaQuery.addEventListener("change", listener);

    return () => mediaQuery.removeEventListener("change", listener);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { theme, setTheme } = context;

  // Determine if dark mode is active when component mounts or theme changes
  useEffect(() => {
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => {
      setIsDarkMode(
        theme === "dark" || (theme === "system" && darkModeQuery.matches),
      );
    };

    updateTheme();
    darkModeQuery.addEventListener("change", updateTheme);

    return () => {
      darkModeQuery.removeEventListener("change", updateTheme);
    };
  }, [theme]);
  return { theme, isDarkMode, setTheme };
}
