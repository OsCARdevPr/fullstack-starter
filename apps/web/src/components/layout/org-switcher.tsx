import type { OrganizationSummary } from "@starter/contracts";
import { useQuery } from "@tanstack/react-query";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useMe } from "@/features/auth/api";
import { organizationsQueryOptions, useSetActiveOrganization } from "@/features/organizations/api";
import { CreateOrganizationDialog } from "@/features/organizations/components/create-organization-dialog";

/**
 * The active organization. Multi tenancy mode: a menu to switch or create organizations.
 * Single mode: just the organization name, since every user shares the default organization.
 */
export function OrgSwitcher() {
  const { organization, tenancyMode } = useMe();

  if (tenancyMode === "single") {
    if (!organization) return null;
    return (
      <div className="flex h-8 items-center gap-2 px-2 text-sm text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
        <Building2 className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{organization.name}</span>
      </div>
    );
  }
  return <OrganizationMenu active={organization} />;
}

function OrganizationMenu({ active }: { active: OrganizationSummary | null }) {
  const organizations = useQuery(organizationsQueryOptions());
  const setActive = useSetActiveOrganization();
  const [creating, setCreating] = useState(false);
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* Not modal: a modal menu that opens a dialog can leave the page unclickable. */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent">
              <Building2 aria-hidden />
              <span className="truncate">{active?.name ?? "Select an organization"}</span>
              <ChevronsUpDown className="ml-auto" aria-hidden />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={4}
            className="min-w-56"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organizations
            </DropdownMenuLabel>
            {organizations.isPending && <DropdownMenuItem disabled>Loading…</DropdownMenuItem>}
            {organizations.data?.map((organization) => (
              <DropdownMenuItem
                key={organization.id}
                disabled={setActive.isPending}
                onSelect={() => {
                  if (organization.id !== active?.id) setActive.mutate(organization.id);
                }}
              >
                <Building2 aria-hidden />
                <span className="truncate">{organization.name}</span>
                {organization.id === active?.id && <Check className="ml-auto" aria-hidden />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setCreating(true)}>
              <Plus aria-hidden />
              Create organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <CreateOrganizationDialog open={creating} onOpenChange={setCreating} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
