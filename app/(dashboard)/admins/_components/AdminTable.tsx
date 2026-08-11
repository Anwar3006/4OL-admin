import React, { useMemo } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { ColumnDef } from "@tanstack/react-table";

// Assuming we need a basic implementation that mirrors the table from the HTML
export default function AdminTable() {
  const columns = useMemo<ColumnDef<any>[]>(
    () => [
    { accessorKey: "admin", header: "Admin" },
    { accessorKey: "role", header: "Role" },
    { accessorKey: "mfa", header: "MFA" },
    { accessorKey: "ip", header: "IP Address" },
    { accessorKey: "status", header: "Status" },
    ],
    [],
  );
  
  // This is a placeholder as actual data fetching needs to be implemented
  const data = [
    { admin: "Francis N. Mensah", role: "Super Admin", mfa: "✅ ON", ip: "196.168.1.1", status: "Active" },
    { admin: "Anwar Sadat Mamudu", role: "Admin Mgr", mfa: "❌ OFF", ip: "105.112.5.20", status: "Active" },
  ];

  return (
    <div className="card p-0 overflow-hidden">
      <DataTable columns={columns} data={data} />
    </div>
  );
}
