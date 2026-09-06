import { useDialogStore } from "@/stores/dialog-store";

export const useAddFacilityDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-facility"));
  const data = useDialogStore((state) => state.getDialogData<T>("add-facility"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-facility", { data }),
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
