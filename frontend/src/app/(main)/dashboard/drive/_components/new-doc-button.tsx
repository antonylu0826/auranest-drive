"use client";

import { useState } from "react";
import { FileText, Presentation, Sheet, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "@/i18n/provider";
import { uploadFile } from "@/lib/api";

const TEMPLATES = [
  {
    key: "wordDocument" as const,
    ext: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    prefix: "Document",
    icon: FileText,
    iconClass: "text-blue-500",
  },
  {
    key: "spreadsheet" as const,
    ext: "xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    prefix: "Spreadsheet",
    icon: Sheet,
    iconClass: "text-emerald-600",
  },
  {
    key: "presentation" as const,
    ext: "pptx",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    prefix: "Presentation",
    icon: Presentation,
    iconClass: "text-orange-500",
  },
] as const;

interface Props {
  folderId: string | undefined;
  onCreated: () => void;
}

export function NewDocButton({ folderId, onCreated }: Props) {
  const t = useTranslations("drive");
  const [creating, setCreating] = useState(false);

  async function handleCreate(tpl: (typeof TEMPLATES)[number]) {
    // Open the window immediately in the user-gesture tick; set URL after the async work.
    // Without this, popup blockers reject window.open called after an await.
    const win = window.open("", "_blank");
    setCreating(true);
    try {
      const resp = await fetch(`/templates/sample.${tpl.ext}`);
      if (!resp.ok) throw new Error(t("templateLoadFailed"));
      const blob = await resp.blob();

      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const name = `${tpl.prefix}_${ts}.${tpl.ext}`;
      const file = new File([blob], name, { type: tpl.mime });

      const created = await uploadFile(file, folderId, () => {});
      onCreated();
      toast.success(`${t(tpl.key)} ${t("documentCreatedSuffix")}`);
      if (win) win.location.href = `/editor/files/${created.id}/edit`;
    } catch {
      win?.close();
      toast.error(t("createDocFailed"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={creating}>
          <Plus className="size-4" />
          <span className="hidden sm:inline ml-1">
            {creating ? t("creatingDocument") : t("newDocument")}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {TEMPLATES.map((tpl) => (
          <DropdownMenuItem
            key={tpl.ext}
            onClick={() => void handleCreate(tpl)}
            disabled={creating}
          >
            <tpl.icon className={`size-4 mr-2 ${tpl.iconClass}`} />
            {t(tpl.key)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
