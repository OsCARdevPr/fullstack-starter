import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./theme-toggle";
import { useActiveNavItem } from "./use-active-nav-item";

/** Bar above every page: sidebar toggle, current section and theme switch. */
export function Topbar() {
  const section = useActiveNavItem();
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4 self-center!" />
      {section && <span className="truncate text-sm font-medium">{section.label}</span>}
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  );
}
