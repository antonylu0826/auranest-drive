"use client";

import { Fragment } from "react";
import { ChevronRight, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/provider";

export interface FolderCrumb {
  id: string;
  name: string;
}

interface Props {
  path: FolderCrumb[];
  onNavigate: (index: number) => void; // -1 = root
}

export function DriveBreadcrumb({ path, onNavigate }: Props) {
  const t = useTranslations("drive");

  return (
    <nav className="flex items-center gap-1 text-sm min-w-0">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2 shrink-0"
        onClick={() => onNavigate(-1)}
      >
        <HardDrive className="size-4" />
        {t("title")}
      </Button>
      {path.map((crumb, i) => (
        <Fragment key={crumb.id}>
          <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
          {i === path.length - 1 ? (
            <span className="px-2 font-medium truncate max-w-40">{crumb.name}</span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 shrink-0"
              onClick={() => onNavigate(i)}
            >
              {crumb.name}
            </Button>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
