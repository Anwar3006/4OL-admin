"use client";

/**
 * Settings → Providers: the three P0-14 lookup editors (provider types,
 * credential types, capabilities). Adding "Nutrition shop" or a new
 * regulator is a data change here, not a migration.
 */

import React, { useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCapabilitiesSettings,
  useCredentialTypesSettings,
  useProviderTypesSettings,
  useSaveCapability,
  useSaveCredentialType,
  useSaveProviderType,
} from "@/features/providers/data/useProviderSettings";
import { PROVIDER_KIND_LABELS, PROVIDER_KINDS, type ProviderKind } from "@/features/providers/schema/types";

function KindPicker({ value, onChange }: { value: ProviderKind[]; onChange: (v: ProviderKind[]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {PROVIDER_KINDS.map((kind) => (
        <label key={kind} className="flex items-center gap-2 text-xs">
          <Checkbox
            checked={value.includes(kind)}
            onCheckedChange={(checked) =>
              onChange(checked ? [...value, kind] : value.filter((k) => k !== kind))
            }
          />
          {PROVIDER_KIND_LABELS[kind]}
        </label>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 block">
      <span className="block text-2xs font-black uppercase tracking-widest text-slate-400">{label}</span>
      {children}
    </label>
  );
}

// ── Provider types ───────────────────────────────────────────────────────

function ProviderTypesEditor() {
  const { data, isLoading } = useProviderTypesSettings();
  const save = useSaveProviderType();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing({ key: "", kind: "care_facility", label: "", directory_category: "", icon: "", is_listed: true, sort_order: 0, is_active: true, isNew: true });
    setOpen(true);
  };
  const openEdit = (row: any) => {
    setEditing({ ...row, isNew: false });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Provider Types</CardTitle>
        <Button size="sm" onClick={openNew}><Plus className="h-3.5 w-3.5 mr-1" /> Add type</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Key</TableHead><TableHead>Kind</TableHead><TableHead>Label</TableHead><TableHead>Listed</TableHead><TableHead>Active</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {(data?.data ?? []).map((row) => (
                <TableRow key={row.key} className="cursor-pointer" onClick={() => openEdit(row)}>
                  <TableCell className="font-mono text-xs">{row.key}</TableCell>
                  <TableCell>{PROVIDER_KIND_LABELS[row.kind]}</TableCell>
                  <TableCell>{row.label}</TableCell>
                  <TableCell><Badge variant={row.is_listed ? "emerald" : "secondary"}>{row.is_listed ? "Listed" : "Hidden"}</Badge></TableCell>
                  <TableCell><Badge variant={row.is_active ? "emerald" : "destructive"}>{row.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell><Pencil className="h-3.5 w-3.5 text-slate-400" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{editing?.isNew ? "Add provider type" : "Edit provider type"}</DialogTitle>
          {editing && (
            <div className="space-y-3">
              <Field label="Key (snake_case)">
                <Input value={editing.key} disabled={!editing.isNew} onChange={(e) => setEditing({ ...editing, key: e.target.value })} />
              </Field>
              <Field label="Kind">
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={editing.kind}
                  onChange={(e) => setEditing({ ...editing, kind: e.target.value })}
                >
                  {PROVIDER_KINDS.map((k) => <option key={k} value={k}>{PROVIDER_KIND_LABELS[k]}</option>)}
                </select>
              </Field>
              <Field label="Label"><Input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></Field>
              <Field label="Directory category"><Input value={editing.directory_category ?? ""} onChange={(e) => setEditing({ ...editing, directory_category: e.target.value })} /></Field>
              <Field label="Icon"><Input value={editing.icon ?? ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} /></Field>
              <Field label="Sort order"><Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field>
              <div className="flex items-center justify-between"><span className="text-xs font-bold">Listed in directory</span><Switch checked={editing.is_listed} onCheckedChange={(v) => setEditing({ ...editing, is_listed: v })} /></div>
              <div className="flex items-center justify-between"><span className="text-xs font-bold">Active</span><Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  disabled={!editing.key || !editing.label || save.isPending}
                  onClick={() => save.mutate(editing, { onSuccess: () => setOpen(false) })}
                >
                  {save.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Credential types ─────────────────────────────────────────────────────

function CredentialTypesEditor() {
  const { data, isLoading } = useCredentialTypesSettings();
  const save = useSaveCredentialType();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing({ key: "", regulator: "", label: "", applies_to: [], has_expiry: true, grants: [], isNew: true, grantsText: "" });
    setOpen(true);
  };
  const openEdit = (row: any) => {
    setEditing({ ...row, isNew: false, grantsText: (row.grants ?? []).join(", ") });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Credential Types</CardTitle>
        <Button size="sm" onClick={openNew}><Plus className="h-3.5 w-3.5 mr-1" /> Add type</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Key</TableHead><TableHead>Regulator</TableHead><TableHead>Label</TableHead><TableHead>Grants</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {(data?.data ?? []).map((row) => (
                <TableRow key={row.key} className="cursor-pointer" onClick={() => openEdit(row)}>
                  <TableCell className="font-mono text-xs">{row.key}</TableCell>
                  <TableCell>{row.regulator}</TableCell>
                  <TableCell>{row.label}</TableCell>
                  <TableCell className="text-xs text-slate-400">{row.grants.join(", ") || "—"}</TableCell>
                  <TableCell><Pencil className="h-3.5 w-3.5 text-slate-400" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{editing?.isNew ? "Add credential type" : "Edit credential type"}</DialogTitle>
          {editing && (
            <div className="space-y-3">
              <Field label="Key (snake_case)">
                <Input value={editing.key} disabled={!editing.isNew} onChange={(e) => setEditing({ ...editing, key: e.target.value })} />
              </Field>
              <Field label="Regulator"><Input value={editing.regulator} onChange={(e) => setEditing({ ...editing, regulator: e.target.value })} /></Field>
              <Field label="Label"><Input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></Field>
              <Field label="Applies to"><KindPicker value={editing.applies_to} onChange={(v) => setEditing({ ...editing, applies_to: v })} /></Field>
              <Field label="Grants (comma-separated capability keys)">
                <Input
                  value={editing.grantsText}
                  onChange={(e) => setEditing({ ...editing, grantsText: e.target.value, grants: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
                />
              </Field>
              <div className="flex items-center justify-between"><span className="text-xs font-bold">Has expiry date</span><Switch checked={editing.has_expiry} onCheckedChange={(v) => setEditing({ ...editing, has_expiry: v })} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  disabled={!editing.key || !editing.label || !editing.regulator || editing.applies_to.length === 0 || save.isPending}
                  onClick={() => {
                    const { grantsText, ...payload } = editing;
                    save.mutate(payload, { onSuccess: () => setOpen(false) });
                  }}
                >
                  {save.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Capabilities ─────────────────────────────────────────────────────────

function CapabilitiesEditor() {
  const { data, isLoading } = useCapabilitiesSettings();
  const save = useSaveCapability();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing({ key: "", label: "", applies_to: [], requires_item_review: true, description: "", isNew: true });
    setOpen(true);
  };
  const openEdit = (row: any) => {
    setEditing({ ...row, isNew: false });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Capabilities</CardTitle>
        <Button size="sm" onClick={openNew}><Plus className="h-3.5 w-3.5 mr-1" /> Add capability</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Key</TableHead><TableHead>Label</TableHead><TableHead>Applies to</TableHead><TableHead>Review required</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {(data?.data ?? []).map((row) => (
                <TableRow key={row.key} className="cursor-pointer" onClick={() => openEdit(row)}>
                  <TableCell className="font-mono text-xs">{row.key}</TableCell>
                  <TableCell>{row.label}</TableCell>
                  <TableCell className="text-xs text-slate-400">{row.applies_to.map((k) => PROVIDER_KIND_LABELS[k]).join(", ")}</TableCell>
                  <TableCell><Badge variant={row.requires_item_review ? "amber" : "secondary"}>{row.requires_item_review ? "Yes" : "No"}</Badge></TableCell>
                  <TableCell><Pencil className="h-3.5 w-3.5 text-slate-400" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{editing?.isNew ? "Add capability" : "Edit capability"}</DialogTitle>
          {editing && (
            <div className="space-y-3">
              <Field label="Key (snake_case)">
                <Input value={editing.key} disabled={!editing.isNew} onChange={(e) => setEditing({ ...editing, key: e.target.value })} />
              </Field>
              <Field label="Label"><Input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></Field>
              <Field label="Applies to"><KindPicker value={editing.applies_to} onChange={(v) => setEditing({ ...editing, applies_to: v })} /></Field>
              <Field label="Description"><Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Catalogue items under it need admin review</span>
                <Switch checked={editing.requires_item_review} onCheckedChange={(v) => setEditing({ ...editing, requires_item_review: v })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  disabled={!editing.key || !editing.label || editing.applies_to.length === 0 || save.isPending}
                  onClick={() => save.mutate(editing, { onSuccess: () => setOpen(false) })}
                >
                  {save.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function ProvidersTab() {
  return (
    <Tabs defaultValue="provider-types" className="w-full">
      <TabsList>
        <TabsTrigger value="provider-types">Provider Types</TabsTrigger>
        <TabsTrigger value="credential-types">Credential Types</TabsTrigger>
        <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
      </TabsList>
      <TabsContent value="provider-types" className="mt-4"><ProviderTypesEditor /></TabsContent>
      <TabsContent value="credential-types" className="mt-4"><CredentialTypesEditor /></TabsContent>
      <TabsContent value="capabilities" className="mt-4"><CapabilitiesEditor /></TabsContent>
    </Tabs>
  );
}
