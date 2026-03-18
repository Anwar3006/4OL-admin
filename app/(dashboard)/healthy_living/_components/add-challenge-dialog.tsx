"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAddChallengeDialog } from '@/stores/dialog-store';
import { challengeSchema, TChallengeInput } from '@/schemas/challenge.schema';
import { useCreateChallenge, useUpdateChallenge } from '@/hooks/supabase-calls/useChallenge';
import { Loader2, Trophy } from 'lucide-react';
import ImageDropZone from '@/components/ImageDropZone';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AddChallengeDialog = () => {
  const { isOpen, close, data, isEditMode } = useAddChallengeDialog();
  const { mutate: createChallenge, isPending: isCreating } = useCreateChallenge();
  const { mutate: updateChallenge, isPending: isUpdating } = useUpdateChallenge();

  const isPending = isCreating || isUpdating;

  const form = useForm<TChallengeInput>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      name: '',
      period: '',
      type: 'weight_loss',
      description: '',
      image_url: '',
      status: false,
    },
  });

  useEffect(() => {
    if (isOpen && isEditMode && data) {
      form.reset(data);
    } else if (isOpen) {
      form.reset({
        name: '',
        period: '',
        type: 'weight_loss',
        description: '',
        image_url: '',
        status: false,
      });
    }
  }, [isOpen, isEditMode, data, form]);

  const onSubmit = (values: TChallengeInput) => {
    if (isEditMode && data?.id) {
      updateChallenge({ id: data.id, data: values }, {
        onSuccess: () => close(),
      });
    } else {
      createChallenge(values, {
        onSuccess: () => close(),
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className='max-w-2xl overflow-y-auto max-h-[90vh] p-0 border-none shadow-2xl'>
        <div className="bg-white rounded-lg overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              {isEditMode ? 'Edit Challenge' : 'Add New Challenge'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='p-6 space-y-6'>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Challenge Cover Image</FormLabel>
                      <FormControl>
                        <ImageDropZone
                          filePath="challenges"
                          onFilesChange={(urls) => field.onChange(urls[0] || '')}
                          initialFiles={field.value ? [field.value] : []}
                          text="Upload cover image"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name='name'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Challenge Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter challenge name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='period'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Period</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 30 Days" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name='type'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Challenge Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="weight_loss">Weight Loss</SelectItem>
                            <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                            <SelectItem value="endurance">Endurance</SelectItem>
                            <SelectItem value="flexibility">Flexibility</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='status'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={(val) => field.onChange(val === 'active')} value={field.value ? 'active' : 'inactive'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the challenge rules and goals..." 
                          className="min-h-[100px] resize-none"
                          {...field} 
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button type='button' variant='outline' onClick={close}>Cancel</Button>
                <Button type='submit' disabled={isPending} className="min-w-[120px]">
                  {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  {isEditMode ? 'Update Challenge' : 'Add Challenge'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddChallengeDialog;