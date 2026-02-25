import { MailPlus } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export const StatsCard = ({
  label,
  value,
  variant = "default",
  onClick,
  active,
}: {
  label: string;
  value: number;
  variant?: "default" | "success" | "warning" | "neutral" | "info" | "red";
  onClick?: () => void;
  active?: boolean;
}) => {
  const colorClasses = {
    default: "text-foreground",
    success: "text-green-600",
    warning: "text-yellow-600",
    neutral: "text-gray-600",
    red: "text-red-600",
    info: "text-blue-600",
  };

  return (
    <button
      onClick={onClick}
      className="hover:scale-110 cursor-pointer transition-transform duration-500 ease-in-out"
    >
      <div
        className={cn(
          "bg-white border rounded-lg p-4",
          active && "shadow-md border-green-600"
        )}
      >
        <div className={cn("text-2xl xl:text-4xl font-bold", colorClasses[variant])}>
          {value}
        </div>
        <div className="text-sm xl:text-lg text-muted-foreground">{label}</div>
      </div>
    </button>
  );
};

export function TableSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-gray-200 rounded w-32 animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export const ErrorState = ({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <Button onClick={onRetry} variant="outline">
        Try Again
      </Button>
    </div>
  );
};

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-lg font-semibold mb-2">No admins found</div>
      <p className="text-sm text-muted-foreground mb-4">
        Get started by inviting your first admin user.
      </p>
      <Button>
        <MailPlus className="h-4 w-4 mr-2" />
        Invite Admin
      </Button>
    </div>
  );
}
