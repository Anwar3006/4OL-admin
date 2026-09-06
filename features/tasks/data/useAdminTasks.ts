import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface AdminTask {
  id: string;
  title: string;
  description: string | null;
  status: "new" | "in_progress" | "under_review" | "completed";
  priority: "low" | "medium" | "high" | "critical";
  category: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  boardPosition: number;
  taskSeq: number | null;
  progressPercent: number;
  completedAt: string | null;
  createdAt: string;
}

export interface AdminTaskStats {
  new: number;
  in_progress: number;
  under_review: number;
  completed: number;
}

const TASKS_KEY = ["admin-tasks"] as const;
const STATS_KEY = ["admin-task-stats"] as const;

export const useAdminTaskStats = () => {
  return useQuery<AdminTaskStats, Error>({
    queryKey: STATS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/admin/tasks/stats", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load task stats.");
      return res.json();
    },
  });
};

export const useAdminTasks = () => {
  return useQuery<{ tasks: AdminTask[] }, Error>({
    queryKey: TASKS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/admin/tasks", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load tasks.");
      return res.json();
    },
  });
};

interface CreateTaskInput {
  title: string;
  description?: string;
  status: AdminTask["status"];
  priority: AdminTask["priority"];
  category?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  progressPercent?: number;
}

export const useCreateAdminTask = () => {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, Error, CreateTaskInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to create task.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
      toast.success("Task created");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useMoveAdminTask = () => {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    { id: string; status: AdminTask["status"]; boardPosition: number }
  >({
    mutationFn: async ({ id, status, boardPosition }) => {
      const res = await fetch(`/api/admin/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, boardPosition }),
      });
      if (!res.ok) throw new Error("Failed to move task.");
    },
    onMutate: async ({ id, status, boardPosition }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_KEY });
      const previous = queryClient.getQueryData<{ tasks: AdminTask[] }>(TASKS_KEY);
      if (previous) {
        queryClient.setQueryData(TASKS_KEY, {
          tasks: previous.tasks.map((t) =>
            t.id === id ? { ...t, status, boardPosition } : t,
          ),
        });
      }
      return { previous };
    },
    onError: (error, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(TASKS_KEY, context.previous);
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
    },
  });
};

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: AdminTask["status"];
  priority?: AdminTask["priority"];
  category?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  progressPercent?: number;
}

export const useUpdateAdminTask = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string } & UpdateTaskInput>({
    mutationFn: async ({ id, ...fields }) => {
      const res = await fetch(`/api/admin/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to update task.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
      toast.success("Task updated");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useDeleteAdminTask = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const res = await fetch(`/api/admin/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to delete task.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
      toast.success("Task deleted");
    },
    onError: (error) => toast.error(error.message),
  });
};
