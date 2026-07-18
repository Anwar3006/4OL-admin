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
  | "edit-group";

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
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-user"));
  const entityId = useDialogStore((state) => state.getEntityId("view-user"));

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-user", { entityId }),
    close: () => closeDialog("view-user"),
  };
};

/**
 * Hook for View Admin Dialog
 */
export const useViewAdminDialog = () => {
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
 * Hook for Flag User Dialog
 */
export const useFlagUserDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("flag-user"));
  const entityId = useDialogStore((state) => state.getEntityId("flag-user"));
  const data = useDialogStore((state) => state.getDialogData("flag-user"));

  return {
    isOpen,
    entityId,
    data,
    open: (entityId: string, data?: any) =>
      openDialog("flag-user", { entityId, data }),
    close: () => closeDialog("flag-user"),
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

export const useAddTicketDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-ticket"));
  const data = useDialogStore((state) => state.getDialogData("add-ticket"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-ticket", { data }),
    close: () => closeDialog("add-ticket"),
  };
};

export const useViewTicketDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-ticket"));
  const entityId = useDialogStore((state) => state.getEntityId("view-ticket"));

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-ticket", { entityId }),
    close: () => closeDialog("view-ticket"),
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

export const useMakeGroupLeaderDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("make-group-leader"),
  );
  const entityId = useDialogStore((state) =>
    state.getEntityId("make-group-leader"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData("make-group-leader"),
  );

  return {
    isOpen,
    entityId,
    data,
    open: (userId: string, data?: any) =>
      openDialog("make-group-leader", { entityId: userId, data }),
    close: () => closeDialog("make-group-leader"),
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
    open: (entityId: string, data?: any) =>
      openDialog("assign-admin", { entityId, data }),
    close: () => closeDialog("assign-admin"),
  };
};

export const useViewConversationDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("view-conversation"),
  );
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-conversation"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData("view-conversation"),
  );

  return {
    isOpen,
    entityId,
    data,
    open: (entityId: string, data?: any) =>
      openDialog("view-conversation", { entityId, data }),
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

export const useAddTrainerDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-trainer"));
  const data = useDialogStore((state) => state.getDialogData("add-trainer"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-trainer", { data }),
    close: () => closeDialog("add-trainer"),
  };
};

export const useViewTrainerDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-trainer"));
  const entityId = useDialogStore((state) => state.getEntityId("view-trainer"));

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-trainer", { entityId }),
    close: () => closeDialog("view-trainer"),
  };
};

export const useAddChallengeDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-challenge"));
  const data = useDialogStore((state) => state.getDialogData("add-challenge"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-challenge", { data }),
    close: () => closeDialog("add-challenge"),
  };
};

export const useViewChallengeDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("view-challenge"),
  );
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-challenge"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-challenge", { entityId }),
    close: () => closeDialog("view-challenge"),
  };
};

export const useFacilityToggleDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("facility-toggle"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData("facility-toggle"),
  );

  return {
    isOpen,
    data,
    open: (data: any) => openDialog("facility-toggle", { data }),
    close: () => closeDialog("facility-toggle"),
  };
};

export const useAddExerciseDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-exercise"));
  const data = useDialogStore((state) => state.getDialogData("add-exercise"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-exercise", { data }),
    close: () => closeDialog("add-exercise"),
  };
};

export const useViewExerciseDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-exercise"));
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-exercise"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-exercise", { entityId }),
    close: () => closeDialog("view-exercise"),
  };
};

export const useAddFitnessPlanDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("add-fitness-plan"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData("add-fitness-plan"),
  );

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-fitness-plan", { data }),
    close: () => closeDialog("add-fitness-plan"),
  };
};

export const useViewFitnessPlanDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("view-fitness-plan"),
  );
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-fitness-plan"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-fitness-plan", { entityId }),
    close: () => closeDialog("view-fitness-plan"),
  };
};

export const useAddOutdoorRouteDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("add-outdoor-route"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData("add-outdoor-route"),
  );

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-outdoor-route", { data }),
    close: () => closeDialog("add-outdoor-route"),
  };
};

export const useViewOutdoorRouteDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("view-outdoor-route"),
  );
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-outdoor-route"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-outdoor-route", { entityId }),
    close: () => closeDialog("view-outdoor-route"),
  };
};

export const useAddOutdoorEventDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("add-outdoor-event"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData("add-outdoor-event"),
  );

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-outdoor-event", { data }),
    close: () => closeDialog("add-outdoor-event"),
  };
};

export const useViewOutdoorEventDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("view-outdoor-event"),
  );
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-outdoor-event"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-outdoor-event", { entityId }),
    close: () => closeDialog("view-outdoor-event"),
  };
};

export const useAddOutdoorReviewDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("add-outdoor-review"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData("add-outdoor-review"),
  );

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("add-outdoor-review", { data }),
    close: () => closeDialog("add-outdoor-review"),
  };
};

export const useAddGroupDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-group"));
  const data = useDialogStore((state) => state.getDialogData("add-group"));

  return {
    isOpen,
    data,
    open: () => openDialog("add-group"),
    close: () => closeDialog("add-group"),
  };
};

export const useViewGroupDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-group"));
  const entityId = useDialogStore((state) => state.getEntityId("view-group"));
  const data = useDialogStore((state) => state.getDialogData("view-group"));

  return {
    isOpen,
    entityId,
    data,
    open: (entityId: string, data?: any) =>
      openDialog("view-group", { entityId, data }),
    close: () => closeDialog("view-group"),
  };
};

export const useEditGroupDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("edit-group"));
  const data = useDialogStore((state) => state.getDialogData("edit-group"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: any) => openDialog("edit-group", { data }),
    close: () => closeDialog("edit-group"),
  };
};

/**
 * Hook for AI Generate Plan Dialog (admin panel)
 *
 * @example
 * const aiGenerateDialog = useAiGeneratePlanDialog();
 * <button onClick={() => aiGenerateDialog.open()}>AI Generate</button>
 */
export const useAiGeneratePlanDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("ai-generate-plan"),
  );

  return {
    isOpen,
    open: () => openDialog("ai-generate-plan"),
    close: () => closeDialog("ai-generate-plan"),
  };
};

export const useViewOutdoorReviewDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("view-outdoor-review"),
  );
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-outdoor-review"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-outdoor-review", { entityId }),
    close: () => closeDialog("view-outdoor-review"),
  };
};
