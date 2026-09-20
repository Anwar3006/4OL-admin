import { useDialogStore } from "@/stores/dialog-store";

export const useAddFacilityDialog = <T extends { id?: string } = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-facility"));
  const data = useDialogStore((state) => state.getDialogData<T>("add-facility"));
  const metadata = useDialogStore((state) => state.getMetadata("add-facility"));

  return {
    isOpen,
    data,
    metadata,
    // Keyed off `id`, not `!!data` — a genuine edit always passes a full row
    // (which has one); a create-mode PREFILL (Onboarding Requests' Approve,
    // partial data with no id) must stay in create mode.
    isEditMode: !!data?.id,
    open: (data?: T, metadata?: Record<string, any>) =>
      openDialog("add-facility", { data, metadata }),
    close: () => closeDialog("add-facility"),
  };
};

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

export const useFacilityToggleDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("facility-toggle"));
  const data = useDialogStore((state) =>
    state.getDialogData<{
      facilityId: string;
      facilityName: string;
      currentStatus: boolean;
    }>("facility-toggle"),
  );

  return {
    isOpen,
    data,
    open: (data: {
      facilityId: string;
      facilityName: string;
      currentStatus: boolean;
    }) => openDialog("facility-toggle", { data }),
    close: () => closeDialog("facility-toggle"),
  };
};
