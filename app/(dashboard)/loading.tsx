export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">
          Loading dashboard
        </h2>
        <p className="mt-2 text-xs font-medium text-slate-400">
          Preparing the latest admin view.
        </p>
      </div>
    </div>
  );
}
