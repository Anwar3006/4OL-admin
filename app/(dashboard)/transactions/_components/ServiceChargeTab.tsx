import DataTable, { Column } from "@/components/redesign/DataTable";

export interface ServiceChargeRow {
  id: string;
  entity: string;
  type: string;
  value: string;
  rate: string;
  fee: string;
  method: string;
  date: string;
  status: string;
}

const rates = [
  { name: "💊 Medication Enquiry (IBP Order)", rate: "4.5%" },
  { name: "🏥 Facility Booking Fee", rate: "5.0%" },
  { name: "💰 IBP Product Sale", rate: "3.5%" },
  { name: "📢 Marketing Campaign (IBP)", rate: "6.0%" },
  { name: "🚚 Delivery / Escrow Release", rate: "2.0%" },
];

const transactions: ServiceChargeRow[] = [
  { id: "SVC-2026-0412", entity: "HealthPlus Pharmacy", type: "Med Enquiry", value: "₵420.00", rate: "4.5%", fee: "₵18.90", method: "Bank Transfer", date: "May 6, 2026", status: "Settled" },
  { id: "SVC-2026-0408", entity: "Medlab Ghana", type: "Marketing", value: "₵800.00", rate: "6.0%", fee: "₵48.00", method: "MTN MoMo", date: "May 5, 2026", status: "Settled" },
];

export default function ServiceChargeTab() {
  const columns: Column<ServiceChargeRow>[] = [
    { key: "id", label: "Payment ID", render: (val) => <span className="font-mono text-[10px] text-slate-500">{val}</span> },
    { key: "entity", label: "Entity", render: (val) => <div className="font-bold text-slate-800">{val}</div> },
    { key: "type", label: "Type", render: (val) => <span className="badge badge-secondary">{val}</span> },
    { key: "value", label: "Value", render: (val) => <span className="font-bold">{val}</span> },
    { key: "rate", label: "Rate", render: (val) => <span className="badge badge-blue">{val}</span> },
    { key: "fee", label: "Fee Collected", render: (val) => <span className="font-black text-ek-blue">{val}</span> },
    { key: "method", label: "Method" },
    { key: "date", label: "Date", render: (val) => <span className="text-slate-400 font-medium">{val}</span> },
    { key: "status", label: "Status", render: (val) => <span className="badge badge-green">✅ {val}</span> },
  ];

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-0 overflow-hidden">
          <div className="card-header bg-ek-green/5 border-b border-slate-100 flex justify-between items-center px-4 py-3">
            <h2 className="card-title text-xs">📊 Service Charge Rates</h2>
            <button className="btn btn-primary btn-sm text-[10px] font-black uppercase tracking-widest">Save Rates</button>
          </div>
          <div className="bg-amber-50 p-2 text-[10px] font-bold text-amber-700 border-b border-amber-100 px-4">
            💡 Rate changes apply to all new transactions immediately.
          </div>
          <div className="divide-y divide-slate-50">
            {rates.map((r, i) => (
              <div key={i} className="flex justify-between items-center p-3 px-4 text-xs font-bold">
                <span className="text-slate-600 font-medium">{r.name}</span>
                <div className="flex items-center gap-2">
                  <input type="text" value={r.rate.replace('%','')} className="w-12 h-7 rounded-lg border border-slate-200 text-center font-black text-slate-800 outline-none focus:ring-2 focus:ring-ek-green/20" />
                  <span className="text-slate-400">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header border-b border-slate-100 mb-4"><h2 className="card-title text-xs">📊 Service Fee Revenue (MTD)</h2></div>
          <div className="space-y-1">
            {["Medication Enquiry", "Facility Booking", "IBP Product Sale", "Marketing Campaign"].map((l, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 text-xs font-bold">
                    <span className="text-slate-500 font-medium">{l} Fees</span>
                    <span className="text-ek-blue">₵{2000 + (i*500)}</span>
                </div>
            ))}
            <div className="flex justify-between items-center pt-3 mt-1 border-t-2 border-slate-100 text-xs font-black">
                <span className="text-slate-800">Total Service Fee Revenue</span>
                <span className="text-ek-green-dark">₵12,760</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={transactions} selectable />
      </div>
    </div>
  );
}
