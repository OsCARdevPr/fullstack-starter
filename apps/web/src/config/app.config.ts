/**
 * APP CONFIG — edit this file (and styles/theme.css) to rebrand the app.
 * The sidebar, the sign-in screens and the page title read from here.
 */
import type { LinkProps } from "@tanstack/react-router";
import { Boxes, FolderKanban, LayoutDashboard, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  /** Route path; type-checked against the routes in src/routes. */
  to: NonNullable<LinkProps["to"]>;
  icon: LucideIcon;
}

export interface AppConfig {
  name: string;
  logo: { icon: LucideIcon; text: string };
  /** Main navigation, in sidebar order. */
  navItems: NavItem[];
}

const name = import.meta.env.VITE_APP_NAME?.trim() || "Fullstack Starter";

export const appConfig: AppConfig = {
  name,
  logo: { icon: Boxes, text: name },
  navItems: [
    { label: "Dashboard", to: "/", icon: LayoutDashboard },
    { label: "Projects", to: "/projects", icon: FolderKanban },
  ],
};
