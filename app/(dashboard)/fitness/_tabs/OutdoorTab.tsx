"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import DataTable from "@/components/redesign/DataTable";
import KpiCard from "@/components/redesign/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useFitnessOutdoorRoutes,
  useDeleteFitnessOutdoorRoute,
  useFitnessOutdoorEvents,
  useDeleteFitnessOutdoorEvent,
  useFitnessOutdoorReviews,
  useDeleteFitnessOutdoorReview,
} from "@/hooks/supabase-calls/useFitnessOutdoor";
import {
  useAddOutdoorRouteDialog,
  useViewOutdoorRouteDialog,
  useAddOutdoorEventDialog,
  useViewOutdoorEventDialog,
  useAddOutdoorReviewDialog,
  useViewOutdoorReviewDialog,
} from "@/stores/dialog-store";
import AddOutdoorRouteDialog from "../_components/add-outdoor-route-dialog";
import ViewOutdoorRouteDialog from "../_components/view-outdoor-route-dialog";
import AddOutdoorEventDialog from "../_components/add-outdoor-event-dialog";
import ViewOutdoorEventDialog from "../_components/view-outdoor-event-dialog";
import AddOutdoorReviewDialog from "../_components/add-outdoor-review-dialog";
import ViewOutdoorReviewDialog from "../_components/view-outdoor-review-dialog";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Calendar,
  MessageSquare,
  Search,
  Filter,
  Plus,
  Navigation,
  Clock,
  Star,
  ShieldAlert,
} from "lucide-react";

const OutdoorTab = () => {
  const [activeSubTab, setActiveSubTab] = useState("routes");

  // Search & Pagination States
  const [routeSearch, setRouteSearch] = useState("");
  const [routeDifficulty, setRouteDifficulty] = useState("all");
  const [routePage, setRoutePage] = useState(1);
  const debouncedRouteSearch = useDebounce(routeSearch, 500);

  const [eventSearch, setEventSearch] = useState("");
  const [eventStatus, setEventStatus] = useState("all");
  const [eventPage, setEventPage] = useState(1);
  const debouncedEventSearch = useDebounce(eventSearch, 500);

  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewRating, setReviewRating] = useState("all");
  const [reviewPage, setReviewPage] = useState(1);
  const debouncedReviewSearch = useDebounce(reviewSearch, 500);

  const limit = 10;

  // Dialog Stores
  const addRouteDialog = useAddOutdoorRouteDialog();
  const viewRouteDialog = useViewOutdoorRouteDialog();
  const addEventDialog = useAddOutdoorEventDialog();
  const viewEventDialog = useViewOutdoorEventDialog();
  const addReviewDialog = useAddOutdoorReviewDialog();
  const viewReviewDialog = useViewOutdoorReviewDialog();

  // Queries
  const { data: routesData, isLoading: routesLoading } = useFitnessOutdoorRoutes({
    page: routePage,
    limit,
    search: debouncedRouteSearch,
    difficulty: routeDifficulty,
  });

  const { data: eventsData, isLoading: eventsLoading } = useFitnessOutdoorEvents({
    page: eventPage,
    limit,
    search: debouncedEventSearch,
    status: eventStatus,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useFitnessOutdoorReviews({
    page: reviewPage,
    limit,
    search: debouncedReviewSearch,
    rating: reviewRating,
  });

  // Mutations
  const { mutate: deleteRoute } = useDeleteFitnessOutdoorRoute();
  const { mutate: deleteEvent } = useDeleteFitnessOutdoorEvent();
  const { mutate: deleteReview } = useDeleteFitnessOutdoorReview();

  // Reset pages on search/filter update
  useEffect(() => { setRoutePage(1); }, [debouncedRouteSearch, routeDifficulty]);
  useEffect(() => { setEventPage(1); }, [debouncedEventSearch, eventStatus]);
  useEffect(() => { setReviewPage(1); }, [debouncedReviewSearch, reviewRating]);

  // Handlers
  const handleDeleteRoute = useCallback((id: string) => {
    if (window.confirm("Are you sure you want to delete this route? This will also cascade delete related events and reviews.")) {
      deleteRoute(id);
    }
  }, [deleteRoute]);

  const handleDeleteEvent = useCallback((id: string) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      deleteEvent(id);
    }
  }, [deleteEvent]);

  const handleDeleteReview = useCallback((id: string) => {
    if (window.confirm("Are you sure you want to delete this review?")) {
      deleteReview(id);
    }
  }, [deleteReview]);

  // Dynamic KPI counts (using metadata from queries or fallback)
  const totalRoutes = routesData?.meta?.total ?? 0;
  const totalEvents = eventsData?.meta?.total ?? 0;
  const totalReviews = reviewsData?.meta?.total ?? 0;

  // Render Star Utility
  const renderStars = (rating: number) => {
    return (
      <div className="text-ek-gold text-[10px] flex gap-0.5">
        {"⭐".repeat(rating || 5)}
        <span className="text-slate-200">{"⭐".repeat(5 - (rating || 5))}</span>
      </div>
    );
  };

  // -------------------------------------------------------------
  // TABLE COLUMNS CONFIGURATIONS
  // -------------------------------------------------------------
  const routeColumns = [
    {
      key: "name",
      label: "Route Details",
      render: (val: string, row: any) => (
        <div className="flex flex-col min-w-[200px]">
          <span className="font-bold text-slate-800 text-sm hover:underline cursor-pointer" onClick={() => viewRouteDialog.open(row.id)}>
            {val}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            {row.category || "General Trail"}
          </span>
        </div>
      ),
    },
    {
      key: "difficulty",
      label: "Difficulty",
      render: (val: string) => {
        const colors = {
          low: "badge-green",
          medium: "badge-blue",
          high: "badge-amber",
          critical: "badge-red",
          info: "bg-slate-100 text-slate-600",
        };
        return (
          <span className={cn("badge uppercase tracking-wider text-[9px] font-black", colors[val as keyof typeof colors] || "badge-blue")}>
            {val}
          </span>
        );
      },
    },
    {
      key: "distance_duration",
      label: "Distance / Est. Time",
      render: (_: any, row: any) => (
        <div className="space-y-0.5 text-[11px] font-semibold text-slate-600">
          <div className="flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {row.distance_km ? `${row.distance_km} km` : "—"}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {row.estimated_duration_mins ? `${row.estimated_duration_mins} mins` : "—"}
          </div>
        </div>
      ),
    },
    {
      key: "surface_type",
      label: "Surface",
      render: (val: string) => <span className="text-[11px] font-medium text-slate-600">{val || "Natural"}</span>,
    },
    {
      key: "verification_status",
      label: "Status",
      render: (val: string) => (
        <span className={cn(
          "badge uppercase tracking-wider text-[9px] font-black",
          val === "approved" ? "badge-green" : val === "rejected" ? "badge-red" : "badge-amber"
        )}>
          {val.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "creator",
      label: "Creator",
      render: (_: any, row: any) => (
        <span className="text-xs font-semibold text-slate-600">
          {row.creator ? `${row.creator.first_name || ""} ${row.creator.last_name || ""}`.trim() : "System"}
        </span>
      ),
    },
  ];

  const eventColumns = [
    {
      key: "title",
      label: "Event Details",
      render: (val: string, row: any) => (
        <div className="flex flex-col min-w-[200px]">
          <span className="font-bold text-slate-800 text-sm hover:underline cursor-pointer" onClick={() => viewEventDialog.open(row.id)}>
            {val}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            {row.category || "Fitness Event"}
          </span>
        </div>
      ),
    },
    {
      key: "route",
      label: "Linked Route",
      render: (val: any) => (
        <span className="text-xs font-bold text-slate-700">
          {val ? val.name : <span className="text-slate-300 italic">—</span>}
        </span>
      ),
    },
    {
      key: "start_at",
      label: "Starts At",
      render: (val: string) => (
        <span className="text-[11px] font-semibold text-slate-600">
          {val ? new Date(val).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
        </span>
      ),
    },
    {
      key: "participants",
      label: "Participants",
      render: (_: any, row: any) => (
        <span className="text-xs font-bold text-slate-700">
          {row.current_participants} / {row.max_participants || "∞"}
        </span>
      ),
    },
    {
      key: "area",
      label: "Area",
      render: (val: string) => <span className="text-xs text-slate-600 font-medium capitalize">{val || "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (val: string) => (
        <span className={cn(
          "badge uppercase tracking-wider text-[9px] font-black",
          val === "active" ? "badge-green" : val === "upcoming" ? "badge-blue" : val === "completed" ? "badge-purple" : "bg-slate-400 text-white"
        )}>
          {val}
        </span>
      ),
    },
  ];

  const reviewColumns = [
    {
      key: "route",
      label: "Route Details",
      render: (val: any) => (
        <span className="text-xs font-bold text-slate-700">
          {val ? val.name : <span className="text-slate-300 italic">—</span>}
        </span>
      ),
    },
    {
      key: "user",
      label: "User",
      render: (val: any) => (
        <span className="text-xs font-semibold text-slate-600">
          {val ? `${val.first_name || ""} ${val.last_name || ""}`.trim() : "Anonymous"}
        </span>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      render: (val: number) => renderStars(val),
    },
    {
      key: "comment",
      label: "Review Snippet",
      render: (val: string, row: any) => (
        <div className="max-w-[240px] truncate text-xs text-slate-500 font-medium hover:underline cursor-pointer" onClick={() => viewReviewDialog.open(row.id)}>
          {val || <span className="text-slate-300 italic">No text comment</span>}
        </div>
      ),
    },
    {
      key: "moderation_status",
      label: "Moderation",
      render: (val: string, row: any) => (
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "badge uppercase tracking-wider text-[9px] font-black",
            val === "approved" ? "badge-green" : val === "pending_review" ? "badge-amber" : "badge-red"
          )}>
            {val.replace("_", " ")}
          </span>
          {row.is_flagged && (
            <span className="badge badge-red uppercase text-[8px] tracking-wide font-black px-1.5 h-4 flex items-center justify-center gap-0.5">
              <ShieldAlert className="w-2.5 h-2.5 text-white shrink-0" /> FLAGGED
            </span>
          )}
        </div>
      ),
    },
  ];

  // -------------------------------------------------------------
  // ROW ACTIONS DEFINITIONS
  // -------------------------------------------------------------
  const routeRowActions = [
    { label: "View Details", icon: "👁️", onClick: (row: any) => viewRouteDialog.open(row.id) },
    { label: "Edit Route", icon: "✏️", onClick: (row: any) => addRouteDialog.open(row) },
    { label: "Delete Route", icon: "🗑️", onClick: (row: any) => handleDeleteRoute(row.id), danger: true },
  ];

  const eventRowActions = [
    { label: "View Details", icon: "👁️", onClick: (row: any) => viewEventDialog.open(row.id) },
    { label: "Edit Event", icon: "✏️", onClick: (row: any) => addEventDialog.open(row) },
    { label: "Delete Event", icon: "🗑️", onClick: (row: any) => handleDeleteEvent(row.id), danger: true },
  ];

  const reviewRowActions = [
    { label: "View Details", icon: "👁️", onClick: (row: any) => viewReviewDialog.open(row.id) },
    { label: "Moderate / Edit", icon: "✏️", onClick: (row: any) => addReviewDialog.open(row) },
    { label: "Delete Review", icon: "🗑️", onClick: (row: any) => handleDeleteReview(row.id), danger: true },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Sub-KPI Row for Outdoor Management */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          icon="🌳"
          label="Total Outdoor Routes"
          value={totalRoutes.toString()}
          variant="green"
          delta="Trails, tracks, loops"
        />
        <KpiCard
          icon="📅"
          label="Upcoming/Active Events"
          value={totalEvents.toString()}
          variant="blue"
          delta="Community runs & hikes"
        />
        <KpiCard
          icon="⭐"
          label="Route Feedbacks"
          value={totalReviews.toString()}
          variant="orange"
          delta="User reviews & ratings"
        />
      </div>

      <Tabs defaultValue="routes" className="w-full min-w-0" onValueChange={setActiveSubTab}>
        
        {/* Sub-tabs header navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6 flex-wrap gap-4">
          <TabsList className="bg-slate-100/50 p-1 flex gap-1 rounded-xl">
            <TabsTrigger
              value="routes"
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all border border-transparent cursor-pointer",
                "data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:border-slate-200/60 data-[state=active]:shadow-sm"
              )}
            >
              <MapPin className="w-3.5 h-3.5 mr-1.5 inline-block shrink-0" />
              Routes
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all border border-transparent cursor-pointer",
                "data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:border-slate-200/60 data-[state=active]:shadow-sm"
              )}
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5 inline-block shrink-0" />
              Events
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all border border-transparent cursor-pointer",
                "data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:border-slate-200/60 data-[state=active]:shadow-sm"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5 inline-block shrink-0" />
              Reviews
            </TabsTrigger>
          </TabsList>

          {/* Dynamic addition trigger button */}
          <div>
            {activeSubTab === "routes" && (
              <button className="btn btn-primary text-white flex items-center gap-1 text-xs" onClick={() => addRouteDialog.open()}>
                <Plus className="h-4 w-4" /> Create Route
              </button>
            )}
            {activeSubTab === "events" && (
              <button className="btn btn-primary text-white flex items-center gap-1 text-xs" onClick={() => addEventDialog.open()}>
                <Plus className="h-4 w-4" /> Create Event
              </button>
            )}
            {activeSubTab === "reviews" && (
              <button className="btn btn-primary text-white flex items-center gap-1 text-xs" onClick={() => addReviewDialog.open()}>
                <Plus className="h-4 w-4" /> Post Review
              </button>
            )}
          </div>
        </div>

        {/* -------------------------------------------------------------
            SUB-TAB: ROUTES
            ------------------------------------------------------------- */}
        <TabsContent value="routes" className="outline-none space-y-4">
          <div className="card">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Search routes by name..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-ek-green/20 focus:border-ek-green transition-all"
                  value={routeSearch}
                  onChange={(e) => setRouteSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <select
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white cursor-pointer hover:bg-slate-50 text-slate-600 font-medium"
                  value={routeDifficulty}
                  onChange={(e) => setRouteDifficulty(e.target.value)}
                >
                  <option value="all">Difficulty: All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <button className="btn btn-secondary text-xs">📥 Export CSV</button>
              </div>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <DataTable
              columns={routeColumns}
              data={routesData?.routes || []}
              rowActions={routeRowActions}
              isLoading={routesLoading}
              externalPage={routePage}
              externalTotalPages={routesData?.meta?.totalPages || 1}
              onPageChange={setRoutePage}
              itemsPerPage={limit}
            />
          </div>
        </TabsContent>

        {/* -------------------------------------------------------------
            SUB-TAB: EVENTS
            ------------------------------------------------------------- */}
        <TabsContent value="events" className="outline-none space-y-4">
          <div className="card">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Search events by title..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-ek-green/20 focus:border-ek-green transition-all"
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <select
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white cursor-pointer hover:bg-slate-50 text-slate-600 font-medium"
                  value={eventStatus}
                  onChange={(e) => setEventStatus(e.target.value)}
                >
                  <option value="all">Status: All</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button className="btn btn-secondary text-xs">📥 Export CSV</button>
              </div>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <DataTable
              columns={eventColumns}
              data={eventsData?.events || []}
              rowActions={eventRowActions}
              isLoading={eventsLoading}
              externalPage={eventPage}
              externalTotalPages={eventsData?.meta?.totalPages || 1}
              onPageChange={setEventPage}
              itemsPerPage={limit}
            />
          </div>
        </TabsContent>

        {/* -------------------------------------------------------------
            SUB-TAB: REVIEWS
            ------------------------------------------------------------- */}
        <TabsContent value="reviews" className="outline-none space-y-4">
          <div className="card">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Search reviews by comment snippet..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-ek-green/20 focus:border-ek-green transition-all"
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <select
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white cursor-pointer hover:bg-slate-50 text-slate-600 font-medium"
                  value={reviewRating}
                  onChange={(e) => setReviewRating(e.target.value)}
                >
                  <option value="all">Rating: All</option>
                  <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                  <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                  <option value="3">⭐⭐⭐ (3 Stars)</option>
                  <option value="2">⭐⭐ (2 Stars)</option>
                  <option value="1">⭐ (1 Star)</option>
                </select>
                <button className="btn btn-secondary text-xs">📥 Export CSV</button>
              </div>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <DataTable
              columns={reviewColumns}
              data={reviewsData?.reviews || []}
              rowActions={reviewRowActions}
              isLoading={reviewsLoading}
              externalPage={reviewPage}
              externalTotalPages={reviewsData?.meta?.totalPages || 1}
              onPageChange={setReviewPage}
              itemsPerPage={limit}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Render Dialog forms and Side sheets */}
      <AddOutdoorRouteDialog />
      <ViewOutdoorRouteDialog />
      <AddOutdoorEventDialog />
      <ViewOutdoorEventDialog />
      <AddOutdoorReviewDialog />
      <ViewOutdoorReviewDialog />

    </div>
  );
};

export default OutdoorTab;
