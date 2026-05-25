"use client";

import React from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Trophy, 
  ShieldCheck, 
  Plus, 
  MessageSquare, 
  ClipboardList,
  ArrowUpRight,
  Zap,
  Calendar,
  Download,
  UserSquare,
  Activity,
  HeartPulse,
  Bot
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

const DashboardTab = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Alert / Intro */}
      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3">
         <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-200">
            <Activity className="h-5 w-5" />
         </div>
         <div>
            <h4 className="text-sm font-bold text-emerald-900">Platform-Wide Fitness Dashboard</h4>
            <p className="text-xs text-emerald-700 font-medium">Real-time overview of exercise engagement, trainer performance, and community growth.</p>
         </div>
      </div>

      {/* Primary KPI Grid (6 columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Active Plans", value: "1,240", color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total Users", value: "3,840", color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Challenges", value: "284", color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Uptime", value: "96%", color: "text-green-600", bg: "bg-green-50" },
          { label: "New (7d)", value: "18", color: "text-purple-600", bg: "bg-purple-50" },
          { label: "WA Members", value: "842", color: "text-teal-600", bg: "bg-teal-50" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{kpi.label}</p>
            <h3 className={`text-xl font-black ${kpi.color}`}>{kpi.value}</h3>
          </div>
        ))}
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Active Users Chart Placeholder */}
        <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                 <BarChart3 className="h-5 w-5 text-primary" />
                 Weekly Active Users
              </CardTitle>
              <Badge variant="outline" className="bg-white border-slate-200">7 Day Trend</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8 h-64 flex items-end justify-between gap-2">
            {[65, 45, 78, 90, 85, 40, 55].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                <div 
                  className="w-full bg-emerald-100 rounded-t-xl transition-all group-hover:bg-emerald-500 group-hover:shadow-lg group-hover:shadow-emerald-200" 
                  style={{ height: `${val}%` }} 
                />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Plan Completion Rate */}
        <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
             <CardTitle className="text-lg font-black flex items-center gap-2">
                 <TrendingUp className="h-5 w-5 text-primary" />
                 Plan Completion Rate
              </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {[
              { label: "Weight Loss Sprint", val: 82, color: "bg-blue-500" },
              { label: "Strength Foundation", val: 64, color: "bg-emerald-500" },
              { label: "HIIT Mastery", val: 45, color: "bg-amber-500" },
              { label: "Yoga for Mobility", val: 92, color: "bg-purple-500" },
            ].map((plan, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-500">
                  <span>{plan.label}</span>
                  <span>{plan.val}%</span>
                </div>
                <Progress value={plan.val} className="h-2 bg-slate-100" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Plans Table */}
      <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
        <CardHeader className="p-8 bg-slate-50/50 border-b border-slate-100">
           <CardTitle className="text-xl font-black">🏆 Top Performing Plans</CardTitle>
           <CardDescription>Highest revenue and completion rates this quarter</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-none">
                <TableHead className="font-black text-[10px] uppercase tracking-widest px-8">Plan</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Type</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Users</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-right px-8">Completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: "Summer Shred (8wk)", type: "Archetype", users: 1240, completion: "84%" },
                { name: "Bulk Mastery (12wk)", type: "Manual", users: 890, completion: "62%" },
                { name: "Custom AI HIIT", type: "AI-Generated", users: 450, completion: "78%" },
              ].map((row, i) => (
                <TableRow key={i} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                  <TableCell className="px-8 font-bold text-slate-700">{row.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-lg bg-slate-100 text-slate-600 font-bold border-none">{row.type}</Badge>
                  </TableCell>
                  <TableCell className="font-medium text-slate-500">{row.users.toLocaleString()}</TableCell>
                  <TableCell className="text-right px-8 font-black text-emerald-600">{row.completion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Super Admin Commands */}
      <div className="space-y-4">
         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">⚡ Super Admin Commands — Fitness</h4>
         <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: "AI Studio", icon: Bot, color: "hover:bg-blue-50 hover:text-blue-600" },
              { label: "Schedule Broadcast", icon: MessageSquare, color: "hover:bg-emerald-50 hover:text-emerald-600" },
              { label: "Export Analytics", icon: Download, color: "hover:bg-amber-50 hover:text-amber-600" },
              { label: "Manage Trainers", icon: UserSquare, color: "hover:bg-purple-50 hover:text-purple-600" },
              { label: "Review Challenges", icon: Trophy, color: "hover:bg-rose-50 hover:text-rose-600" },
              { label: "Health Integrations", icon: HeartPulse, color: "hover:bg-teal-50 hover:text-teal-600" },
            ].map((cmd, i) => (
              <Button 
                key={i} 
                variant="outline" 
                className={`h-auto py-6 rounded-[1.5rem] border-slate-200 flex flex-col gap-3 font-bold transition-all shadow-sm ${cmd.color}`}
              >
                <cmd.icon className="h-6 w-6" />
                <span className="text-xs">{cmd.label}</span>
              </Button>
            ))}
         </div>
      </div>
    </div>
  );
};

export default DashboardTab;
