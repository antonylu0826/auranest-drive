"use client";

import { useQuery } from "@tanstack/react-query";
import { FileIcon } from "lucide-react";

import { useTranslations } from "@/i18n/provider";
import { filesApi } from "@/lib/api";

export default function RecentPage() {
  const t = useTranslations("drive");
  const ts = useTranslations("sidebar");
  const tc = useTranslations("common");

  const { data, isLoading } = useQuery({
    queryKey: ["drive-recent"],
    queryFn: () => filesApi.list({ limit: 20, sortField: "updatedAt", sortOrder: "DESC" }),
  });

  const files = data?.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{ts("recent")}</h1>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">{t("name")}</th>
              <th className="px-4 py-2 text-left font-medium hidden md:table-cell">{t("modified")}</th>
              <th className="px-4 py-2 text-left font-medium hidden sm:table-cell">{t("size")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  {tc("loading")}
                </td>
              </tr>
            )}
            {!isLoading && files.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  {t("noRecent")}
                </td>
              </tr>
            )}
            {files.map((file) => (
              <tr key={file.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <FileIcon className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-xs">{file.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell">
                  {new Date(file.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">
                  {file.size < 1024 ? `${file.size} B` : file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
