import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { TChallengeInput, TChallengeOutput } from '@/schemas/challenge.schema';

export const CHALLENGE_QUERY_KEYS = {
  all: ['challenges'] as const,
  lists: () => [...CHALLENGE_QUERY_KEYS.all, 'list'] as const,
  list: (page: number, limit: number) => [...CHALLENGE_QUERY_KEYS.lists(), { page, limit }] as const,
  details: () => [...CHALLENGE_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...CHALLENGE_QUERY_KEYS.details(), id] as const,
};

export const useChallenges = ({ page, limit }: { page: number; limit: number }) => {
  return useQuery({
    queryKey: CHALLENGE_QUERY_KEYS.list(page, limit),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, count, error } = await supabase
        .from('challenges')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw new Error(error.message);
      return {
        challenges: data as TChallengeOutput[],
        meta: { totalPages: Math.ceil((count || 0) / limit), total: count || 0, currentPage: page },
      };
    },
  });
};

export const useChallenge = (id: string | null) => {
  return useQuery({
    queryKey: CHALLENGE_QUERY_KEYS.detail(id!),
    queryFn: async () => {
      const { data, error } = await supabase.from('challenges').select('*').eq('id', id!).single();
      if (error) throw new Error(error.message);
      return data as TChallengeOutput;
    },
    enabled: !!id,
  });
};

export const useCreateChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TChallengeInput) => {
      const { data: result, error } = await supabase.from('challenges').insert(data).select().single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_QUERY_KEYS.all });
      toast.success('Challenge created successfully!');
    },
  });
};
export const useUpdateChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TChallengeInput }) => {
      const { data: result, error } = await supabase.from('challenges').update(data).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_QUERY_KEYS.all });
      toast.success('Challenge updated successfully!');
    },
  });
};

export const useDeleteChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('challenges').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_QUERY_KEYS.all });
      toast.success('Challenge deleted successfully!');
    },
  });
};
