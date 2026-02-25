import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export const useGetDashboardOverviewStats = (timeFilter: string) => {
  return useQuery<any, Error>({
    queryKey: ["dashboard_overview", timeFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_platform_overview_metrics", { time_filter: timeFilter });

      if (error) throw new Error(error.message);
      return data;
    },
  });
};
