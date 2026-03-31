"use client";

import { ColumnDef } from '@tanstack/react-table';
import { TTrainerOutput } from '@/schemas/trainer.schema';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { FileText, Edit, Trash2 } from 'lucide-react';
import { useAddTrainerDialog, useViewTrainerDialog } from '@/stores/dialog-store';
import { Button } from '@/components/ui/button';

export const trainerColumns: ColumnDef<TTrainerOutput>[] = [
  {
    accessorKey: 'name',
    header: () => <div className="font-semibold">Trainer Name</div>,
    cell: ({ row }) => <div className="font-medium text-sm">{row.original.name}</div>,
  },
  {
    accessorKey: 'phone',
    header: () => <div className="font-semibold">Contacts</div>,
    cell: ({ row }) => (
      <div className='flex flex-col text-xs space-y-0.5'>
        <span className="font-semibold text-slate-700">{row.original.phone}</span>
        {row.original.whatsapp && <span className="text-muted-foreground">{row.original.whatsapp}</span>}
        <span className="text-muted-foreground">{row.original.email}</span>
      </div>
    ),
  },
  {
    accessorKey: 'specialization',
    header: () => <div className="font-semibold">Specialization</div>,
    cell: ({ row }) => <div className="text-sm">{row.original.specialization}</div>,
  },
  {
    accessorKey: 'services',
    header: () => <div className="font-semibold">Services</div>,
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        {row.original.services.map((service, index) => (
          <span key={index} className="text-xs text-muted-foreground">• {service}</span>
        ))}
      </div>
    ),
  },
  {
    accessorKey: 'created_at',
    header: () => <div className="font-semibold">Registration Date</div>,
    cell: ({ row }) => <div className="text-sm">{format(new Date(row.original.created_at), 'dd/MM/yyyy')}</div>,
  },
  {
    accessorKey: 'last_activity',
    header: () => <div className="font-semibold">Activity Date</div>,
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.last_activity ? format(new Date(row.original.last_activity), 'dd/MM/yyyy - HH:mm') : 'N/A'}
      </div>
    ),
  },
  {
    id: 'actions',
    header: () => <div className="font-semibold">Action</div>,
    cell: ({ row }) => {
      const { open: openView } = useViewTrainerDialog();
      const { open: openEdit } = useAddTrainerDialog();
      
      return (
        <div className='flex items-center gap-2'>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
            onClick={(e) => {
              e.stopPropagation();
              openView(row.original.id);
            }}
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row.original);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              // handle delete
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];