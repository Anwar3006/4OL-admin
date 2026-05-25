"use client";

import React, { useEffect, useState } from 'react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAddChallengeDialog } from '@/stores/dialog-store';
import { challengeSchema, TChallengeInput, CHALLENGE_STATUS } from '@/schemas/challenge.schema';
import { useCreateChallenge, useUpdateChallenge } from '@/hooks/supabase-calls/useChallenge';
import { Loader2, Trophy, Calendar, Target, Award, X } from 'lucide-react';
import ImageDropZone from '@/components/ImageDropZone';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

const AddChallengeDialog = () => {
  const { isOpen, close, data, isEditMode } = useAddChallengeDialog();
  const { mutate: createChallenge, isPending: isCreating } = useCreateChallenge();
  const { mutate: updateChallenge, isPending: isUpdating } = useUpdateChallenge();

  const [tagInput, setTagInput] = useState("");

  const isPending = isCreating || isUpdating;

  const defaultValues: TChallengeInput = {
    title: '',
    description: '',
    challenge_type: 'Weight Loss',
    start_date: new Date(),
    end_date: new Date(),
    goal_metric: 'steps',
    goal_value: 10000,
    reward_description: '',
    reward_image_url: '',
    status: 'draft',
    is_public: true,
    max_participants: null,
    featured_image_url: '',
    tags: [],
  };

  const form = useForm<TChallengeInput>({
    resolver: zodResolver(challengeSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen && isEditMode && data) {
      form.reset(data);
    } else if (isOpen) {
      form.reset(defaultValues);
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

  const addTag = () => {
    if (!tagInput.trim()) return;
    const currentTags = form.getValues("tags") || [];
    if (!currentTags.includes(tagInput.trim())) {
      form.setValue("tags", [...currentTags, tagInput.trim()]);
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter(t => t !== tagToRemove));
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className='max-w-3xl overflow-y-auto max-h-[92vh] p-0 border-none shadow-2xl'>
        <div className="bg-white rounded-lg overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-gray-50">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              {isEditMode ? 'Edit Fitness Challenge' : 'Launch New Challenge'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='p-6 space-y-6'>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Images */}
                <FormField
                  control={form.control}
                  name="featured_image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Cover Image</FormLabel>
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

                <FormField
                  control={form.control}
                  name="reward_image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reward Badge/Image</FormLabel>
                      <FormControl>
                        <ImageDropZone
                          filePath="challenges/rewards"
                          onFilesChange={(urls) => field.onChange(urls[0] || '')}
                          initialFiles={field.value ? [field.value] : []}
                          text="Upload reward image"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Title & Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name='title'
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Challenge Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Summer Shred 2026" {...field} />
                      </FormControl>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CHALLENGE_STATUS.map(s => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Type & Goal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField
                  control={form.control}
                  name='challenge_type'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Weight Loss" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='goal_metric'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Metric</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. calories, steps" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='goal_value'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Value</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name='start_date'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='end_date'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description & Rewards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detailed Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Challenge rules and motivation..." 
                          className="min-h-[120px] resize-none"
                          {...field} 
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='reward_description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reward Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What do participants win?" 
                          className="min-h-[120px] resize-none"
                          {...field} 
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="is_public"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Public Challenge</FormLabel>
                        <FormDescription>Visible to all users</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='max_participants'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Participants</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Unlimited" 
                          {...field} 
                          value={field.value ?? ""}
                          onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Tags */}
              <div className="space-y-3">
                <FormLabel>Challenge Tags</FormLabel>
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. nutrition, cardio" 
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.watch("tags")?.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1 pl-2.5">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button type='button' variant='outline' onClick={close}>Cancel</Button>
                <Button type='submit' disabled={isPending} className="min-w-[140px]">
                  {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  {isEditMode ? 'Update Challenge' : 'Start Challenge'}
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
