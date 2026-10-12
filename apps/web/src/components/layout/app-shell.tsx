import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Topbar } from "./topbar";

// The shadcn sidebar saves its open/collapsed state in this cookie; restore it on load.
const sidebarStartsOpen = () => !document.cookie.includes("sidebar_state=false");

/** Layout of the signed-in app: sidebar, top bar and the current page. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={sidebarStartsOpen()}>
      <AppSidebar />
      <SidebarInset>
        <Topbar />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
