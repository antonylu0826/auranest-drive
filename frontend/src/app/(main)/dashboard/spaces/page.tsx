"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTranslations } from "@/i18n/provider";
import { spacesApi } from "@/lib/spaces-api";
import { CreateSpaceDialog } from "./_components/create-space-dialog";

export default function SpacesPage() {
  const t = useTranslations("spaces");
  const tc = useTranslations("common");
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.roleName === "ADMIN";
  const [showCreate, setShowCreate] = useState(false);

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: spacesApi.list,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="size-4 mr-1" />
            {t("newSpace")}
          </Button>
        )}
      </div>

      {isLoading && (
        <p className="text-muted-foreground text-sm">{tc("loading")}</p>
      )}

      {!isLoading && spaces.length === 0 && (
        <p className="text-muted-foreground text-sm">{t("noSpaces")}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {spaces.map((space) => (
          <Link
            key={space.id}
            href={`/dashboard/spaces/${space.id}`}
            className="flex items-start gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <FolderOpen className="size-5 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="font-medium truncate">{space.name}</p>
              {space.description && (
                <p className="text-sm text-muted-foreground truncate">{space.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      <CreateSpaceDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
