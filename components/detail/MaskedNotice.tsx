import { AlertTriangle } from "lucide-react";

/**
 * Full-width PHI-masking notice shown at the top of a detail modal when the
 * server masked identifiers for the caller's role. Kept shared so every
 * masked surface (users, admins, period, reminders) explains masking identically.
 */
export function MaskedNotice({
  message = "Sensitive identifiers (name, email, phone, NHIS) are masked for your role. Only super admins see them in full.",
}: {
  message?: string;
}) {
  return (
    <div className="px-6 py-2.5 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
        {message}
      </p>
    </div>
  );
}
