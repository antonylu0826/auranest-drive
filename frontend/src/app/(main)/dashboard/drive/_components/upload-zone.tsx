"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/provider";
import { uploadFile, type UploadProgress } from "@/lib/api";

const MAX_BYTES = 100 * 1024 * 1024;

interface Props {
  spaceId: string;
  folderId: string | undefined;
  onUploadComplete: () => void;
}

export function UploadZone({ spaceId, folderId, onUploadComplete }: Props) {
  const t = useTranslations("drive");
  const [tasks, setTasks] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} ${t("uploadSizeExceeded")}`);
        return;
      }

      const taskId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setTasks((prev) => [...prev, { taskId, name: file.name, progress: 0, status: "uploading" }]);

      void uploadFile(file, spaceId, folderId, (pct) => {
        setTasks((prev) => prev.map((tk) => (tk.taskId === taskId ? { ...tk, progress: pct } : tk)));
      })
        .then(() => {
          setTasks((prev) => prev.map((tk) => (tk.taskId === taskId ? { ...tk, progress: 100, status: "done" } : tk)));
          onUploadComplete();
          setTimeout(() => setTasks((prev) => prev.filter((tk) => tk.taskId !== taskId)), 2500);
        })
        .catch((err: unknown) => {
          setTasks((prev) => prev.map((tk) => (tk.taskId === taskId ? { ...tk, status: "error" } : tk)));
          const reason = err instanceof Error ? err.message : t("uploadUnknownError");
          toast.error(`${file.name} ${t("uploadFileFailed")}：${reason}`);
        });
    },
    [folderId, onUploadComplete, t],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      for (const f of Array.from(files)) handleFile(f);
    },
    [handleFile],
  );

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-lg p-5 sm:p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("uploadDropHint")}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{t("uploadSizeHint")}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {tasks.length > 0 && (
        <ul className="space-y-1.5">
          {tasks.map((task) => (
            <li key={task.taskId} className="flex items-center gap-2 text-sm">
              <span className="truncate flex-1 max-w-xs">{task.name}</span>
              {task.status === "uploading" && (
                <Progress value={task.progress} className="w-24 h-1.5 shrink-0" />
              )}
              {task.status === "done" && (
                <span className="text-xs text-green-600 shrink-0">{t("uploadDone")}</span>
              )}
              {task.status === "error" && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-destructive">{t("uploadError")}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5"
                    onClick={() => setTasks((p) => p.filter((tk) => tk.taskId !== task.taskId))}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
