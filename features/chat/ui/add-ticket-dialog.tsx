"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAddTicketDialog } from "@/stores/dialog-store";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { TChatInput, chatInputSchema } from "@/features/chat/schema/chat";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateChat } from "@/features/chat/data/useChat";

const PRIORITY_META: Record<string, { emoji: string; badge: string }> = {
  Low: { emoji: "🟢", badge: "badge-blue" },
  Medium: { emoji: "🟡", badge: "badge-amber" },
  High: { emoji: "🔴", badge: "badge-red" },
};

const STATUS_META: Record<string, { emoji: string; badge: string }> = {
  Open: { emoji: "🟢", badge: "badge-green" },
  Unread: { emoji: "🔵", badge: "badge-blue" },
  Pending: { emoji: "🟡", badge: "badge-amber" },
  Resolved: { emoji: "✅", badge: "badge-green" },
  Escalated: { emoji: "🔺", badge: "badge-red" },
};

const AddTicketDialog = () => {
  const addTicket = useAddTicketDialog();
  const updateTicket = useUpdateChat();

  const form = useForm<TChatInput>({
    resolver: zodResolver(chatInputSchema),
    defaultValues: {
      priority: "Low",
      status: "Open",
    },
  });

  // Reset form when opening dialog or when data changes
  useEffect(() => {
    if (addTicket.isOpen && addTicket.data) {
      form.reset({
        priority: addTicket.data.priority,
        status: addTicket.data.status,
      });
    }
  }, [addTicket.isOpen, addTicket.data, form]);

  const handleClose = () => {
    form.reset();
    addTicket.close();
  };

  const handleSubmit = async (data: TChatInput) => {
    try {
      if (addTicket.isEditMode && addTicket.data?.id) {
        await updateTicket.mutateAsync({
          id: addTicket.data.id,
          data,
        });
        handleClose();
      }
    } catch (error) {
      console.error("Ticket operation error:", error);
    }
  };

  const isSubmitting = updateTicket.isPending;
  const currentPriority = form.watch("priority");
  const currentStatus = form.watch("status");

  return (
    <Dialog open={addTicket.isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md overflow-y-auto p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2.5 text-base">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-lg shrink-0">
              🎟️
            </span>
            <span className="flex-1">
              <span className="block text-slate-800 font-black">
                Support Ticket
              </span>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                #{addTicket.data?.id}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        {addTicket.data && (
          <div className="px-6 pt-5 space-y-4">
            <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">
                  Requested By
                </span>
                <span className="font-bold text-sm text-slate-800">
                  {addTicket.data.user_profiles?.first_name}{" "}
                  {addTicket.data.user_profiles?.last_name}
                </span>
                <span className="text-[11px] text-slate-400">
                  {addTicket.data.user_profiles?.phone_number ||
                    "no phone on file"}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`badge ${PRIORITY_META[currentPriority]?.badge} text-[9px]`}
                >
                  {PRIORITY_META[currentPriority]?.emoji} {currentPriority}
                </span>
                <span
                  className={`badge ${STATUS_META[currentStatus]?.badge} text-[9px]`}
                >
                  {STATUS_META[currentStatus]?.emoji} {currentStatus}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                Subject
              </span>
              <p className="font-bold text-sm text-slate-800 leading-snug">
                {addTicket.data.subject}
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                Message
              </span>
              <div className="bg-slate-50 p-3.5 rounded-xl text-[13px] leading-relaxed border border-slate-100 text-slate-600">
                {addTicket.data.message}
              </div>
            </div>
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="px-6 pt-5 pb-6 space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Priority
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full bg-slate-50 border-slate-200 h-9 text-xs">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white">
                        <SelectItem value="Low">🟢 Low</SelectItem>
                        <SelectItem value="Medium">🟡 Medium</SelectItem>
                        <SelectItem value="High">🔴 High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Status
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full bg-slate-50 border-slate-200 h-9 text-xs">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white">
                        <SelectItem value="Open">🟢 Open</SelectItem>
                        <SelectItem value="Unread">🔵 Unread</SelectItem>
                        <SelectItem value="Pending">🟡 Pending</SelectItem>
                        <SelectItem value="Resolved">✅ Resolved</SelectItem>
                        <SelectItem value="Escalated">🔺 Escalated</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-[11px] font-black uppercase tracking-widest"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  "Update Ticket"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTicketDialog;
