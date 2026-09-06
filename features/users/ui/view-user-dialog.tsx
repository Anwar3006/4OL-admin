"use client";

import {
  User,
  Mail,
  Phone,
  Calendar,
  Activity,
  Flag,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useViewUserDialog, useFlagUserDialog } from "@/features/users/data/dialog-hooks";
import { useUser } from "@/features/users/data/useUser";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function ViewUserDialog() {
  const { isOpen, entityId, close } = useViewUserDialog();
  const { open: openFlagDialog } = useFlagUserDialog();

  const { data: user, isLoading } = useUser({
    id: entityId || "",
    enabled: isOpen && !!entityId,
  });

  if (!isOpen) return null;

  const handleFlagUser = () => {
    if (entityId && user) {
      openFlagDialog(entityId, user);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 border-b bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <User className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold truncate">
                {user?.name || "User Details"}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className="text-[10px] font-black uppercase tracking-widest bg-white"
                >
                  {user?.user_type?.replace(/_/g, " ") || "User"}
                </Badge>
                <Separator orientation="vertical" className="h-3" />
                <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                  {user?.user_id}
                </span>
              </div>
            </div>
            {user?.status && (
              <Badge
                className={cn(
                  "px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                  user.status === "active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200",
                )}
              >
                {user.status}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              </div>
            ) : user ? (
              <>
                <section>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <InfoRow label="Email" value={user.email} icon={Mail} />
                    <InfoRow
                      label="Phone"
                      value={user.phone_number}
                      icon={Phone}
                    />
                  </div>
                </section>

                <Separator />

                <section>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                    Activity
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <InfoRow
                      label="Created At"
                      value={
                        user.created_at
                          ? format(new Date(user.created_at), "MMM dd, yyyy")
                          : null
                      }
                      icon={Calendar}
                    />
                    <InfoRow
                      label="Updated At"
                      value={
                        user.updated_at
                          ? format(
                              new Date(user.updated_at),
                              "MMM dd, yyyy HH:mm",
                            )
                          : "Never"
                      }
                      icon={Activity}
                    />
                  </div>
                </section>

                <Separator />

                <section>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                    Account Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <InfoRow
                      label="User Type"
                      value={user.user_type?.replace(/_/g, " ")}
                      icon={User}
                    />
                    {user.role && (
                      <InfoRow label="Role" value={user.role} icon={User} />
                    )}
                  </div>
                </section>
              </>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">User not found</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {user && (
          <div className="p-6 border-t bg-slate-50/50 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11 font-black uppercase tracking-widest text-[10px]"
              onClick={close}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-11 font-black uppercase tracking-widest text-[10px]"
              onClick={handleFlagUser}
            >
              <Flag className="h-4 w-4 mr-2" />
              Flag User
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value, icon: Icon }: any) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span className="text-xs font-bold text-slate-700 truncate">
          {value}
        </span>
      </div>
    </div>
  );
}
