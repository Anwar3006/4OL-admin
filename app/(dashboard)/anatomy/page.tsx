"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Brain,
  Bone,
  HeartPulse,
  RefreshCw,
  ScanLine,
} from "lucide-react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BodySystem = "all" | "cardiovascular" | "nervous" | "skeletal" | "respiratory";

type BodyPart = {
  id: string;
  name: string;
  parent_id: string | null;
  mesh_id: string | null;
  path: string;
  level: number | null;
  body_system: string;
  symptom_count: number;
  condition_count: number;
};

const systems: Array<{
  id: BodySystem;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "all", label: "All Parts", icon: ScanLine },
  { id: "cardiovascular", label: "Cardiovascular", icon: HeartPulse },
  { id: "nervous", label: "Nervous", icon: Brain },
  { id: "skeletal", label: "Skeletal", icon: Bone },
  { id: "respiratory", label: "Respiratory", icon: Activity },
];

export default function AnatomyPage() {
  const [activeSystem, setActiveSystem] = useState<BodySystem>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parts, setParts] = useState<BodyPart[]>([]);

  const loadBodyParts = useCallback(async (system: BodySystem) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/anatomy/body-map?bodySystem=${system}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Unable to load anatomy data.");
      }

      const body = await res.json();
      setParts(body.parts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load anatomy.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBodyParts(activeSystem);
  }, [activeSystem, loadBodyParts]);

  const linkedSymptoms = useMemo(
    () => parts.reduce((sum, part) => sum + part.symptom_count, 0),
    [parts],
  );
  const linkedConditions = useMemo(
    () => parts.reduce((sum, part) => sum + part.condition_count, 0),
    [parts],
  );
  const mappedMeshes = useMemo(
    () => parts.filter((part) => Boolean(part.mesh_id)).length,
    [parts],
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="Human Anatomy"
        subtitle="Body-part taxonomy, symptom mapping, and condition relationships"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => loadBodyParts(activeSystem)}
          disabled={loading}
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="destructive">
          <Activity className="h-4 w-4" />
          <AlertTitle>Anatomy data unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<ScanLine className="h-5 w-5" />}
          label="Body Parts"
          value={loading ? "..." : parts.length}
          variant="blue"
          delta={systems.find((system) => system.id === activeSystem)?.label}
          deltaType="neutral"
        />
        <KpiCard
          icon={<Activity className="h-5 w-5" />}
          label="Symptom Links"
          value={loading ? "..." : linkedSymptoms}
          variant="purple"
          delta="Mapped links"
          deltaType="neutral"
        />
        <KpiCard
          icon={<HeartPulse className="h-5 w-5" />}
          label="Condition Links"
          value={loading ? "..." : linkedConditions}
          variant="teal"
          delta="Mapped links"
          deltaType="neutral"
        />
        <KpiCard
          icon={<Bone className="h-5 w-5" />}
          label="3D Mesh IDs"
          value={loading ? "..." : mappedMeshes}
          variant="green"
          delta="Body model ready"
          deltaType="neutral"
        />
      </div>

      <Tabs value={activeSystem} onValueChange={(value) => setActiveSystem(value as BodySystem)}>
        <div className="border-b border-slate-200">
          <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0">
            {systems.map((system) => (
              <TabsTrigger
                key={system.id}
                value={system.id}
                className="shrink-0 rounded-none border-b-2 border-transparent px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:border-emerald-700 data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:shadow-none"
              >
                <system.icon className="mr-2 h-4 w-4" />
                {system.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {systems.map((system) => (
          <TabsContent key={system.id} value={system.id} className="mt-5 outline-none">
            <BodyPartsTable loading={loading} parts={parts} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function BodyPartsTable({
  loading,
  parts,
}: {
  loading: boolean;
  parts: BodyPart[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">
          Body Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Mesh</TableHead>
              <TableHead>Symptoms</TableHead>
              <TableHead>Conditions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={6} label="Loading body map..." />}
            {!loading && parts.length === 0 && (
              <EmptyRow colSpan={6} label="No body-part records found for this system." />
            )}
            {!loading &&
              parts.map((part) => (
                <TableRow key={part.id}>
                  <TableCell className="font-bold text-slate-800">
                    {part.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={part.body_system === "general" ? "secondary" : "blue"}>
                      {part.body_system}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">
                    {part.path}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {part.mesh_id || "Not mapped"}
                  </TableCell>
                  <TableCell>{part.symptom_count}</TableCell>
                  <TableCell>{part.condition_count}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="h-32 text-center text-sm font-medium text-slate-400"
      >
        {label}
      </TableCell>
    </TableRow>
  );
}
