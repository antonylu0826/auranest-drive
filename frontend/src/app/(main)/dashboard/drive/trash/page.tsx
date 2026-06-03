"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileIcon, FolderIcon, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "@/i18n/provider";
import { filesApi, foldersApi } from "@/lib/api";

export default function TrashPage() {
  const t = useTranslations("drive");
  const ts = useTranslations("sidebar");
  const tc = useTranslations("common");
  const qc = useQueryClient();
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ["drive-trash-folders"],
    queryFn: () => foldersApi.list({ trashed: true, limit: 100 }),
  });

  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ["drive-trash-files"],
    queryFn: () => filesApi.list({ trashed: true, limit: 100 }),
  });

  const restoreFolder = useMutation({
    mutationFn: (id: string) => foldersApi.restore(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["drive-trash-folders"] }),
  });

  const deleteFolder = useMutation({
    mutationFn: (id: string) => foldersApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["drive-trash-folders"] }),
  });

  const restoreFile = useMutation({
    mutationFn: (id: string) => filesApi.restore(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["drive-trash-files"] }),
  });

  const deleteFile = useMutation({
    mutationFn: (id: string) => filesApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["drive-trash-files"] }),
  });

  const emptyTrash = useMutation({
    mutationFn: async () => {
      await Promise.all([filesApi.emptyTrash(), foldersApi.emptyTrash()]);
    },
    onSuccess: () => {
      toast.success(t("emptyTrash"));
      void qc.invalidateQueries({ queryKey: ["drive-trash-folders"] });
      void qc.invalidateQueries({ queryKey: ["drive-trash-files"] });
    },
  });

  const isLoading = foldersLoading || filesLoading;
  const folders = foldersData?.data ?? [];
  const files = filesData?.data ?? [];
  const isEmpty = !isLoading && folders.length === 0 && files.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{ts("trash")}</h1>
        {!isEmpty && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmEmpty(true)}
          >
            <Trash2 className="size-4 mr-1" />
            {t("emptyTrash")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">{t("name")}</th>
              <th className="px-4 py-2 text-left font-medium hidden md:table-cell">{t("modified")}</th>
              <th className="px-4 py-2" />
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
            {isEmpty && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  {t("noTrashed")}
                </td>
              </tr>
            )}
            {folders.map((folder) => (
              <tr key={folder.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <FolderIcon className="size-4 text-yellow-500 shrink-0" />
                    <span className="truncate max-w-xs text-muted-foreground line-through">{folder.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell">
                  {new Date(folder.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="size-7" title={t("restoreFromTrash")}
                      onClick={() => restoreFolder.mutate(folder.id)}>
                      <RotateCcw className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7 text-destructive" title={t("deleteForever")}
                      onClick={() => deleteFolder.mutate(folder.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {files.map((file) => (
              <tr key={file.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <FileIcon className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-xs text-muted-foreground line-through">{file.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell">
                  {new Date(file.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="size-7" title={t("restoreFromTrash")}
                      onClick={() => restoreFile.mutate(file.id)}>
                      <RotateCcw className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7 text-destructive" title={t("deleteForever")}
                      onClick={() => deleteFile.mutate(file.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={confirmEmpty} onOpenChange={setConfirmEmpty}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("emptyTrashTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("emptyTrashConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => emptyTrash.mutate()}
            >
              {t("emptyTrash")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
