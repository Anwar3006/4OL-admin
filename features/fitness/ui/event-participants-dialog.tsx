"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useOutdoorEventRegistrations } from "@/features/fitness/data/useFitnessOutdoor";

interface EventParticipantsDialogProps {
  event: any | null;
  onClose: () => void;
}

const STATUS_BADGES: Record<string, string> = {
  registered: "badge-blue",
  attended: "badge-green",
  cancelled: "badge-red",
};

// m-view-participants port (Gap Analysis Part F, phase 5).
const EventParticipantsDialog = ({ event, onClose }: EventParticipantsDialogProps) => {
  const { data: registrations, isLoading } = useOutdoorEventRegistrations(
    event?.id ?? null,
  );

  if (!event) return null;

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>👥 Event Participants</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="card bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between">
            <div>
              <div className="font-black text-sm text-slate-800 dark:text-slate-200">{event.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {event.start_at
                  ? new Date(event.start_at).toLocaleString()
                  : "No start time"}
                {event.area ? ` · ${event.area}` : ""}
              </div>
            </div>
            <span className="badge badge-blue">
              {event.current_participants ?? registrations?.length ?? 0}
              {event.max_participants ? ` / ${event.max_participants}` : ""}
            </span>
          </div>

          <div className="max-h-[320px] overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Loading participants…
              </div>
            ) : !registrations?.length ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No registrations recorded yet. Sign-ups from the mobile app
                will appear here.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sticky top-0">
                    {["Participant", "Contact", "Registered", "Status"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-3xs font-black uppercase tracking-widest text-slate-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg: any) => (
                    <tr key={reg.id} className="border-b border-slate-50">
                      <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-300">
                        {`${reg.user?.first_name ?? ""} ${reg.user?.last_name ?? ""}`.trim() ||
                          "Unknown user"}
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {reg.user?.phone_number || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {new Date(reg.registered_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "badge uppercase text-3xs font-black",
                            STATUS_BADGES[reg.status] ?? "badge-slate",
                          )}
                        >
                          {reg.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventParticipantsDialog;
