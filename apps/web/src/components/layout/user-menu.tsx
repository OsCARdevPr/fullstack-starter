import { ChevronsUpDown, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { type Theme, useTheme } from "@/app/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useMe, useSignOut } from "@/features/auth/api";
import { getInitials } from "@/lib/format";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const satisfies { value: Theme; label: string; icon: unknown }[];

/** Signed-in user at the bottom of the sidebar: theme choice and sign out. */
export function UserMenu() {
  const { user } = useMe();
  const { theme, setTheme } = useTheme();
  const signOut = useSignOut();
  const { isMobile } = useSidebar();

  const identity = (
    <>
      <Avatar className="size-8 rounded-lg">
        {user.image && <AvatarImage src={user.image} alt="" />}
        <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <span className="grid flex-1 text-left leading-tight">
        <span className="truncate font-medium">{user.name}</span>
        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
      </span>
    </>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              {identity}
              <ChevronsUpDown className="ml-auto" aria-hidden />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
            className="min-w-56"
          >
            <DropdownMenuLabel className="flex items-center gap-2 font-normal">
              {identity}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => {
                const option = THEME_OPTIONS.find((candidate) => candidate.value === value);
                if (option) setTheme(option.value);
              }}
            >
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  <Icon aria-hidden />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={signOut.isPending} onSelect={() => signOut.mutate()}>
              <LogOut aria-hidden />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
