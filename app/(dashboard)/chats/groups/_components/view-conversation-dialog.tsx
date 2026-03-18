'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useViewConversationDialog, useAssignAdminDialog } from '@/stores/dialog-store';
import { format } from 'date-fns';
import { TConversationOutput } from '@/schemas/conversation.schema';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Info, ShieldCheck } from 'lucide-react';

const ViewConversationDialog = () => {
  const { isOpen, close, data } = useViewConversationDialog();
  const assignAdmin = useAssignAdminDialog();

  const conversation = data as TConversationOutput;

  if (!conversation) return null;

  const handleAssignAdmin = () => {
    assignAdmin.open(conversation.id, conversation);
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Info className="w-5 h-5 text-blue-500" />
            Conversation Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center border-2 border-slate-200">
              <Users className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold">
              {conversation.name || (conversation.type === 'direct' ? 'Direct Message' : 'Unnamed Group')}
            </h3>
            <Badge variant={conversation.type === 'group' ? 'default' : 'secondary'}>
              {conversation.type}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                <Users className="w-3 h-3" /> Members
              </span>
              <p className="text-sm font-medium mt-1">{conversation.member_count}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Created
              </span>
              <p className="text-sm font-medium mt-1">
                {format(new Date(conversation.created_at), 'PPP')}
              </p>
            </div>
          </div>

          {conversation.description && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Description</span>
              <p className="text-sm mt-1">{conversation.description}</p>
            </div>
          )}

          {conversation.user_profiles && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Requested By</span>
              <p className="text-sm font-medium mt-1">
                {conversation.user_profiles.first_name} {conversation.user_profiles.last_name}
              </p>
              {conversation.user_profiles.phone_number && (
                <p className="text-xs text-muted-foreground">{conversation.user_profiles.phone_number}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={close}>
            Close
          </Button>
          {conversation.type === 'group' && (
            <Button onClick={handleAssignAdmin} className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              Assign Admin
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewConversationDialog;
