import { useMatchRoute } from "@tanstack/react-router";
import { appConfig, type NavItem } from "@/config/app.config";

/**
 * Tells whether a nav item is the current section. "/" is active only on itself; other items
 * also on their sub-pages ("/projects/123" keeps "Projects" active).
 */
export function useIsNavItemActive(): (item: NavItem) => boolean {
  const matchRoute = useMatchRoute();
  return (item) => Boolean(matchRoute({ to: item.to, fuzzy: item.to !== "/" }));
}

/** The nav item of the current section, if any. */
export function useActiveNavItem(): NavItem | undefined {
  const isActive = useIsNavItemActive();
  return appConfig.navItems.find(isActive);
}
