"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { useTranslations } from "@/i18n/provider";
import { spacesApi, type SpaceRole, type SpaceMember, type SpaceRoleGrant } from "@/lib/spaces-api";
import { usersApi } from "@/lib/api";
import { rolesApi } from "@/lib/roles-api";

const SPACE_ROLES: SpaceRole[] = ["OWNER", "EDITOR", "VIEWER"];

const addMemberSchema = z.object({
  userId: z.string().min(1),
  spaceRole: z.enum(["OWNER", "EDITOR", "VIEWER"]),
});

const addGrantSchema = z.object({
  systemRoleId: z.string().min(1),
  spaceRole: z.enum(["OWNER", "EDITOR", "VIEWER"]),
});

type AddMemberForm = z.infer<typeof addMemberSchema>;
type AddGrantForm = z.infer<typeof addGrantSchema>;

export default function SpaceMembersPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const t = useTranslations("spaces");
  const tc = useTranslations("common");
  const qc = useQueryClient();

  const [tab, setTab] = useState<"members" | "grants">("members");
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddGrant, setShowAddGrant] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ type: "member"; userId: string } | { type: "grant"; roleId: string } | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ["space-members", spaceId],
    queryFn: () => spacesApi.listMembers(spaceId),
  });

  const { data: grants = [] } = useQuery({
    queryKey: ["space-role-grants", spaceId],
    queryFn: () => spacesApi.listRoleGrants(spaceId),
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list({ limit: 100 }),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: rolesApi.list,
  });

  const memberOptions = (usersData?.data ?? []).map((u) => ({
    value: u.id,
    label: `${u.name ?? u.email} (${u.email})`,
  }));

  const roleOptions = roles.map((r) => ({
    value: r.id,
    label: `${r.displayName} [${r.name}]`,
  }));

  const spaceRoleOptions = SPACE_ROLES.map((r) => ({
    value: r,
    label: t(`spaceRoles.${r}` as Parameters<typeof t>[0]),
  }));

  // ── Add Member ────────────────────────────────────────────────────────────

  const addMemberForm = useForm<AddMemberForm>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { userId: "", spaceRole: "VIEWER" },
  });

  const addMember = useMutation({
    mutationFn: (d: AddMemberForm) => spacesApi.addMember(spaceId, d),
    onSuccess: () => {
      toast.success(tc("create"));
      void qc.invalidateQueries({ queryKey: ["space-members", spaceId] });
      addMemberForm.reset();
      setShowAddMember(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const updateMemberRole = useMutation({
    mutationFn: ({ userId, spaceRole }: { userId: string; spaceRole: SpaceRole }) =>
      spacesApi.updateMember(spaceId, userId, { spaceRole }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["space-members", spaceId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => spacesApi.removeMember(spaceId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["space-members", spaceId] });
      setRemoveTarget(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("lastOwnerError")),
  });

  // ── Add Role Grant ────────────────────────────────────────────────────────

  const addGrantForm = useForm<AddGrantForm>({
    resolver: zodResolver(addGrantSchema),
    defaultValues: { systemRoleId: "", spaceRole: "EDITOR" },
  });

  const addGrant = useMutation({
    mutationFn: (d: AddGrantForm) => spacesApi.addRoleGrant(spaceId, d),
    onSuccess: () => {
      toast.success(tc("create"));
      void qc.invalidateQueries({ queryKey: ["space-role-grants", spaceId] });
      addGrantForm.reset();
      setShowAddGrant(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const updateGrant = useMutation({
    mutationFn: ({ roleId, spaceRole }: { roleId: string; spaceRole: SpaceRole }) =>
      spacesApi.updateRoleGrant(spaceId, roleId, { spaceRole }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["space-role-grants", spaceId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const removeGrant = useMutation({
    mutationFn: (roleId: string) => spacesApi.removeRoleGrant(spaceId, roleId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["space-role-grants", spaceId] });
      setRemoveTarget(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("membersTab")}</h1>

      {/* Tab switcher */}
      <div className="flex gap-2 border-b">
        {(["members", "grants"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {key === "members" ? t("membersTab") : t("roleGrantsTab")}
          </button>
        ))}
      </div>

      {/* Members Tab */}
      {tab === "members" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAddMember(true)}>
              <Plus className="size-4 mr-1" />
              {t("addMember")}
            </Button>
          </div>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">{t("member")}</th>
                  <th className="px-4 py-2 text-left font-medium">{t("spaceRole")}</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {members.map((m: SpaceMember) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{m.user.name ?? m.user.email}</p>
                      <p className="text-xs text-muted-foreground">{m.user.email}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <AppSelect
                        value={m.spaceRole}
                        onValueChange={(v) => v && updateMemberRole.mutate({ userId: m.userId, spaceRole: v as SpaceRole })}
                        options={spaceRoleOptions}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="ghost" size="icon" className="size-7 text-destructive"
                        onClick={() => setRemoveTarget({ type: "member", userId: m.userId })}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      {tc("noData")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Role Grants Tab */}
      {tab === "grants" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAddGrant(true)}>
              <Plus className="size-4 mr-1" />
              {t("addRoleGrant")}
            </Button>
          </div>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">{t("systemRole")}</th>
                  <th className="px-4 py-2 text-left font-medium">{t("spaceRole")}</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {grants.map((g: SpaceRoleGrant) => (
                  <tr key={g.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{g.systemRole.displayName}</p>
                      <p className="text-xs text-muted-foreground">{g.systemRole.name}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <AppSelect
                        value={g.spaceRole}
                        onValueChange={(v) => v && updateGrant.mutate({ roleId: g.systemRoleId, spaceRole: v as SpaceRole })}
                        options={spaceRoleOptions}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="ghost" size="icon" className="size-7 text-destructive"
                        onClick={() => setRemoveTarget({ type: "grant", roleId: g.systemRoleId })}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {grants.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      {tc("noData")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={(o) => { setShowAddMember(o); if (!o) addMemberForm.reset(); }}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addMember")}</DialogTitle>
            <DialogDescription className="sr-only">{t("addMember")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={addMemberForm.handleSubmit((d) => addMember.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <Label>{t("member")}</Label>
              <AppSelect
                value={addMemberForm.watch("userId") || null}
                onValueChange={(v) => addMemberForm.setValue("userId", v ?? "")}
                options={memberOptions}
                placeholder="— select user —"
              />
            </div>
            <div className="space-y-1">
              <Label>{t("spaceRole")}</Label>
              <AppSelect
                value={addMemberForm.watch("spaceRole")}
                onValueChange={(v) => addMemberForm.setValue("spaceRole", (v ?? "VIEWER") as SpaceRole)}
                options={spaceRoleOptions}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddMember(false)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={addMember.isPending}>{addMember.isPending ? tc("creating") : tc("create")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Role Grant Dialog */}
      <Dialog open={showAddGrant} onOpenChange={(o) => { setShowAddGrant(o); if (!o) addGrantForm.reset(); }}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addRoleGrant")}</DialogTitle>
            <DialogDescription className="sr-only">{t("addRoleGrant")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={addGrantForm.handleSubmit((d) => addGrant.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <Label>{t("systemRole")}</Label>
              <AppSelect
                value={addGrantForm.watch("systemRoleId") || null}
                onValueChange={(v) => addGrantForm.setValue("systemRoleId", v ?? "")}
                options={roleOptions}
                placeholder="— select role —"
              />
            </div>
            <div className="space-y-1">
              <Label>{t("spaceRole")}</Label>
              <AppSelect
                value={addGrantForm.watch("spaceRole")}
                onValueChange={(v) => addGrantForm.setValue("spaceRole", (v ?? "EDITOR") as SpaceRole)}
                options={spaceRoleOptions}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddGrant(false)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={addGrant.isPending}>{addGrant.isPending ? tc("creating") : tc("create")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove confirm */}
      <AlertDialog open={removeTarget !== null} onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{removeTarget?.type === "member" ? t("removeMember") : t("removeRoleGrant")}</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.type === "member" ? t("removeConfirm") : t("removeGrantConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (removeTarget?.type === "member") removeMember.mutate(removeTarget.userId);
                else if (removeTarget?.type === "grant") removeGrant.mutate(removeTarget.roleId);
              }}
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
