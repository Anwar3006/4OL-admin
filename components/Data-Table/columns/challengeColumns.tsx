"use client";

import { ColumnDef } from '@tanstack/react-table';
import { TChallengeOutput } from '@/schemas/challenge.schema';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Eye, Pencil } from 'lucide-react';
import { useAddChallengeDialog, useViewChallengeDialog } from '@/stores/dialog-store';
import { Button } from '@/components/ui/button';

export const challengeColumns: ColumnDef<TChallengeOutput>[] = [
  {
    accessorKey: 'name',
    header: () => <div className="font-semibold text-slate-900">Challenge name</div>,
    cell: ({ row }) => <span className='text-sm font-medium text-slate-700'>{row.original.name}</span>,
  },
  {
    accessorKey: 'period',
    header: () => <div className="font-semibold text-slate-900">Period</div>,
    cell: ({ row }) => <span className='text-sm text-slate-600'>{row.original.period}</span>,
  },
  {
    accessorKey: 'type',
    header: () => <div className="font-semibold text-slate-900">Type</div>,
    cell: ({ row }) => <span className='text-sm text-slate-600'>{row.original.type}</span>,
  },
  {
    accessorKey: 'members',
    header: () => <div className="font-semibold text-slate-900">Members</div>,
    cell: ({ row }) => (
      <div className='flex items-center -space-x-2'>
        {row.original.members.slice(0, 3).map((member) => (
          <Avatar key={member.id} className='h-8 w-8 border-2 border-white overflow-hidden'>
            <AvatarImage src={member.avatar_url || ''} className="object-cover" />
            <AvatarFallback className="bg-slate-100 text-[10px]">{member.name[0]}</AvatarFallback>
          </Avatar>
        ))}
        {row.original.member_count > 3 && (
          <div className="h-8 w-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
            <span className='text-[10px] font-medium text-slate-500'>+{row.original.member_count - 3}</span>
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: () => <div className="font-semibold text-slate-900">Status</div>,
    cell: ({ row }) => <Switch checked={row.original.status} />,
  },
  {
    id: 'actions',
    header: () => <div className="font-semibold text-slate-900">Actions</div>,
    cell: ({ row }) => {
      const { open: openView } = useViewChallengeDialog();
      const { open: openEdit } = useAddChallengeDialog();
      
      return (
        <div className='flex items-center gap-2'>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openView(row.original.id);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row.original);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];