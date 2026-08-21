"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/Data-Table/data-table";
import KpiCard from "@/components/redesign/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useFitnessOutdoorRoutes,
  useDeleteFitnessOutdoorRoute,
  useFitnessOutdoorEvents,
  useDeleteFitnessOutdoorEvent,
  useFitnessOutdoorReviews,
  useDeleteFitnessOutdoorReview,
  usePendingOutdoorRoutes,
  useOutdoorIncentives,
  useUpdateOutdoorIncentives,
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

import AddOutdoorReviewDialog from "../_components/add-outdoor-review-dialog";
import ViewOutdoorReviewDialog from "../_components/view-outdoor-review-dialog";
import VerifyOutdoorRouteDialog from "../_components/verify-outdoor-route-dialog";
import EventParticipantsDialog from "../_components/event-participants-dialog";
import ChallengesTab from "./ChallengesTab";
import { cn } from "@/lib/utils";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { useHasPermission } from "@/stores/permission-context";
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
  Trophy,
  Coins,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { ViewOutdoorEventDialog } from "../_components/view-outdoor-event-dialog";

const INCENTIVE_FIELDS = [
  { key: "base_fitcoins", label: "Base Reward (per verified route)" },
  { key: "per_km_fitcoins", label: "Per-Kilometre Bonus" },
  { key: "verification_bonus", label: "Verification Bonus" },
  { key: "event_bonus", label: "Event Attendance Bonus" },
] as const;

const OutdoorTab = () => {
  const [activeSubTab, setActiveSubTab] = useState("routes");
  const searchParams = useSearchParams();
  const router = useRouter();
  const canEditFitness = useHasPermission("fitness.edit");

  // Phase 5 (Gap Analysis Part F): verify queue + participants modal targets
  const [verifyTarget, setVerifyTarget] = useState<any | null>(null);
  const [participantsEvent, setParticipantsEvent] = useState<any | null>(null);

  // Search & Pagination States
  const [routeSearch, setRouteSearch] = useState("");
  const [routeDifficulty, setRouteDifficulty] = useState("all");
  const debouncedRouteSearch = useDebounce(routeSearch, 500);

  const [eventSearch, setEventSearch] = useState("");
  const [eventStatus, setEventStatus] = useState("all");
  const debouncedEventSearch = useDebounce(eventSearch, 500);

  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewRating, setReviewRating] = useState("all");
  const debouncedReviewSearch = useDebounce(reviewSearch, 500);

  const limit = 10;

  // Read pages from URL to trigger refetch when pagination changes
  const routePage = parseInt(searchParams.get("out_route_page") || "1", 10);
  const eventPage = parseInt(searchParams.get("out_event_page") || "1", 10);
  const reviewPage = parseInt(searchParams.get("out_review_page") || "1", 10);

  // Dialog Stores
  const addRouteDialog = useAddOutdoorRouteDialog();
  const viewRouteDialog = useViewOutdoorRouteDialog();
  const addEventDialog = useAddOutdoorEventDialog();
  const viewEventDialog = useViewOutdoorEventDialog();
  const addReviewDialog = useAddOutdoorReviewDialog();
  const viewReviewDialog = useViewOutdoorReviewDialog();

  // Deep link from the Map page: /fitness?tab=outdoor&route=<id>
  useEffect(() => {
    const routeParam = searchParams.get("route");
    if (routeParam) {
      viewRouteDialog.open(routeParam);
      router.replace("/fitness?tab=outdoor", { scroll: false });
    }
  }, [searchParams, viewRouteDialog, router]);

  // Pending delete confirmation (only one of route/event/review at a time)
  const [confirmDelete, setConfirmDelete] = useState<
    { type: "route" | "event" | "review"; id: string } | null
  >(null);

  // Queries
  const {
    data: routesData,
    isLoading: routesLoading,
    isError: routesError,
    error: routesErrorObj,
  } = useFitnessOutdoorRoutes({
      page: routePage,
      limit,
      search: debouncedRouteSearch,
      difficulty: routeDifficulty,
    });

  const {
    data: eventsData,
    isLoading: eventsLoading,
    isError: eventsError,
    error: eventsErrorObj,
  } = useFitnessOutdoorEvents({
      page: eventPage,
      limit,
      search: debouncedEventSearch,
      status: eventStatus,
    });

  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    isError: reviewsError,
    error: reviewsErrorObj,
  } = useFitnessOutdoorReviews({
      page: reviewPage,
      limit,
      search: debouncedReviewSearch,
      rating: reviewRating,
    });

  // Pending verification queue + incentive config (Gap Analysis Part F)
  const { data: pendingRoutes } = usePendingOutdoorRoutes();
  const { data: incentives } = useOutdoorIncentives();
  const updateIncentives = useUpdateOutdoorIncentives();
  const [incentiveForm, setIncentiveForm] = useState<Record<string, number>>({
    base_fitcoins: 50,
    per_km_fitcoins: 10,
    verification_bonus: 25,
    event_bonus: 20,
  });

  useEffect(() => {
    if (incentives) {
      setIncentiveForm({
        base_fitcoins: incentives.base_fitcoins ?? 50,
        per_km_fitcoins: incentives.per_km_fitcoins ?? 10,
        verification_bonus: incentives.verification_bonus ?? 25,
        event_bonus: incentives.event_bonus ?? 20,
      });
    }
  }, [incentives]);

  // Mutations
  const { mutate: deleteRoute } = useDeleteFitnessOutdoorRoute();
  const { mutate: deleteEvent } = useDeleteFitnessOutdoorEvent();
  const { mutate: deleteReview } = useDeleteFitnessOutdoorReview();

  // Handlers
  const handleDeleteRoute = useCallback((id: string) => {
    setConfirmDelete({ type: "route", id });
  }, []);

  const handleDeleteEvent = useCallback((id: string) => {
    setConfirmDelete({ type: "event", id });
  }, []);

  const handleDeleteReview = useCallback((id: string) => {
    setConfirmDelete({ type: "review", id });
  }, []);

  const confirmDeleteAction = useCallback(() => {
    if (!confirmDelete) return;
    if (confirmDelete.type === "route") deleteRoute(confirmDelete.id);
    else if (confirmDelete.type === "event") deleteEvent(confirmDelete.id);
    else if (confirmDelete.type === "review") deleteReview(confirmDelete.id);
    setConfirmDelete(null);
  }, [confirmDelete, deleteRoute, deleteEvent, deleteReview]);

  const deleteConfirmCopy: Record<string, { title: string; itemType: string }> = {
    route: {
      title: "Delete Route",
      itemType: "route (this will also cascade delete related events and reviews)",
    },
    event: { title: "Delete Event", itemType: "event" },
    review: { title: "Delete Review", itemType: "review" },
  };

  // Dynamic KPI counts (using metadata from queries or fallback)
  const totalRoutes = routesData?.meta?.total ?? 0;
  const totalEvents = eventsData?.meta?.total ?? 0;
  const totalReviews = reviewsData?.meta?.total ?? 0;

  // Render Star Utility
  const renderStars = useCallback((rating: number) => {
    return (
      <div className="text-ek-gold text-[10px] flex gap-0.5">
        {"⭐".repeat(rating || 5)}
        <span className="text-slate-200">{"⭐".repeat(5 - (rating || 5))}</span>
      </div>
    );
  }, []);

  // -------------------------------------------------------------
  // TABLE COLUMNS CONFIGURATIONS
  // -------------------------------------------------------------
  const routeColumns = useMemo(
    () => [
    {
      accessorKey: "name",
      header: "Route Details",
      cell: ({ row }: any) => (
        <div className="flex flex-col min-w-[200px]">
          <span
            className="font-bold text-slate-800 text-sm hover:underline cursor-pointer"
            onClick={() => viewRouteDialog.open(row.original.id)}
          >
            {row.original.name}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            {row.original.category || "General Trail"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "difficulty",
      header: "Difficulty",
      cell: ({ row }: any) => {
        const colors: Record<string, string> = {
          low: "badge-green",
          medium: "badge-blue",
          high: "badge-amber",
          critical: "badge-red",
          info: "bg-slate-100 text-slate-600",
        };
        return (
          <span
            className={cn(
              "badge uppercase tracking-wider text-[9px] font-black",
              colors[row.original.difficulty] || "badge-blue",
            )}
          >
            {row.original.difficulty}
          </span>
        );
      },
    },
    {
      accessorKey: "distance_duration",
      header: "Distance / Est. Time",
      cell: ({ row }: any) => (
        <div className="space-y-0.5 text-[11px] font-semibold text-slate-600">
          <div className="flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {row.original.distance_km ? `${row.original.distance_km} km` : "—"}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {row.original.estimated_duration_mins
              ? `${row.original.estimated_duration_mins} mins`
              : "—"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "surface_type",
      header: "Surface",
      cell: ({ row }: any) => (
        <span className="text-[11px] font-medium text-slate-600">
          {row.original.surface_type || "Natural"}
        </span>
      ),
    },
    {
      accessorKey: "verification_status",
      header: "Status",
      cell: ({ row }: any) => (
        <span
          className={cn(
            "badge uppercase tracking-wider text-[9px] font-black",
            row.original.verification_status === "approved"
              ? "badge-green"
              : row.original.verification_status === "rejected"
                ? "badge-red"
                : "badge-amber",
          )}
        >
          {row.original.verification_status.replace("_", " ")}
        </span>
      ),
    },
    {
      accessorKey: "creator",
      header: "Creator",
      cell: ({ row }: any) => (
        <span className="text-xs font-semibold text-slate-600">
          {row.original.creator
            ? `${row.original.creator.first_name || ""} ${row.original.creator.last_name || ""}`.trim()
            : "System"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => {
        const route = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                viewRouteDialog.open(route.id);
              }}
            >
              👁️
            </button>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="View on Map"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/map?tab=map-view&route=${route.id}`);
              }}
            >
              🗺️
            </button>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                addRouteDialog.open(route);
              }}
            >
              ✏️
            </button>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteRoute(route.id);
              }}
            >
              🗑️
            </button>
          </div>
        );
      },
    },
    ],
    [addRouteDialog, handleDeleteRoute, router, viewRouteDialog],
  );

  const eventColumns = useMemo(
    () => [
    {
      accessorKey: "title",
      header: "Event Details",
      cell: ({ row }: any) => (
        <div className="flex flex-col min-w-[200px]">
          <span
            className="font-bold text-slate-800 text-sm hover:underline cursor-pointer"
            onClick={() => viewEventDialog.open(row.original.id)}
          >
            {row.original.title}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            {row.original.category || "Fitness Event"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "route",
      header: "Linked Route",
      cell: ({ row }: any) => (
        <span className="text-xs font-bold text-slate-700">
          {row.original.route ? (
            row.original.route.name
          ) : (
            <span className="text-slate-300 italic">—</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: "start_at",
      header: "Starts At",
      cell: ({ row }: any) => (
        <span className="text-[11px] font-semibold text-slate-600">
          {row.original.start_at
            ? new Date(row.original.start_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </span>
      ),
    },
    {
      accessorKey: "participants",
      header: "Participants",
      cell: ({ row }: any) => (
        <span className="text-xs font-bold text-slate-700">
          {row.original.current_participants} /{" "}
          {row.original.max_participants || "∞"}
        </span>
      ),
    },
    {
      accessorKey: "area",
      header: "Area",
      cell: ({ row }: any) => (
        <span className="text-xs text-slate-600 font-medium capitalize">
          {row.original.area || "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <span
          className={cn(
            "badge uppercase tracking-wider text-[9px] font-black",
            row.original.status === "active"
              ? "badge-green"
              : row.original.status === "upcoming"
                ? "badge-blue"
                : row.original.status === "completed"
                  ? "badge-purple"
                  : "bg-slate-400 text-white",
          )}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => {
        const event = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                viewEventDialog.open(event.id);
              }}
            >
              👁️
            </button>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="View Participants"
              onClick={(e) => {
                e.stopPropagation();
                setParticipantsEvent(event);
              }}
            >
              👥
            </button>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                addEventDialog.open(event);
              }}
            >
              ✏️
            </button>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteEvent(event.id);
              }}
            >
              🗑️
            </button>
          </div>
        );
      },
    },
    ],
    [addEventDialog, handleDeleteEvent, viewEventDialog],
  );

  const reviewColumns = useMemo(
    () => [
    {
      accessorKey: "route",
      header: "Route Details",
      cell: ({ row }: any) => (
        <span className="text-xs font-bold text-slate-700">
          {row.original.route ? (
            row.original.route.name
          ) : (
            <span className="text-slate-300 italic">—</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }: any) => (
        <span className="text-xs font-semibold text-slate-600">
          {row.original.user
            ? `${row.original.user.first_name || ""} ${row.original.user.last_name || ""}`.trim()
            : "Anonymous"}
        </span>
      ),
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }: any) => renderStars(row.original.rating),
    },
    {
      accessorKey: "comment",
      header: "Review Snippet",
      cell: ({ row }: any) => (
        <div
          className="max-w-[240px] truncate text-xs text-slate-500 font-medium hover:underline cursor-pointer"
          onClick={() => viewReviewDialog.open(row.original.id)}
        >
          {row.original.comment || (
            <span className="text-slate-300 italic">No text comment</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "moderation_status",
      header: "Moderation",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "badge uppercase tracking-wider text-[9px] font-black",
              row.original.moderation_status === "approved"
                ? "badge-green"
                : row.original.moderation_status === "pending_review"
                  ? "badge-amber"
                  : "badge-red",
            )}
          >
            {row.original.moderation_status.replace("_", " ")}
          </span>
          {row.original.is_flagged && (
            <span className="badge badge-red uppercase text-[8px] tracking-wide font-black px-1.5 h-4 flex items-center justify-center gap-0.5">
              <ShieldAlert className="w-2.5 h-2.5 text-white shrink-0" />{" "}
              FLAGGED
            </span>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => {
        const review = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                viewReviewDialog.open(review.id);
              }}
            >
              👁️
            </button>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                addReviewDialog.open(review);
              }}
            >
              ✏️
            </button>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteReview(review.id);
              }}
            >
              🗑️
            </button>
          </div>
        );
      },
    },
    ],
    [addReviewDialog, handleDeleteReview, renderStars, viewReviewDialog],
  );

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

      <Tabs
        defaultValue="routes"
        className="w-full min-w-0"
        onValueChange={setActiveSubTab}
      >
        {/* Sub-tabs header navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6 flex-wrap gap-4">
          <TabsList className="bg-slate-100/50 p-1 flex gap-1 rounded-xl">
            <TabsTrigger
              value="routes"
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all border border-transparent cursor-pointer",
                "data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:border-slate-200/60 data-[state=active]:shadow-sm",
              )}
            >
              <MapPin className="w-3.5 h-3.5 mr-1.5 inline-block shrink-0" />
              Routes
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all border border-transparent cursor-pointer",
                "data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:border-slate-200/60 data-[state=active]:shadow-sm",
              )}
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5 inline-block shrink-0" />
              Events
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all border border-transparent cursor-pointer",
                "data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:border-slate-200/60 data-[state=active]:shadow-sm",
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5 inline-block shrink-0" />
              Reviews
            </TabsTrigger>
            <TabsTrigger
              value="challenges"
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all border border-transparent cursor-pointer",
                "data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:border-slate-200/60 data-[state=active]:shadow-sm",
              )}
            >
              <Trophy className="w-3.5 h-3.5 mr-1.5 inline-block shrink-0" />
              Challenges
            </TabsTrigger>
            <TabsTrigger
              value="incentives"
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all border border-transparent cursor-pointer",
                "data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:border-slate-200/60 data-[state=active]:shadow-sm",
              )}
            >
              <Coins className="w-3.5 h-3.5 mr-1.5 inline-block shrink-0" />
              Incentives
            </TabsTrigger>
          </TabsList>

          {/* Dynamic addition trigger button */}
          <div>
            {activeSubTab === "routes" && (
              <button
                className="btn btn-primary text-white flex items-center gap-1 text-xs"
                onClick={() => addRouteDialog.open()}
              >
                <Plus className="h-4 w-4" /> Create Route
              </button>
            )}
            {activeSubTab === "events" && (
              <button
                className="btn btn-primary text-white flex items-center gap-1 text-xs"
                onClick={() => addEventDialog.open()}
              >
                <Plus className="h-4 w-4" /> Create Event
              </button>
            )}
            {activeSubTab === "reviews" && (
              <button
                className="btn btn-primary text-white flex items-center gap-1 text-xs"
                onClick={() => addReviewDialog.open()}
              >
                <Plus className="h-4 w-4" /> Post Review
              </button>
            )}
          </div>
        </div>

        {/* -------------------------------------------------------------
            SUB-TAB: ROUTES
            ------------------------------------------------------------- */}
        <TabsContent value="routes" className="outline-none space-y-4 w-full min-w-0">
          {/* Pending Verification Queue (Gap Analysis Part F, m-verify-route) */}
          {pendingRoutes && pendingRoutes.length > 0 && (
            <div className="card border-amber-200/70 bg-amber-50/40">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-black text-slate-800">
                    Pending Verification Queue
                  </h3>
                  <span className="badge badge-amber">{pendingRoutes.length}</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Community-submitted routes waiting for GPS review
                </p>
              </div>
              <div className="space-y-2">
                {pendingRoutes.map((pr: any) => {
                  const hasGps =
                    Array.isArray(pr.gps_data?.points) &&
                    pr.gps_data.points.length > 0;
                  return (
                    <div
                      key={pr.id}
                      className="flex items-center justify-between gap-3 bg-white border border-slate-100 rounded-xl px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {pr.name}
                        </div>
                        <div className="text-[10px] text-slate-500 capitalize truncate">
                          {pr.area}
                          {pr.region ? `, ${pr.region}` : ""} · {pr.difficulty}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "badge text-[8px] font-black uppercase",
                            hasGps ? "badge-green" : "badge-amber",
                          )}
                        >
                          {hasGps ? "✅ GPS" : "⚠️ No GPS"}
                        </span>
                        {canEditFitness && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setVerifyTarget(pr)}
                          >
                            🛡️ Verify
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                <button className="btn btn-secondary text-xs">
                  📥 Export CSV
                </button>
              </div>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <DataTable
              columns={routeColumns}
              data={routesData?.routes || []}
              isLoading={routesLoading}
              isError={routesError}
              error={routesErrorObj}
              pagination={true}
              urlPersistence={{
                pageKey: "out_route_page",
                pageSizeKey: "out_route_pageSize",
              }}
              totalItems={routesData?.meta?.total || 0}
            />
          </div>
        </TabsContent>

        {/* -------------------------------------------------------------
            SUB-TAB: EVENTS
            ------------------------------------------------------------- */}
        <TabsContent value="events" className="outline-none space-y-4 w-full min-w-0">
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
                <button className="btn btn-secondary text-xs">
                  📥 Export CSV
                </button>
              </div>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <DataTable
              columns={eventColumns}
              data={eventsData?.events || []}
              isLoading={eventsLoading}
              isError={eventsError}
              error={eventsErrorObj}
              pagination={true}
              urlPersistence={{
                pageKey: "out_event_page",
                pageSizeKey: "out_event_pageSize",
              }}
              totalItems={eventsData?.meta?.total || 0}
            />
          </div>
        </TabsContent>

        {/* -------------------------------------------------------------
            SUB-TAB: REVIEWS
            ------------------------------------------------------------- */}
        <TabsContent value="reviews" className="outline-none space-y-4 w-full min-w-0">
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
                <button className="btn btn-secondary text-xs">
                  📥 Export CSV
                </button>
              </div>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <DataTable
              columns={reviewColumns}
              data={reviewsData?.reviews || []}
              isLoading={reviewsLoading}
              isError={reviewsError}
              error={reviewsErrorObj}
              pagination={true}
              urlPersistence={{
                pageKey: "out_review_page",
                pageSizeKey: "out_review_pageSize",
              }}
              totalItems={reviewsData?.meta?.total || 0}
            />
          </div>
        </TabsContent>

        {/* -------------------------------------------------------------
            SUB-TAB: CHALLENGES (reused top-level module)
            ------------------------------------------------------------- */}
        <TabsContent value="challenges" className="outline-none space-y-4 w-full min-w-0">
          <ChallengesTab />
        </TabsContent>

        {/* -------------------------------------------------------------
            SUB-TAB: INCENTIVES (m-route-incentives)
            ------------------------------------------------------------- */}
        <TabsContent value="incentives" className="outline-none space-y-4 w-full min-w-0">
          <div className="card max-w-2xl">
            <h3 className="text-sm font-black text-slate-800 mb-1">
              🪙 FitCoins Route Incentives
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Global reward formula applied when outdoor routes are verified
              and events are attended. Changes take effect immediately for the
              mobile app.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {INCENTIVE_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {field.label}
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    value={incentiveForm[field.key]}
                    disabled={!canEditFitness}
                    onChange={(e) =>
                      setIncentiveForm((prev) => ({
                        ...prev,
                        [field.key]: parseInt(e.target.value || "0", 10),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            {canEditFitness && (
              <button
                className="btn btn-primary mt-5"
                disabled={updateIncentives.isPending}
                onClick={() =>
                  updateIncentives.mutate({
                    baseFitcoins: incentiveForm.base_fitcoins,
                    perKmFitcoins: incentiveForm.per_km_fitcoins,
                    verificationBonus: incentiveForm.verification_bonus,
                    eventBonus: incentiveForm.event_bonus,
                  })
                }
              >
                {updateIncentives.isPending ? "Saving…" : "💾 Save Incentive Formula"}
              </button>
            )}
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

      <VerifyOutdoorRouteDialog
        route={verifyTarget}
        onClose={() => setVerifyTarget(null)}
      />
      <EventParticipantsDialog
        event={participantsEvent}
        onClose={() => setParticipantsEvent(null)}
      />

      <DeleteConfirmationModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteAction}
        title={confirmDelete ? deleteConfirmCopy[confirmDelete.type].title : ""}
        itemName=""
        itemType={confirmDelete ? deleteConfirmCopy[confirmDelete.type].itemType : "item"}
      />
    </div>
  );
};

export default OutdoorTab;
