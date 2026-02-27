import { create } from "zustand";

/**
 * Chat Tickets Dialog Store
 * Manages the state of edit and delete ticket dialogs
 */

export const useEditTicketDialog = create((set) => ({
  isOpen: false,
  ticket: null,
  open: (ticket) => set({ isOpen: true, ticket }),
  close: () => set({ isOpen: false, ticket: null }),
}));

export const useDeleteTicketDialog = create((set) => ({
  isOpen: false,
  ticket: null,
  open: (ticket) => set({ isOpen: true, ticket }),
  close: () => set({ isOpen: false, ticket: null }),
}));
