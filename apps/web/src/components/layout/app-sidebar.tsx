import { Link } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { appConfig } from "@/config/app.config";
import { AppLogo } from "./app-logo";
import { OrgSwitcher } from "./org-switcher";
import { useIsNavItemActive } from "./use-active-nav-item";
import { UserMenu } from "./user-menu";

/**
 * Main navigation from `appConfig.navItems`. Collapses to icons on desktop and becomes a sheet on
 * mobile (shadcn Sidebar).
 */
export function AppSidebar() {
  const isActive = useIsNavItemActive();
  const { setOpenMobile } = useSidebar();
  // On mobile the sidebar is a sheet over the page: close it once the user picks a page.
  const closeMobile = () => setOpenMobile(false);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/" onClick={closeMobile}>
                <AppLogo />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <nav aria-label="Main">
            <SidebarMenu>
              {appConfig.navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item)} tooltip={item.label}>
                    <Link to={item.to} onClick={closeMobile}>
                      <item.icon aria-hidden />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </nav>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
