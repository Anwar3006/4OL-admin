"use client";

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useViewTrainerDialog, useAddTrainerDialog } from "@/features/fitness/data/dialog-hooks";
import { useTrainer } from "@/features/fitness/data/useTrainer";
import { Phone, Mail, MessageSquare, Award, CheckCircle, User, Activity } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const ViewTrainerDialog = () => {
  const { isOpen, close, entityId } = useViewTrainerDialog();
  const { open: openAdd } = useAddTrainerDialog();
  const { data, isLoading } = useTrainer(entityId!) ;

  const statusColors = {
    active: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200",
    pending: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200",
    inactive: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  };

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className='w-full sm:max-w-xl overflow-y-auto'>
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">Loading trainer profile...</div>
        ) : !data ? (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">Trainer not found</div>
        ) : (
          <div className='space-y-8 py-4'>
            <SheetHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                  <AvatarImage src={(data as any).image_url || ''} className="object-cover" />
                  <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-2xl font-bold text-slate-400">
                    <User className="h-10 w-10" />
                  </AvatarFallback>
                </Avatar>
                <Badge className={`${statusColors[(data as any).status as keyof typeof statusColors]} capitalize px-3 py-1`}>
                  {data.status}
                </Badge>
              </div>
              <SheetTitle className='text-3xl font-extrabold text-slate-900 leading-tight'>
                {(data as any).name}
              </SheetTitle>
            </SheetHeader>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:bg-slate-100'>
                <div className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                  <Phone className='h-5 w-5 text-primary' />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Phone</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{(data as any).phone}</span>
                </div>
              </div>

              <div className='flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:bg-slate-100'>
                <div className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                  <Mail className='h-5 w-5 text-primary' />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Email</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{(data as any).email}</span>
                </div>
              </div>

              {(data as any).whatsapp && (
                <div className='flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:bg-slate-100'>
                  <div className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                    <MessageSquare className='h-5 w-5 text-emerald-500' />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">WhatsApp</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{(data as any).whatsapp}</span>
                  </div>
                </div>
              )}

              <div className='flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:bg-slate-100'>
                <div className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                  <Activity className='h-5 w-5 text-amber-500' />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Specialization</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{(data as any).specialization}</span>
                </div>
              </div>
            </div>

            <div className='space-y-4'>
              <h4 className='text-sm font-bold text-slate-900 flex items-center gap-2'>
                <CheckCircle className='h-4 w-4 text-primary' /> 
                Offered Services
              </h4>
              <div className='flex flex-wrap gap-2'>
                {(data as any).services.map((s: string, i: number) => (
                  <Badge key={i} variant='secondary' className="bg-white dark:bg-slate-800 border text-xs font-medium px-3 py-1">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <Button className='w-full h-12 text-lg font-bold shadow-md hover:shadow-lg transition-all' onClick={() => openAdd(data)}>
              Edit Trainer Profile
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ViewTrainerDialog;