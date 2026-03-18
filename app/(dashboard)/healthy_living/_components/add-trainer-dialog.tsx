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
import { useAddTrainerDialog } from '@/stores/dialog-store';
import { trainerSchema, TTrainerInput } from '@/schemas/trainer.schema';
import { useCreateTrainer, useUpdateTrainer } from '@/hooks/supabase-calls/useTrainer';
import { MultiSelect } from '@/components/MultiSelect';
import { FACILITY_REQUIREMENTS } from '@/types/formInput';
import { Loader2, User } from 'lucide-react';
import ImageDropZone from '@/components/ImageDropZone';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AddTrainerDialog = () => {
  const { isOpen, close, data, isEditMode } = useAddTrainerDialog();
  const { mutate: createTrainer, isPending: isCreating } = useCreateTrainer();
  const { mutate: updateTrainer, isPending: isUpdating } = useUpdateTrainer();

  const isPending = isCreating || isUpdating;

  const form = useForm<TTrainerInput>({
    resolver: zodResolver(trainerSchema),
    defaultValues: {
      name: '',
      phone: '',
      whatsapp: '',
      email: '',
      specialization: '',
      services: [],
      image_url: '',
      status: 'pending',
    },
  });

  useEffect(() => {
    if (isOpen && isEditMode && data) {
      form.reset(data);
    } else if (isOpen) {
      form.reset({
        name: '',
        phone: '',
        whatsapp: '',
        email: '',
        specialization: '',
        services: [],
        image_url: '',
        status: 'pending',
      });
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

  const trainerServices = FACILITY_REQUIREMENTS.personal_trainer.services.map(s => ({ value: s, label: s }));

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className='max-w-3xl overflow-y-auto max-h-[90vh] p-0 border-none shadow-2xl'>
        <div className="bg-white rounded-lg overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              {isEditMode ? 'Edit Trainer' : 'Add New Trainer'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='p-6 space-y-6'>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Profile & Info */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="image_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Image</FormLabel>
                        <FormControl>
                          <ImageDropZone
                            filePath="trainers"
                            onFilesChange={(urls) => field.onChange(urls[0] || '')}
                            initialFiles={field.value ? [field.value] : []}
                            text="Upload photo"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='name'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter trainer's name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
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
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='specialization'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specialization</FormLabel>
                          <FormControl>
                            <Input placeholder='e.g. Body Building' {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Right Column: Contacts & Services */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name='email'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="trainer@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name='phone'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+123..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                      <FormField
                        control={form.control}
                        name='whatsapp'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WhatsApp (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="+123..." 
                                {...Object.fromEntries(Object.entries(field).filter(([k]) => k !== 'value'))} 
                                value={field.value ?? ""} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>

                  <FormField
                    control={form.control}
                    name='services'
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <MultiSelect
                            label="Offered Services"
                            name="services"
                            options={FACILITY_REQUIREMENTS.personal_trainer.services}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder='Select services'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button type='button' variant='outline' onClick={close}>Cancel</Button>
                <Button type='submit' disabled={isPending} className="min-w-[120px]">
                  {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  {isEditMode ? 'Update Trainer' : 'Add Trainer'}
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