import { create } from "zustand";
import { devtools } from "zustand/middleware";

/**
 * All dialog types in the application
 * Add new dialog types here as you add new features
 */
export type DialogTypes =
  | "add-facility"
  | "view-facility"
  | "add-marketing"
  | "view-marketing"
  | "add-subscription"
  | "view-subscription"
  | "add-discount"
  | "view-discount"
  | "add-admin"
  | "view-admin"
  | "view-user"
  | "add-condition"
  | "view-condition"
  | "add-healthy-living"
  | "view-healthy-living"
  | "add-faq"
  | "view-faq"
  | "gallery-modal"
  | "view-medication-reminder"
  | "add-ticket"
  | "view-ticket"
  | "assign-admin"
  | "make-group-leader"
  | "view-conversation"
  | "add-trainer"
  | "view-trainer"
  | "add-challenge"
  | "view-challenge"
  | "facility-toggle"
  | "add-exercise"
  | "view-exercise"
  | "add-fitness-plan"
  | "view-fitness-plan"
  | "add-outdoor-route"
  | "view-outdoor-route"
  | "add-outdoor-event"
  | "view-outdoor-event"
  | "add-outdoor-review"
  | "view-outdoor-review"
  | "ai-generate-plan"
  | "flag-user"
  | "add-group"
  | "view-group"
  | "add-top-rated-item";

/**
 * Generic dialog configuration
 * T: Type of data passed to dialog (e.g., for edit mode)
 */
export interface DialogConfig<T = any> {
  type: DialogTypes;
  isOpen: boolean;
  data?: T; // Data for edit mode
  entityId?: string; // Entity ID for view mode
  metadata?: Record<string, any>; // Optional additional data
}

export interface DialogState {
  dialogs: Record<string, DialogConfig>;

  // Core actions
  openDialog: <T = any>(
    type: DialogTypes,
    config?: { data?: T; entityId?: string; metadata?: Record<string, any> },
  ) => void;
  closeDialog: (type: DialogTypes) => void;

  // Utility selectors
  isDialogOpen: (type: DialogTypes) => boolean;
  getDialogData: <T = any>(type: DialogTypes) => T | undefined;
  getEntityId: (type: DialogTypes) => string | undefined;
  getMetadata: (type: DialogTypes) => Record<string, any> | undefined;
}

/**
 * Main dialog store using Zustand
 * Manages all dialogs in the application from a single source of truth
 */
export const useDialogStore = create<DialogState>()(
  devtools(
    (set, get) => ({
      dialogs: {},

      openDialog: (type, config = {}) => {
        set(
          (state) => ({
            dialogs: {
              ...state.dialogs,
              [type]: {
                type,
                isOpen: true,
                data: config.data,
                entityId: config.entityId,
                metadata: config.metadata,
              },
            },
          }),
          false,
          `openDialog/${type}`,
        );
      },

      closeDialog: (type) => {
        set(
          (state) => ({
            dialogs: {
              ...state.dialogs,
              [type]: {
                type,
                isOpen: false,
                data: undefined, // Clear data on close
                entityId: undefined,
                metadata: undefined,
              },
            },
          }),
          false,
          `closeDialog/${type}`,
        );
      },

      isDialogOpen: (type) => get().dialogs[type]?.isOpen ?? false,
      getDialogData: (type) => get().dialogs[type]?.data,
      getEntityId: (type) => get().dialogs[type]?.entityId,
      getMetadata: (type) => get().dialogs[type]?.metadata,
    }),
    { name: "DialogStore" },
  ),
);

// =============================================================================
// GLOBAL / SHARED DIALOG HOOKS
// =============================================================================

export const useGalleryModal = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("gallery-modal"));
  const data = useDialogStore((state) => state.getDialogData("gallery-modal"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("gallery-modal", { data }),
    close: () => closeDialog("gallery-modal"),
  };
};

// =============================================================================
// HELPER UTILITIES
// =============================================================================

/**
 * Close all open dialogs
 * Useful for cleanup or navigation
 */
export const useCloseAllDialogs = () => {
  const store = useDialogStore();

  return () => {
    Object.keys(store.dialogs).forEach((type) => {
      if (store.dialogs[type].isOpen) {
        store.closeDialog(type as DialogTypes);
      }
    });
  };
};

/**
 * Get count of currently open dialogs
 */
export const useOpenDialogCount = () => {
  return useDialogStore(
    (state) => Object.values(state.dialogs).filter((d) => d.isOpen).length,
  );
};
