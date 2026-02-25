import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ConditionsStatsProps = {
  label: string;
  value: number | string;
  isLoading: boolean;
};

const ConditionsStats = ({ label, value, isLoading }: ConditionsStatsProps) => {
  return (
    <div className={cn("bg-white border rounded-lg p-4 border-gray-300 shadow-md dark:bg-slate-800 dark:border-slate-700")}>
      {isLoading ? (
        <div className="flex items-center justify-center py-2">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 text-center">{label}</div>
        </div>
      )}
    </div>
  );
};

export default ConditionsStats;
