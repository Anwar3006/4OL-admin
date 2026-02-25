import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ConditionsStatsProps = {
  label: string;
  value: number | string;
  borderColor?: string;
  isLoading: boolean;
};

const ConditionsStats = ({
  label,
  value,
  borderColor,
  isLoading,
}: ConditionsStatsProps) => {
  return (
    <div
      className={cn("bg-white border rounded-lg p-4 border-gray-300 shadow-md")}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      )}
    </div>
  );
};

export default ConditionsStats;
