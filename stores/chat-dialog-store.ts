import { create } from "zustand";
import { TChatOutput } from "@/schemas/chat.schema";

/**
 * Chat Tickets Dialog Store
 * Manages the state of edit and delete ticket dialogs
 */

interface ChatDialogState {
  isOpen: boolean;
  ticket: TChatOutput | null;
  open: (ticket: TChatOutput) => void;
  close: () => void;
}

export const useEditTicketDialog = create<ChatDialogState>((set) => ({
  isOpen: false,
  ticket: null,
  open: (ticket) => set({ isOpen: true, ticket }),
  close: () => set({ isOpen: false, ticket: null }),
}));

export const useDeleteTicketDialog = create<ChatDialogState>((set) => ({
  isOpen: false,
  ticket: null,
  open: (ticket) => set({ isOpen: true, ticket }),
  close: () => set({ isOpen: false, ticket: null }),
}));
