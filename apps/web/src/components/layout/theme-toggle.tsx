import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/theme-provider";
import { Button } from "@/components/ui/button";

/** Switches between light and dark. The user menu also offers "System". */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const next = resolvedTheme === "dark" ? "light" : "dark";
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Switch to ${next} theme`}
      onClick={() => setTheme(next)}
    >
      {resolvedTheme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
