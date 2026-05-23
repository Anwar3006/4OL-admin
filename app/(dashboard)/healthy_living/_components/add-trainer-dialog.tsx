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
import { useAddTrainerDialog } from '@/stores/dialog-store';
import { trainerSchema, TTrainerInput, TRAINER_STATUS } from '@/schemas/trainer.schema';
import { useCreateTrainer, useUpdateTrainer } from '@/hooks/supabase-calls/useTrainer';
import { Loader2, User, Award, Video, Globe, X, Plus } from 'lucide-react';
import ImageDropZone from '@/components/ImageDropZone';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserSearchSelect } from './user-search-select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const AddTrainerDialog = () => {
  const { isOpen, close, data, isEditMode } = useAddTrainerDialog();
  const { mutate: createTrainer, isPending: isCreating } = useCreateTrainer();
  const { mutate: updateTrainer, isPending: isUpdating } = useUpdateTrainer();

  const [specInput, setSpecInput] = useState("");
  const [certInput, setCertInput] = useState("");

  const isPending = isCreating || isUpdating;

  const defaultValues: TTrainerInput = {
    user_id: '',
    bio: '',
    certifications: [],
    specialties: [],
    years_experience: 0,
    is_verified: false,
    status: 'pending',
    profile_video_url: '',
    social_links: {},
    availability_schedule: {},
  };

  const form = useForm<TTrainerInput>({
    resolver: zodResolver(trainerSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen && isEditMode && data) {
      form.reset({
        ...data,
        profile_video_url: data.profile_video_url ?? "",
        bio: data.bio ?? "",
      });
    } else if (isOpen) {
      form.reset(defaultValues);
    }
  }, [isOpen, isEditMode, data, form]);

  const onSubmit = (values: TTrainerInput) => {
    if (isEditMode && data?.id) {
      updateTrainer({ id: data.id, data: values }, {
        onSuccess: () => close(),
      });
    } else {
      createTrainer(values, {
        onSuccess: () => close(),
      });
    }
  };

  const addListValue = (key: 'specialties' | 'certifications', value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    const current = form.getValues(key) || [];
    if (!current.includes(value.trim())) {
      form.setValue(key, [...current, value.trim()]);
    }
    setter("");
  };

  const removeListValue = (key: 'specialties' | 'certifications', valueToRemove: string) => {
    const current = form.getValues(key) || [];
    form.setValue(key, current.filter(v => v !== valueToRemove));
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className='max-w-3xl overflow-y-auto max-h-[92vh] p-0 border-none shadow-2xl'>
        <div className="bg-white rounded-lg overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-gray-50">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              {isEditMode ? 'Edit Trainer Profile' : 'Onboard New Trainer'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='p-6 space-y-6'>
              
              {/* User Selection & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name='user_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link User Profile</FormLabel>
                      <FormControl>
                        <UserSearchSelect 
                          value={field.value} 
                          onValueChange={field.onChange} 
                        />
                      </FormControl>
                      <FormDescription>Select the app user to promote to trainer</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='status'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TRAINER_STATUS.map(s => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name='years_experience'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years of Experience</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_verified"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-6">
                      <div className="space-y-0.5">
                        <FormLabel>Verified Badge</FormLabel>
                        <FormDescription>Show checkmark on profile</FormDescription>
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
              </div>

              {/* Bio */}
              <FormField
                control={form.control}
                name='bio'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professional Bio</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe background, philosophy and expertise..." 
                        className="resize-none h-24"
                        {...field} 
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Specialties & Certifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Specialties */}
                <div className="space-y-3">
                    <FormLabel>Specialties</FormLabel>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="e.g. HIIT, Yoga" 
                            value={specInput}
                            onChange={e => setSpecInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addListValue('specialties', specInput, setSpecInput))}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => addListValue('specialties', specInput, setSpecInput)}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {form.watch("specialties")?.map(v => (
                            <Badge key={v} variant="secondary" className="gap-1 pl-2.5">
                                {v}
                                <button type="button" onClick={() => removeListValue('specialties', v)}><X className="h-3 w-3" /></button>
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Certifications */}
                <div className="space-y-3">
                    <FormLabel>Certifications</FormLabel>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="e.g. NASM CPT" 
                            value={certInput}
                            onChange={e => setCertInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addListValue('certifications', certInput, setCertInput))}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => addListValue('certifications', certInput, setCertInput)}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {form.watch("certifications")?.map(v => (
                            <Badge key={v} variant="secondary" className="gap-1 pl-2.5">
                                {v}
                                <button type="button" onClick={() => removeListValue('certifications', v)}><X className="h-3 w-3" /></button>
                            </Badge>
                        ))}
                    </div>
                </div>
              </div>

              {/* Media & Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name='profile_video_url'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intro Video URL</FormLabel>
                      <FormControl>
                        <div className="relative">
                            <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="YouTube or Vimeo link" className="pl-9" {...field} value={field.value ?? ""} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                    <FormLabel>Social Profiles</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="Instagram" className="pl-9 h-9 text-xs" />
                        </div>
                        <Input placeholder="LinkedIn" className="h-9 text-xs" />
                    </div>
                </FormItem>
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button type='button' variant='outline' onClick={close}>Cancel</Button>
                <Button type='submit' disabled={isPending} className="min-w-[140px]">
                  {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  {isEditMode ? 'Update Profile' : 'Approve Trainer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTrainerDialog;
