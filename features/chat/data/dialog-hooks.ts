import { useDialogStore } from "@/stores/dialog-store";

export const useAddTicketDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-ticket"));
  const data = useDialogStore((state) => state.getDialogData<T>("add-ticket"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-ticket", { data }),
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
    open: (entityId: string, data?: any) => openDialog("make-group-leader", { entityId, data }),
    close: () => closeDialog("make-group-leader"),
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

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-conversation", { entityId }),
    close: () => closeDialog("view-conversation"),
  };
};

export const useAddGroupDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-group"));
  const data = useDialogStore((state) => state.getDialogData<T>("add-group"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-group", { data }),
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
