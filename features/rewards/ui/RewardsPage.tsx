"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Gift, Loader2, Pencil, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/redesign/PageHeader";
import ImageDropZone from "@/components/ImageDropZone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useHasPermission } from "@/stores/permission-context";

const DOMAINS = ["general", "trivia", "fitness", "fitcoins", "facility_scout"] as const;
type RewardDomain = (typeof DOMAINS)[number];

const DOMAIN_LABELS: Record<RewardDomain, string> = {
  general: "General",
  trivia: "Trivia",
  fitness: "Fitness Challenges",
  fitcoins: "FitCoins",
  facility_scout: "FacilityScout",
};

const DOMAIN_TONES: Record<RewardDomain, string> = {
  general: "bg-slate-100 text-slate-700",
  trivia: "bg-violet-100 text-violet-700",
  fitness: "bg-emerald-100 text-emerald-700",
  fitcoins: "bg-amber-100 text-amber-700",
  facility_scout: "bg-sky-100 text-sky-700",
};

type Reward = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  image_url: string | null;
  reward_type: string;
  value: string | null;
  amount: number | null;
  currency: string | null;
  domains: RewardDomain[];
  fulfillment_method: string;
  inventory_count: number | null;
  is_active: boolean;
  created_at: string;
};

type DomainItem = {
  id: string;
  title?: string;
  name?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  starts_at?: string;
  ends_at?: string;
  reward_id?: string | null;
  catalog_reward_id?: string | null;
  cost?: number;
};

type RewardsPayload = {
  rewards: Reward[];
  triviaEvents: DomainItem[];
  fitnessChallenges: DomainItem[];
  fitcoinItems: DomainItem[];
  facilityScoutConfig: Record<string, unknown> | null;
  grants: Array<{ id: string; reward_id: string; source_domain: RewardDomain; status: string }>;
};

type RewardDraft = {
  name: string;
  description: string;
  icon: string;
  imageUrl: string;
  rewardType: string;
  value: string;
  amount: string;
  currency: string;
  domains: RewardDomain[];
  fulfillmentMethod: string;
  inventoryCount: string;
  isActive: boolean;
};

const emptyDraft = (domain: RewardDomain = "general"): RewardDraft => ({
  name: "",
  description: "",
  icon: "🎁",
  imageUrl: "",
  rewardType: "prize",
  value: "",
  amount: "",
  currency: "GHS",
  domains: [domain],
  fulfillmentMethod: "manual",
  inventoryCount: "",
  isActive: true,
});

const displayValue = (reward: Reward) => {
  if (reward.amount !== null) {
    return `${reward.currency ?? "GHS"} ${Number(reward.amount).toLocaleString()}`;
  }
  return reward.value || "Value not specified";
};

function DomainBadges({ domains }: { domains: RewardDomain[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {domains.map((domain) => (
        <span
          key={domain}
          className={`rounded-full px-2 py-1 text-3xs font-black uppercase tracking-wider ${DOMAIN_TONES[domain]}`}
        >
          {DOMAIN_LABELS[domain]}
        </span>
      ))}
    </div>
  );
}

function RewardCard({
  reward,
  usage,
  canManage,
  onEdit,
}: {
  reward: Reward;
  usage: number;
  canManage: boolean;
  onEdit: () => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start gap-3">
        {reward.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reward.image_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50 text-2xl dark:bg-amber-950/30">
            {reward.icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white">{reward.name}</h3>
              <p className="mt-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {displayValue(reward)}
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit ${reward.name}`}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-2 line-clamp-2 text-xs text-slate-500">
            {reward.description || "No description provided."}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
        <DomainBadges domains={reward.domains} />
        <div className="flex items-center gap-2 text-3xs font-black uppercase tracking-wider text-slate-400">
          <span>{usage} use{usage === 1 ? "" : "s"}</span>
          <Badge variant={reward.is_active ? "default" : "secondary"}>
            {reward.is_active ? "Active" : "Hidden"}
          </Badge>
        </div>
      </div>
    </article>
  );
}

function UsageTable({
  rows,
  rewards,
  empty,
}: {
  rows: DomainItem[];
  rewards: Map<string, Reward>;
  empty: string;
}) {
  if (!rows.length) {
    return <div className="rounded-2xl border-2 border-dashed p-8 text-center text-sm text-slate-500">{empty}</div>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="bg-slate-50 text-3xs font-black uppercase tracking-widest text-slate-500 dark:bg-slate-900/50">
          <tr><th className="p-3">Use area</th><th className="p-3">Reward</th><th className="p-3">Status</th><th className="p-3">Schedule</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const reward = rewards.get(row.reward_id ?? row.catalog_reward_id ?? "");
            const start = row.starts_at ?? row.start_date;
            const end = row.ends_at ?? row.end_date;
            return (
              <tr key={row.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{row.title ?? row.name}</td>
                <td className="p-3">{reward ? `${reward.icon} ${reward.name}` : "Not assigned"}</td>
                <td className="p-3"><span className="badge badge-slate">{row.status ?? "Active"}</span></td>
                <td className="p-3 text-xs text-slate-500">
                  {start ? new Date(start).toLocaleDateString() : "—"}{end ? ` – ${new Date(end).toLocaleDateString()}` : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function RewardsPage() {
  const canManage = useHasPermission("rewards.manage");
  const [activeTab, setActiveTab] = useState<RewardDomain | "catalogue">("catalogue");
  const [payload, setPayload] = useState<RewardsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [draft, setDraft] = useState<RewardDraft>(() => emptyDraft());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rewards", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load rewards");
      setPayload(json);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/rewards", { cache: "no-store" })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Failed to load rewards");
        if (!cancelled) setPayload(json);
      })
      .catch((error) => {
        if (!cancelled) toast.error((error as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rewards = useMemo(() => payload?.rewards ?? [], [payload?.rewards]);
  const rewardById = useMemo(() => new Map(rewards.map((reward) => [reward.id, reward])), [rewards]);
  const usageById = useMemo(() => {
    const usage = new Map<string, number>();
    const add = (id?: string | null) => id && usage.set(id, (usage.get(id) ?? 0) + 1);
    payload?.triviaEvents.forEach((item) => add(item.reward_id));
    payload?.fitnessChallenges.forEach((item) => add(item.reward_id));
    payload?.fitcoinItems.forEach((item) => add(item.catalog_reward_id));
    return usage;
  }, [payload]);

  const openCreate = () => {
    const domain = activeTab === "catalogue" ? "general" : activeTab;
    setEditing(null);
    setDraft(emptyDraft(domain));
    setDialogOpen(true);
  };

  const openEdit = (reward: Reward) => {
    setEditing(reward);
    setDraft({
      name: reward.name,
      description: reward.description ?? "",
      icon: reward.icon,
      imageUrl: reward.image_url ?? "",
      rewardType: reward.reward_type,
      value: reward.value ?? "",
      amount: reward.amount === null ? "" : String(reward.amount),
      currency: reward.currency ?? "GHS",
      domains: reward.domains,
      fulfillmentMethod: reward.fulfillment_method,
      inventoryCount: reward.inventory_count === null ? "" : String(reward.inventory_count),
      isActive: reward.is_active,
    });
    setDialogOpen(true);
  };

  const toggleDomain = (domain: RewardDomain, checked: boolean) => {
    setDraft((current) => ({
      ...current,
      domains: checked
        ? Array.from(new Set([...current.domains, domain]))
        : current.domains.filter((item) => item !== domain),
    }));
  };

  const save = async () => {
    if (!draft.name.trim() || draft.domains.length === 0) {
      toast.error("Add a reward name and at least one use area");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...(editing ? { id: editing.id } : {}),
        name: draft.name,
        description: draft.description || null,
        icon: draft.icon || "🎁",
        imageUrl: draft.imageUrl || null,
        rewardType: draft.rewardType,
        value: draft.value || null,
        amount: draft.amount === "" ? null : Number(draft.amount),
        currency: draft.amount === "" ? null : draft.currency,
        domains: draft.domains,
        fulfillmentMethod: draft.fulfillmentMethod,
        inventoryCount: draft.inventoryCount === "" ? null : Number(draft.inventoryCount),
        isActive: draft.isActive,
      };
      const res = await fetch("/api/rewards", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save reward");
      toast.success(editing ? "Reward updated" : "Reward created");
      setDialogOpen(false);
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const domainRewards = (domain: RewardDomain) =>
    rewards.filter((reward) => reward.domains.includes(domain));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="🎁 Rewards"
        subtitle="One reusable reward catalogue for Trivia, Fitness, FitCoins and other incentive programmes"
      >
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
        {canManage && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New Reward</Button>}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card"><div className="text-2xs font-black uppercase text-slate-400">Catalogue</div><div className="mt-1 text-2xl font-black">{rewards.length}</div></div>
        <div className="card"><div className="text-2xs font-black uppercase text-slate-400">Active</div><div className="mt-1 text-2xl font-black text-emerald-600">{rewards.filter((r) => r.is_active).length}</div></div>
        <div className="card"><div className="text-2xs font-black uppercase text-slate-400">Assignments</div><div className="mt-1 text-2xl font-black">{Array.from(usageById.values()).reduce((a, b) => a + b, 0)}</div></div>
        <div className="card"><div className="text-2xs font-black uppercase text-slate-400">Awards tracked</div><div className="mt-1 text-2xl font-black text-violet-600">{payload?.grants.length ?? 0}</div></div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto bg-transparent p-0">
          <TabsTrigger value="catalogue">📚 Catalogue</TabsTrigger>
          <TabsTrigger value="trivia">🏆 Trivia</TabsTrigger>
          <TabsTrigger value="fitness">💪 Fitness Challenges</TabsTrigger>
          <TabsTrigger value="fitcoins">🪙 FitCoins</TabsTrigger>
          <TabsTrigger value="facility_scout">🔍 FacilityScout</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogue" className="mt-5">
          {loading ? <Loader2 className="mx-auto my-16 h-8 w-8 animate-spin text-emerald-600" /> : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rewards.map((reward) => <RewardCard key={reward.id} reward={reward} usage={usageById.get(reward.id) ?? 0} canManage={canManage} onEdit={() => openEdit(reward)} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trivia" className="mt-5 space-y-5">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">Trivia rewards and event assignments</h2><Link className="btn btn-secondary btn-sm" href="/period?tab=trivia">Manage Trivia</Link></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{domainRewards("trivia").map((reward) => <RewardCard key={reward.id} reward={reward} usage={usageById.get(reward.id) ?? 0} canManage={canManage} onEdit={() => openEdit(reward)} />)}</div>
          <UsageTable rows={payload?.triviaEvents ?? []} rewards={rewardById} empty="No Trivia events have been created." />
        </TabsContent>

        <TabsContent value="fitness" className="mt-5 space-y-5">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">Fitness rewards and challenge assignments</h2><Link className="btn btn-secondary btn-sm" href="/fitness?tab=challenges">Manage Challenges</Link></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{domainRewards("fitness").map((reward) => <RewardCard key={reward.id} reward={reward} usage={usageById.get(reward.id) ?? 0} canManage={canManage} onEdit={() => openEdit(reward)} />)}</div>
          <UsageTable rows={payload?.fitnessChallenges ?? []} rewards={rewardById} empty="No Fitness challenges have been created." />
        </TabsContent>

        <TabsContent value="fitcoins" className="mt-5 space-y-5">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">FitCoins redemption rewards</h2><Link className="btn btn-secondary btn-sm" href="/fitness?tab=fitcoins">Manage FitCoins</Link></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{domainRewards("fitcoins").map((reward) => <RewardCard key={reward.id} reward={reward} usage={usageById.get(reward.id) ?? 0} canManage={canManage} onEdit={() => openEdit(reward)} />)}</div>
          <UsageTable rows={payload?.fitcoinItems ?? []} rewards={rewardById} empty="No FitCoins redemption items have been configured." />
        </TabsContent>

        <TabsContent value="facility_scout" className="mt-5 space-y-5">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">FacilityScout data rewards</h2><Link className="btn btn-secondary btn-sm" href="/facility-scout?tab=rewards">Manage disbursements</Link></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{domainRewards("facility_scout").map((reward) => <RewardCard key={reward.id} reward={reward} usage={usageById.get(reward.id) ?? 0} canManage={canManage} onEdit={() => openEdit(reward)} />)}</div>
          <div className="card">
            <h3 className="font-black">Current programme values</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              {["hospital", "pharmacy", "clinic", "lab", "chps"].map((kind) => (
                <div key={kind} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40"><div className="text-3xs font-black uppercase text-slate-400">{kind}</div><div className="mt-1 font-black">{String(payload?.facilityScoutConfig?.[`reward_${kind}_mb`] ?? 0)} MB</div></div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-amber-500" />{editing ? "Edit reusable reward" : "Create reusable reward"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-5 py-2 md:grid-cols-2">
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Top scorer cash prize" /></div>
              <div><Label>Description</Label><Textarea rows={4} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What the winner receives and any conditions" /></div>
              <div className="grid grid-cols-[90px_1fr] gap-3"><div><Label>Icon</Label><Input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} /></div><div><Label>Type</Label><Select value={draft.rewardType} onValueChange={(value) => setDraft({ ...draft, rewardType: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cash", "points", "badge", "discount", "prize", "airtime", "data", "fitcoins", "subscription", "physical", "other"].map((type) => <SelectItem key={type} value={type}>{type.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div></div>
              <ImageDropZone filePath="rewards/catalogue" onFilesChange={(urls) => setDraft({ ...draft, imageUrl: urls?.[0] || "" })} initialFiles={draft.imageUrl ? [draft.imageUrl] : []} text="Upload reward image" />
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3"><div><Label>Display value</Label><Input value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} placeholder="1,000 points" /></div><div><Label>Cash amount</Label><Input type="number" min="0" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="200" /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Currency</Label><Input maxLength={3} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} /></div><div><Label>Inventory</Label><Input type="number" min="0" value={draft.inventoryCount} onChange={(e) => setDraft({ ...draft, inventoryCount: e.target.value })} placeholder="Unlimited" /></div></div>
              <div><Label>Fulfillment</Label><Select value={draft.fulfillmentMethod} onValueChange={(value) => setDraft({ ...draft, fulfillmentMethod: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["automatic", "manual", "code", "digital", "physical"].map((method) => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent></Select></div>
              <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><legend className="px-1 text-xs font-black uppercase tracking-widest text-slate-500">Available in</legend><div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">{DOMAINS.map((domain) => <label key={domain} className="flex items-center gap-2 text-sm font-semibold"><Checkbox checked={draft.domains.includes(domain)} onCheckedChange={(checked) => toggleDomain(domain, checked === true)} />{DOMAIN_LABELS[domain]}</label>)}</div></fieldset>
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-bold dark:bg-slate-900/40"><Checkbox checked={draft.isActive} onCheckedChange={(checked) => setDraft({ ...draft, isActive: checked === true })} />Active and selectable</label>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={() => void save()} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Save Changes" : "Create Reward"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
