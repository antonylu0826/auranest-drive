"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "@/i18n/provider";
import { apiFetch } from "@/lib/api";

interface EditorInfo {
  editorUrl: string;
  accessToken: string;
}

function getCollaboraLang(): string {
  if (typeof document === "undefined") return "zh-TW";
  const locale = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)?.[1] ?? "zh-TW";
  return locale === "zh-TW" ? "zh-TW" : "en-US";
}

export default function EditFilePage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("drive");
  const [editorUrl, setEditorUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<EditorInfo>(`/wopi/editor-url/${id}`)
      .then((info) => {
        const url = new URL(info.editorUrl);
        url.searchParams.set("lang", getCollaboraLang());
        setEditorUrl(url.toString());
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : t("editorLoadFailed");
        setError(msg);
      });
  }, [id, t]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-destructive text-sm max-w-md text-center">{error}</p>
      </div>
    );
  }

  if (!editorUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground text-sm">{t("editorLoading")}</p>
      </div>
    );
  }

  return (
    <iframe
      src={editorUrl}
      className="w-screen h-screen border-0 block"
      title="Collabora Online Editor"
      allow="fullscreen"
    />
  );
}
