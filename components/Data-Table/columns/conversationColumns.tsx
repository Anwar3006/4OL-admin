'use client';

import { ColumnDef } from '@tanstack/react-table';
import { TConversationOutput } from '@/schemas/conversation.schema';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export const conversationColumns: ColumnDef<TConversationOutput>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <span className="font-medium text-xs">{row.original.id.slice(0, 8)}...</span>,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-sm">
          {row.original.name || (row.original.type === 'direct' ? 'Direct Message' : 'Unnamed Group')}
        </span>
        {row.original.description && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
            {row.original.description}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.type;
      return (
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] font-bold uppercase',
            type === 'group'
              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
          )}
        >
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'member_count',
    header: 'Members',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.member_count}</span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs whitespace-nowrap">
        {format(new Date(row.original.created_at), 'dd/MM/yyyy')}
      </span>
    ),
  },
];
