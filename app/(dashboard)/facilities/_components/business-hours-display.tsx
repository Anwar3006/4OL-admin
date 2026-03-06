import { cn } from "@/lib/utils";
import { Clock, AlertCircle } from "lucide-react";

// Helper to format hours display
const formatTime = (time: string) => time || "00:00";

const BusinessHoursDisplay = ({ businessHours }: { businessHours: any[] }) => {
  if (!businessHours || businessHours.length === 0) return null;

  // 1. Identify if the facility is "Open Now" (Optional UX win)
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayHours = businessHours.find((h) => h.day === today);

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
        Operating Hours
        {todayHours?.isClosed ? (
          <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full lowercase tracking-normal">
            Closed Today
          </span>
        ) : (
          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full lowercase tracking-normal">
            Open Today
          </span>
        )}
      </h3>

      <div className="bg-muted/30 rounded-xl p-5 border border-border/40 space-y-3">
        {/* List of Days */}
        <div className="grid grid-cols-1 gap-y-2">
          {businessHours.map((item) => (
            <div
              key={item.day}
              className="flex justify-between items-center text-sm"
            >
              <span
                className={cn(
                  "font-medium",
                  item.day === today ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.day}
              </span>

              {item.isClosed ? (
                <span className="text-xs font-semibold text-muted-foreground/50 uppercase italic">
                  Closed
                </span>
              ) : (
                <span className="font-mono text-xs bg-background/50 px-2 py-1 rounded border border-border/20">
                  {formatTime(item.open)} — {formatTime(item.close)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Dynamic Footer Note */}
        <div className="pt-3 mt-3 border-t border-border/40">
          <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5 italic">
            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
            Weekend services vary. Please call the facility to confirm holiday
            hours or emergency availability.
          </p>
        </div>
      </div>
    </section>
  );
};

export default BusinessHoursDisplay;
