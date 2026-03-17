import { TSymptomsOutput as TConditionsOutput } from "@/types/symptoms";
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
  | "add-condition"
  | "view-condition"
  | "add-healthy-living"
  | "view-healthy-living"
  | "add-faq"
  | "view-faq"
  | "gallery-modal"
  | "view-medication-reminder"
  | "add-chat"
  | "view-chat"
  | "assign-admin"
  | "view-conversation";

/**
 * Generic dialog configuration
 * T: Type of data passed to dialog (e.g., for edit mode)
 */
interface DialogConfig<T = any> {
  type: DialogTypes;
  isOpen: boolean;
  data?: T; // Data for edit mode
  entityId?: string; // Entity ID for view mode
  metadata?: Record<string, any>; // Optional additional data
}

interface DialogState {
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
// TYPE-SAFE HOOKS FOR EACH DIALOG
// =============================================================================

/**
 * Hook for Add/Edit Facility Dialog
 *
 * @example
 * // In table - open for viewing
 * const addDialog = useAddFacilityDialog();
 * <button onClick={() => addDialog.open()}>Add Facility</button>
 *
 * // From view dialog - open for editing
 * const handleEdit = () => {
 *   addDialog.open(facilityData); // Pass data for edit mode
 * };
 *
 * // In dialog component
 * const { isOpen, data, close } = useAddFacilityDialog();
 * const isEditMode = !!data;
 */
export const useAddFacilityDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-facility"));
  const data = useDialogStore((state) => state.getDialogData("add-facility"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-facility", { data }),
    close: () => closeDialog("add-facility"),
  };
};

/**
 * Hook for View Facility Dialog
 *
 * @example
 * // In table row click
 * const viewDialog = useViewFacilityDialog();
 * <tr onClick={() => viewDialog.open(facility.id)}>
 *
 * // In dialog component
 * const { isOpen, entityId, close } = useViewFacilityDialog();
 * const { data } = trpc.facilities.getById.useQuery(
 *   { id: entityId! },
 *   { enabled: isOpen && !!entityId }
 * );
 */
export const useViewFacilityDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-facility"));
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-facility"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-facility", { entityId }),
    close: () => closeDialog("view-facility"),
  };
};

/**
 * Hook for Add/Edit Marketing Dialog
 */
export const useAddMarketingDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-marketing"));
  const data = useDialogStore((state) => state.getDialogData("add-marketing"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-marketing", { data }),
    close: () => closeDialog("add-marketing"),
  };
};

/**
 * Hook for View Marketing Dialog
 */
export const useViewMarketingDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("view-marketing"),
  );
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-marketing"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-marketing", { entityId }),
    close: () => closeDialog("view-marketing"),
  };
};

/**
 * Hook for Add/Edit Admin Dialog
 */
export const useAddAdminDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-admin"));
  const data = useDialogStore((state) => state.getDialogData("add-admin"));
  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-admin", { data }),
    close: () => closeDialog("add-admin"),
  };
};

/**
 * Hook for View User Dialog
 */
export const useViewUserDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-admin"));
  const entityId = useDialogStore((state) => state.getEntityId("view-admin"));

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-admin", { entityId }),
    close: () => closeDialog("view-admin"),
  };
};

/**
 * Hook for Add/Edit Condition Dialog
 */
export const useAddConditionDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore(
    (state) => !!state.dialogs["add-condition"]?.isOpen,
  );
  const data = useDialogStore((state) => state.dialogs["add-condition"]?.data);

  return {
    isOpen,
    data: data as TConditionsOutput,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-condition", { data }),
    close: () => closeDialog("add-condition"),
  };
};

/**
 * Hook for View Condition Dialog
 */
export const useViewConditionDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore(
    (state) => !!state.dialogs["view-condition"]?.isOpen,
  );
  const entityId = useDialogStore(
    (state) => state.dialogs["view-condition"]?.entityId,
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-condition", { entityId }),
    close: () => closeDialog("view-condition"),
  };
};

export const useAddHealthyLivingDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("add-healthy-living"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData("add-healthy-living"),
  );

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-healthy-living", { data }),
    close: () => closeDialog("add-healthy-living"),
  };
};

export const useViewHealthyLivingDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("view-healthy-living"),
  );
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-healthy-living"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-healthy-living", { entityId }),
    close: () => closeDialog("view-healthy-living"),
  };
};

export const useAddFAQDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-faq"));
  const data = useDialogStore((state) => state.getDialogData("add-faq"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-faq", { data }),
    close: () => closeDialog("add-faq"),
  };
};

export const useViewFAQDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-faq"));
  const entityId = useDialogStore((state) => state.getEntityId("view-faq"));

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-faq", { entityId }),
    close: () => closeDialog("view-faq"),
  };
};

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

export const useViewMediactionReminderDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("view-medication-reminder"),
  );
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-medication-reminder"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) =>
      openDialog("view-medication-reminder", { entityId }),
    close: () => closeDialog("view-medication-reminder"),
  };
};

export const useAddChatDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-chat"));
  const data = useDialogStore((state) => state.getDialogData("add-chat"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-chat", { data }),
    close: () => closeDialog("add-chat"),
  };
};

export const useViewChatDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-chat"));
  const entityId = useDialogStore((state) => state.getEntityId("view-chat"));

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-chat", { entityId }),
    close: () => closeDialog("view-chat"),
  };
};

/**
 * Hook for Add/Edit Subscription Dialog
 */
export const useAddSubscriptionDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("add-subscription"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData("add-subscription"),
  );

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-subscription", { data }),
    close: () => closeDialog("add-subscription"),
  };
};

/**
 * Hook for View Subscription Dialog
 */
export const useViewSubscriptionDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("view-subscription"),
  );
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-subscription"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-subscription", { entityId }),
    close: () => closeDialog("view-subscription"),
  };
};

/**
 * Hook for Add/Edit Discount Dialog
 */
export const useAddDiscountDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-discount"));
  const data = useDialogStore((state) => state.getDialogData("add-discount"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-discount", { data }),
    close: () => closeDialog("add-discount"),
  };
};

/**
 * Hook for View Discount Dialog
 */
export const useViewDiscountDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-discount"));
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-discount"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-discount", { entityId }),
    close: () => closeDialog("view-discount"),
  };
};


export const useAssignAdminDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("assign-admin"));
  const entityId = useDialogStore((state) => state.getEntityId("assign-admin"));
  const data = useDialogStore((state) => state.getDialogData("assign-admin"));

  return {
    isOpen,
    entityId,
    data,
    open: (entityId: string, data?: any) => openDialog("assign-admin", { entityId, data }),
    close: () => closeDialog("assign-admin"),
  };
};

export const useViewConversationDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-conversation"));
  const entityId = useDialogStore((state) => state.getEntityId("view-conversation"));
  const data = useDialogStore((state) => state.getDialogData("view-conversation"));

  return {
    isOpen,
    entityId,
    data,
    open: (entityId: string, data?: any) => openDialog("view-conversation", { entityId, data }),
    close: () => closeDialog("view-conversation"),
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
