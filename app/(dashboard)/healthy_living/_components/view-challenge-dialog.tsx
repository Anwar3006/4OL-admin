"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useViewChallengeDialog,
  useAddChallengeDialog,
} from "@/stores/dialog-store";
import { useChallenge } from "@/hooks/supabase-calls/useChallenge";
import { Trophy, Calendar, Zap, Users, ShieldCheck, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ViewChallengeDialog = () => {
  const { isOpen, close, entityId } = useViewChallengeDialog();
  const { open: openAdd } = useAddChallengeDialog();
  const { data, isLoading } = useChallenge(entityId!);

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            Loading challenge details...
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            Challenge not found
          </div>
        ) : (
          <div className="space-y-8 py-4">
            <div className="relative h-48 w-full rounded-2xl overflow-hidden shadow-md">
              <img
                src={data.image_url || "/placeholder-challenge.jpg"}
                alt={data.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4">
                <Badge
                  variant={data.status ? "default" : "secondary"}
                  className={
                    data.status ? "bg-emerald-500 hover:bg-emerald-600" : ""
                  }
                >
                  {data.status ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            <SheetHeader className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Trophy className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Active Challenge
                </span>
              </div>
              <SheetTitle className="text-3xl font-extrabold text-slate-900 leading-tight">
                {data.name}
              </SheetTitle>
            </SheetHeader>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Period
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {data.period}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Type
                  </span>
                  <span className="text-sm font-semibold text-slate-700 capitalize">
                    {data.type.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>

            {data.description && (
              <div className="space-y-3 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  About this Challenge
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {data.description}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Participants ({data.member_count})
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.members.length > 0 ? (
                  data.members.map((m, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="bg-white border-slate-200 text-xs font-medium px-3 py-1 flex items-center gap-2"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={m.avatar_url || ""} />
                        <AvatarFallback className="text-[8px]">
                          {m.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      {m.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground italic">
                    No participants yet
                  </span>
                )}
              </div>
            </div>

            <Button
              className="w-full h-12 text-lg font-bold shadow-md hover:shadow-lg transition-all"
              onClick={() => openAdd(data)}
            >
              Edit Challenge
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ViewChallengeDialog;
