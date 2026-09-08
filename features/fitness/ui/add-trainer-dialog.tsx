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
import { useAddTrainerDialog } from "@/features/fitness/data/dialog-hooks";
import { trainerSchema, TTrainerInput, TRAINER_STATUS } from "@/features/fitness/schema/trainer";
import { useCreateTrainer, useUpdateTrainer } from "@/features/fitness/data/useTrainer";
import { Loader2, Award, Video, Globe, X, Plus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserSearchSelect } from "@/components/UserSearchSelect";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

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
    social_links: { instagram: '', linkedin: '' },
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
        social_links: {
          instagram: data.social_links?.instagram ?? "",
          linkedin: data.social_links?.linkedin ?? "",
        }
      });
    } else if (isOpen) {
      form.reset(defaultValues);
    }
  }, [isOpen, isEditMode, data]);

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
      <DialogContent className='max-w-3xl overflow-y-auto max-h-[92vh] p-0 border-none shadow-2xl bg-white'>
        <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-gray-50 dark:bg-gray-900">
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
                      <FormLabel>Link User Profile *</FormLabel>
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
                      <FormLabel>Account Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        {/*bg-white and z-50 solves transparent drop downs */}
                        <SelectContent className="bg-white dark:bg-slate-800 z-[100]">
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
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_verified"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white dark:bg-slate-800">
                      <div className="space-y-0.5">
                        <FormLabel>Verified Badge</FormLabel>
                        <FormDescription>Show checkmark on profile</FormDescription>
                      </div>
                      <FormControl>
                        <Button
                          type="button"
                          variant={field.value ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "w-20",
                            field.value
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : ""
                          )}
                          onClick={() => field.onChange(!field.value)}
                        >
                          {field.value ? "Yes" : "No"}
                        </Button>
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

                {/* Social Profiles Linked into Form Context Structure */}
                <div className="space-y-2">
                    <FormLabel>Social Profiles</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="social_links.instagram"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  <Input placeholder="Instagram URL" className="pl-9 h-9 text-xs" {...field} value={field.value ?? ""} />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="social_links.linkedin"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="LinkedIn URL" className="h-9 text-xs" {...field} value={field.value ?? ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                </div>
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