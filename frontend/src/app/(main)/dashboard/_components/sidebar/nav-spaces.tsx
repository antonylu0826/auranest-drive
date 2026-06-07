"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTranslations } from "@/i18n/provider";
import { spacesApi } from "@/lib/spaces-api";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { CreateSpaceDialog } from "../../spaces/_components/create-space-dialog";

export function NavSpaces() {
  const path = usePathname();
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.roleNames?.includes("ADMIN") ?? false;
  const t = useTranslations("sidebar");
  const [showCreate, setShowCreate] = useState(false);

  const { data: spaces = [] } = useQuery({
    queryKey: ["spaces"],
    queryFn: spacesApi.list,
    staleTime: 300_000,
  });

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>{t("spaces")}</SidebarGroupLabel>
        {isAdmin && (
          <SidebarGroupAction title={t("createSpace")} onClick={() => setShowCreate(true)}>
            <Plus />
          </SidebarGroupAction>
        )}
        <SidebarMenu>
          {spaces.map((space) => (
            <SidebarMenuItem key={space.id}>
              <SidebarMenuButton
                asChild
                isActive={path.startsWith(`/dashboard/spaces/${space.id}`)}
                tooltip={space.name}
              >
                <Link prefetch={false} href={`/dashboard/spaces/${space.id}`}>
                  <FolderOpen />
                  <span>{space.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {spaces.length === 0 && (
            <p className="px-2 py-1 text-xs text-sidebar-foreground/50">
              {isAdmin ? t("createSpace") : "—"}
            </p>
          )}
        </SidebarMenu>
      </SidebarGroup>
      {isAdmin && (
        <CreateSpaceDialog open={showCreate} onOpenChange={setShowCreate} />
      )}
    </>
  );
}
