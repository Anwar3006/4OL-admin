import React from "react";
import DataTable from "@/components/redesign/DataTable";

// Assuming we need a basic implementation that mirrors the table from the HTML
export default function AdminTable() {
  const columns = [
    { key: "admin", label: "Admin" },
    { key: "role", label: "Role" },
    { key: "mfa", label: "MFA" },
    { key: "ip", label: "IP Address" },
    { key: "status", label: "Status" },
  ];
  
  // This is a placeholder as actual data fetching needs to be implemented
  const data = [
    { admin: "Francis N. Mensah", role: "Super Admin", mfa: "✅ ON", ip: "196.168.1.1", status: "Active" },
    { admin: "Anwar Sadat Mamudu", role: "Admin Mgr", mfa: "❌ OFF", ip: "105.112.5.20", status: "Active" },
  ];

  return (
    <div className="card p-0 overflow-hidden">
      <DataTable columns={columns} data={data} selectable />
    </div>
  );
}
