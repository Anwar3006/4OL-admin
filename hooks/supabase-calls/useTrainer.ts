import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { TTrainerInput, TTrainerOutput } from '@/schemas/trainer.schema';

export const TRAINER_QUERY_KEYS = {
  all: ['trainers'] as const,
  lists: () => [...TRAINER_QUERY_KEYS.all, 'list'] as const,
  list: (page: number, limit: number, search?: string) => [...TRAINER_QUERY_KEYS.lists(), { page, limit, search }] as const,
  details: () => [...TRAINER_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...TRAINER_QUERY_KEYS.details(), id] as const,
};

export const useTrainers = ({ page, limit, search }: { page: number; limit: number; search?: string }) => {
  return useQuery({
    queryKey: TRAINER_QUERY_KEYS.list(page, limit, search),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      let query = supabase
        .from('trainers')
        .select('*', { count: 'exact' });

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,specialization.ilike.%${search}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw new Error(error.message);
      return {
        trainers: data as TTrainerOutput[],
        meta: { totalPages: Math.ceil((count || 0) / limit), total: count || 0, currentPage: page },
      };
    },
  });
};

export const useTrainer = (id: string | null) => {
  return useQuery({
    queryKey: TRAINER_QUERY_KEYS.detail(id!),
    queryFn: async () => {
      const { data, error } = await supabase.from('trainers').select('*').eq('id', id!).single();
      if (error) throw new Error(error.message);
      return data as TTrainerOutput;
    },
    enabled: !!id,
  });
};

export const useCreateTrainer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TTrainerInput) => {
      const { data: result, error } = await supabase.from('trainers').insert(data).select().single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINER_QUERY_KEYS.all });
      toast.success('Trainer added successfully!');
    },
  });
};
export const useUpdateTrainer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TTrainerInput }) => {
      const { data: result, error } = await supabase.from('trainers').update(data).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINER_QUERY_KEYS.all });
      toast.success('Trainer updated successfully!');
    },
  });
};

export const useDeleteTrainer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trainers').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINER_QUERY_KEYS.all });
      toast.success('Trainer deleted successfully!');
    },
  });
};
