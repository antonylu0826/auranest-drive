"use client";

import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Download,
  FileAudio,
  FileCode,
  FileIcon,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FolderIcon,
  MoreHorizontal,
  Pencil,
  SquarePen,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "@/i18n/provider";
import { COLLABORA_EXTENSIONS, type DriveFile, type DriveFolder } from "@/lib/api";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileIconConfig {
  icon: LucideIcon;
  className: string;
}

function getFileIconConfig(mimeType: string, name: string): FileIconConfig {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";

  if (mimeType.startsWith("image/"))
    return { icon: FileImage, className: "text-purple-500" };

  if (mimeType.startsWith("video/"))
    return { icon: FileVideo, className: "text-blue-500" };

  if (mimeType.startsWith("audio/"))
    return { icon: FileAudio, className: "text-green-500" };

  if (mimeType === "application/pdf")
    return { icon: FileText, className: "text-red-500" };

  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    ext === "csv" || ext === "xlsx" || ext === "xls" || ext === "ods"
  )
    return { icon: FileSpreadsheet, className: "text-emerald-600" };

  if (
    mimeType.includes("word") ||
    mimeType.includes("opendocument.text") ||
    ext === "doc" || ext === "docx" || ext === "odt" || ext === "rtf"
  )
    return { icon: FileText, className: "text-blue-600" };

  if (
    mimeType.includes("presentation") ||
    mimeType.includes("powerpoint") ||
    ext === "ppt" || ext === "pptx" || ext === "odp"
  )
    return { icon: FileText, className: "text-orange-500" };

  if (
    mimeType.includes("javascript") || mimeType.includes("typescript") ||
    mimeType.includes("html") || mimeType.includes("css") ||
    mimeType.includes("json") || mimeType.includes("xml") ||
    mimeType.includes("yaml") || mimeType === "text/x-python" ||
    ["js", "ts", "jsx", "tsx", "html", "css", "json", "xml", "yaml", "yml",
     "py", "go", "rs", "java", "c", "cpp", "h", "sh", "sql"].includes(ext)
  )
    return { icon: FileCode, className: "text-yellow-600" };

  if (
    mimeType.includes("zip") || mimeType.includes("tar") ||
    mimeType.includes("gzip") || mimeType.includes("compressed") ||
    ["zip", "tar", "gz", "bz2", "7z", "rar", "tgz"].includes(ext)
  )
    return { icon: Archive, className: "text-orange-400" };

  if (mimeType.startsWith("text/"))
    return { icon: FileText, className: "text-slate-500" };

  return { icon: FileIcon, className: "text-muted-foreground" };
}

interface FolderRowProps {
  type: "folder";
  item: DriveFolder;
  onOpen: () => void;
  onRename: () => void;
  onTrash: () => void;
}

interface FileRowProps {
  type: "file";
  item: DriveFile;
  onRename: () => void;
  onDownload: () => void;
  onTrash: () => void;
}

type Props = FolderRowProps | FileRowProps;

export function DriveItemRow(props: Props) {
  const t = useTranslations("drive");

  const isFolder = props.type === "folder";
  const item = props.item;
  const canEditOnline = !isFolder &&
    COLLABORA_EXTENSIONS.has((item.name.split(".").pop() ?? "").toLowerCase());

  const fileIconConfig = !isFolder
    ? getFileIconConfig((item as DriveFile).mimeType, item.name)
    : null;

  return (
    <tr
      className="border-b last:border-0 hover:bg-muted/30 cursor-default"
      onDoubleClick={isFolder ? props.onOpen : undefined}
      title={isFolder ? t("dblclickFolder") : undefined}
    >
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          {isFolder ? (
            <FolderIcon className="size-4 text-yellow-500 shrink-0" />
          ) : (
            fileIconConfig && <fileIconConfig.icon className={`size-4 shrink-0 ${fileIconConfig.className}`} />
          )}
          <span className="truncate max-w-xs">{item.name}</span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell">
        {new Date(item.updatedAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">
        {isFolder ? "—" : formatBytes((item as DriveFile).size)}
      </td>
      <td className="px-4 py-2.5 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEditOnline && (
              <DropdownMenuItem onClick={() => window.open(`/editor/files/${item.id}/edit`, "_blank")}>
                <SquarePen className="size-4 mr-2" />
                {t("editOnline")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={props.onRename}>
              <Pencil className="size-4 mr-2" />
              {t("rename")}
            </DropdownMenuItem>
            {!isFolder && (
              <DropdownMenuItem onClick={(props as FileRowProps).onDownload}>
                <Download className="size-4 mr-2" />
                {t("download")}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={props.onTrash}>
              <Trash2 className="size-4 mr-2" />
              {t("moveToTrash")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
