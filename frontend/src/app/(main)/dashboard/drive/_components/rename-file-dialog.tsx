"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/i18n/provider";
import { filesApi } from "@/lib/api";

const schema = z.object({ name: z.string().min(1) });
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  currentName: string;
  onRenamed: () => void;
}

export function RenameFileDialog({ open, onOpenChange, fileId, currentName, onRenamed }: Props) {
  const t = useTranslations("drive");
  const tc = useTranslations("common");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: currentName },
  });

  const rename = useMutation({
    mutationFn: (data: FormValues) => filesApi.update(fileId, { name: data.name }),
    onSuccess: () => {
      toast.success(tc("save"));
      onOpenChange(false);
      onRenamed();
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) reset({ name: currentName }); }}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("rename")}</DialogTitle>
          <DialogDescription className="sr-only">{currentName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => rename.mutate(v))} className="space-y-3">
          <div className="space-y-1">
            <Input {...register("name")} autoFocus />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={rename.isPending}>
              {rename.isPending ? tc("saving") : tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
