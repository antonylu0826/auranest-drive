"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Settings, Upload } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslations } from "@/i18n/provider";
import { foldersApi, filesApi, type DriveFile } from "@/lib/api";
import { spacesApi } from "@/lib/spaces-api";
import { NewDocButton } from "../../drive/_components/new-doc-button";
import { CreateFolderDialog } from "../../drive/_components/create-folder-dialog";
import { RenameFolderDialog } from "../../drive/_components/rename-folder-dialog";
import { RenameFileDialog } from "../../drive/_components/rename-file-dialog";
import { DriveItemRow } from "../../drive/_components/drive-item-row";
import { DriveBreadcrumb, type FolderCrumb } from "../../drive/_components/drive-breadcrumb";
import { UploadZone } from "../../drive/_components/upload-zone";
import { useCurrentUser } from "@/hooks/use-current-user";

type RenameTarget = { id: string; name: string; type: "folder" | "file" };

export default function SpaceDrivePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const t = useTranslations("drive");
  const tc = useTranslations("common");
  const qc = useQueryClient();
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.roleNames?.includes("ADMIN") ?? false;

  const [folderPath, setFolderPath] = useState<FolderCrumb[]>([]);
  const [search, setSearch] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);

  const isMobile = useIsMobile();
  const currentFolderId = folderPath.at(-1)?.id;

  const { data: space } = useQuery({
    queryKey: ["spaces", spaceId],
    queryFn: () => spacesApi.get(spaceId),
  });

  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ["drive-folders", spaceId, currentFolderId, search],
    queryFn: () => foldersApi.list({ spaceId, parentId: currentFolderId, search, limit: 100 }),
  });

  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ["drive-files", spaceId, currentFolderId, search],
    queryFn: () => filesApi.list({ spaceId, folderId: currentFolderId, search, limit: 100 }),
  });

  const trashFolder = useMutation({
    mutationFn: (id: string) => foldersApi.trash(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["drive-folders", spaceId] });
      toast.success(t("moveToTrash"));
    },
  });

  const trashFile = useMutation({
    mutationFn: (id: string) => filesApi.trash(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["drive-files", spaceId] });
      toast.success(t("moveToTrash"));
    },
  });

  function openFolder(folder: { id: string; name: string }) {
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSearch("");
  }

  function navigateTo(index: number) {
    setFolderPath((prev) => (index === -1 ? [] : prev.slice(0, index + 1)));
    setSearch("");
  }

  function handleUploadComplete() {
    void qc.invalidateQueries({ queryKey: ["drive-files", spaceId] });
  }

  async function handleDownload(id: string) {
    const win = window.open("", "_blank");
    const { url } = await filesApi.getDownloadUrl(id);
    if (win) win.location.href = url;
    else window.open(url, "_blank");
  }

  const isLoading = foldersLoading || filesLoading;
  const folders = foldersData?.data ?? [];
  const files = filesData?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <DriveBreadcrumb path={folderPath} onNavigate={navigateTo} />
          {space && (
            <span className="text-muted-foreground text-sm hidden sm:inline">
              — {space.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 sm:w-44 sm:flex-none"
          />
          <NewDocButton
            spaceId={spaceId}
            folderId={currentFolderId}
            onCreated={() => void qc.invalidateQueries({ queryKey: ["drive-files", spaceId] })}
          />
          <Button variant="outline" size="sm" onClick={() => setShowNewFolder(true)}>
            <FolderPlus className="size-4" />
            <span className="hidden sm:inline ml-1">{t("newFolder")}</span>
          </Button>
          <Button size="sm" onClick={(e) => { e.currentTarget.blur(); setShowUpload(true); }}>
            <Upload className="size-4" />
            <span className="hidden sm:inline ml-1">{t("uploadFile")}</span>
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="icon" asChild title="Members">
              <Link href={`/dashboard/spaces/${spaceId}/members`}>
                <Settings className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">{t("name")}</th>
              <th className="px-4 py-2 text-left font-medium hidden md:table-cell">{t("modified")}</th>
              <th className="px-4 py-2 text-left font-medium hidden sm:table-cell">{t("size")}</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  {tc("loading")}
                </td>
              </tr>
            )}
            {!isLoading && folders.length === 0 && files.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  {t("noFiles")}
                </td>
              </tr>
            )}
            {folders.map((folder) => (
              <DriveItemRow
                key={folder.id}
                type="folder"
                item={folder}
                onOpen={() => openFolder(folder)}
                onRename={() => setRenameTarget({ id: folder.id, name: folder.name, type: "folder" })}
                onTrash={() => trashFolder.mutate(folder.id)}
              />
            ))}
            {files.map((file: DriveFile) => (
              <DriveItemRow
                key={file.id}
                type="file"
                item={file}
                onRename={() => setRenameTarget({ id: file.id, name: file.name, type: "file" })}
                onDownload={() => void handleDownload(file.id)}
                onTrash={() => trashFile.mutate(file.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {isMobile ? (
        <Drawer open={showUpload} onOpenChange={setShowUpload}>
          <DrawerContent className="min-h-[50vh]">
            <DrawerHeader>
              <DrawerTitle>{t("uploadFile")}</DrawerTitle>
              <DrawerDescription>
                {folderPath.length > 0
                  ? `${t("uploadTo")}${folderPath.map((f) => f.name).join(" / ")}`
                  : t("uploadToRoot")}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">
              <UploadZone spaceId={spaceId} folderId={currentFolderId} onUploadComplete={handleUploadComplete} />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={showUpload} onOpenChange={setShowUpload}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{t("uploadFile")}</DialogTitle>
              <DialogDescription>
                {folderPath.length > 0
                  ? `${t("uploadTo")}${folderPath.map((f) => f.name).join(" / ")}`
                  : t("uploadToRoot")}
              </DialogDescription>
            </DialogHeader>
            <UploadZone spaceId={spaceId} folderId={currentFolderId} onUploadComplete={handleUploadComplete} />
          </DialogContent>
        </Dialog>
      )}

      <CreateFolderDialog
        open={showNewFolder}
        onOpenChange={setShowNewFolder}
        spaceId={spaceId}
        parentId={currentFolderId}
        onCreated={() => void qc.invalidateQueries({ queryKey: ["drive-folders", spaceId] })}
      />

      {renameTarget?.type === "folder" && (
        <RenameFolderDialog
          open
          onOpenChange={(o) => { if (!o) setRenameTarget(null); }}
          folderId={renameTarget.id}
          currentName={renameTarget.name}
          onRenamed={() => {
            setRenameTarget(null);
            void qc.invalidateQueries({ queryKey: ["drive-folders", spaceId] });
          }}
        />
      )}

      {renameTarget?.type === "file" && (
        <RenameFileDialog
          open
          onOpenChange={(o) => { if (!o) setRenameTarget(null); }}
          fileId={renameTarget.id}
          currentName={renameTarget.name}
          onRenamed={() => {
            setRenameTarget(null);
            void qc.invalidateQueries({ queryKey: ["drive-files", spaceId] });
          }}
        />
      )}
    </div>
  );
}
