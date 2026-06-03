"use client";

import { useQuery } from "@tanstack/react-query";
import { FileIcon } from "lucide-react";

import { useTranslations } from "@/i18n/provider";
import { filesApi } from "@/lib/api";

export default function SharedWithMePage() {
  const t = useTranslations("drive");
  const tc = useTranslations("common");

  const { data, isLoading } = useQuery({
    queryKey: ["drive-shared"],
    queryFn: () => filesApi.sharedWithMe({ limit: 100 }),
  });

  const shares = data?.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("sharedWith")}</h1>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">{t("name")}</th>
              <th className="px-4 py-2 text-left font-medium hidden sm:table-cell">{t("permission")}</th>
              <th className="px-4 py-2 text-left font-medium hidden md:table-cell">{t("modified")}</th>
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
            {!isLoading && shares.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  {t("noShared")}
                </td>
              </tr>
            )}
            {shares.map((share) => (
              <tr key={share.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <FileIcon className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-xs">{share.file.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">
                  {t(`permissions.${share.permission}`)}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell">
                  {new Date(share.file.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
