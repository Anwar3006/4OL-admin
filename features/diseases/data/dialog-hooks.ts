import { useDialogStore } from "@/stores/dialog-store";
import { TSymptomsOutput as TConditionsOutput } from "@/features/symptoms/schema/types";

export const useAddConditionDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-condition"));
  const data = useDialogStore((state) =>
    state.getDialogData<TConditionsOutput>("add-condition"),
  );

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: TConditionsOutput) => openDialog("add-condition", { data }),
    close: () => closeDialog("add-condition"),
  };
};

export const useViewConditionDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("view-condition"),
  );
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-condition"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-condition", { entityId }),
    close: () => closeDialog("view-condition"),
  };
};
