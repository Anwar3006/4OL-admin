import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAddChatDialog } from "@/stores/dialog-store";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@radix-ui/react-dialog";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { TChatInput, chatInputSchema } from "@/schemas/chat.schema";
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
import { useUpdateChat } from "@/hooks/supabase-calls/useChat";

const AddChatDialog = () => {
  const addChat = useAddChatDialog();
  const updateChat = useUpdateChat();

  const form = useForm<TChatInput>({
    resolver: zodResolver(chatInputSchema),
    defaultValues: {
      priority: "Low",
      status: "Open",
    },
  });

  // Reset form when opening dialog or when data changes
  useEffect(() => {
    if (addChat.isOpen && addChat.data) {
      form.reset({
        priority: addChat.data.priority,
        status: addChat.data.status,
      });
    }
  }, [addChat.isOpen, addChat.data, form]);

  const handleClose = () => {
    form.reset();
    addChat.close();
  };

  const handleSubmit = async (data: TChatInput) => {
    try {
      if (addChat.isEditMode && addChat.data?.id) {
        await updateChat.mutateAsync({
          id: addChat.data.id,
          data,
        });
        handleClose();
      }
    } catch (error) {
      console.error("Chat operation error:", error);
    }
  };

  const isSubmitting = updateChat.isPending;

  return (
    <Dialog open={addChat.isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md overflow-y-auto py-5 px-6">
        <DialogHeader>
          <DialogTitle>
            Edit Ticket #{addChat.data?.id}
          </DialogTitle>
        </DialogHeader>

        {addChat.data && (
          <div className="space-y-4 mb-6">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Requested By</span>
              <span className="font-medium text-sm">
                {addChat.data.user_profiles?.first_name} {addChat.data.user_profiles?.last_name} ({addChat.data.user_profiles?.email})
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Subject</span>
              <span className="font-medium text-sm">{addChat.data.subject}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Message</span>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md text-sm border border-slate-100 dark:border-slate-800 italic">
                {addChat.data.message}
              </div>
            </div>
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
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
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
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

export default AddChatDialog;
