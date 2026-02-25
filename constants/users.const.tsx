import { ClipboardList, Crown, ShieldCheck, User } from "lucide-react";
import { JSX } from "react";

export const StatusMap: Record<string, JSX.Element> = {
  pending: (
    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
      Pending
    </span>
  ),
  active: (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
      Active
    </span>
  ),
  inactive: (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
      Inactive
    </span>
  ),
  suspended: (
    <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
      Suspended
    </span>
  ),
  deleted: (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
      Deleted
    </span>
  ),
};

export const RoleMap: Record<string, JSX.Element> = {
  super_admin: (
    <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-purple-600">
      <Crown className="h-4 w-4 sm:h-5 sm:w-5" />
      <span>Super Admin</span>
    </div>
  ),
  admin: (
    <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-blue-600">
      <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
      <span>Admin</span>
    </div>
  ),
  registrar: (
    <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-amber-600">
      <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" />
      <span>Registrar</span>
    </div>
  ),
  user: (
    <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-600">
      <User className="h-4 w-4 sm:h-5 sm:w-5" />
      <span>User</span>
    </div>
  ),
};
