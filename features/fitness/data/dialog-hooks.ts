import { useDialogStore } from "@/stores/dialog-store";

export const useAddTrainerDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-trainer"));
  const data = useDialogStore((state) => state.getDialogData<T>("add-trainer"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-trainer", { data }),
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

export const useAddChallengeDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-challenge"));
  const data = useDialogStore((state) => state.getDialogData<T>("add-challenge"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-challenge", { data }),
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

export const useAddExerciseDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-exercise"));
  const data = useDialogStore((state) => state.getDialogData<T>("add-exercise"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-exercise", { data }),
    close: () => closeDialog("add-exercise"),
  };
};

export const useViewExerciseDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-exercise"));
  const entityId = useDialogStore((state) => state.getEntityId("view-exercise"));

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-exercise", { entityId }),
    close: () => closeDialog("view-exercise"),
  };
};

export const useAddFitnessPlanDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("add-fitness-plan"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData<T>("add-fitness-plan"),
  );

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-fitness-plan", { data }),
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

export const useAddOutdoorRouteDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("add-outdoor-route"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData<T>("add-outdoor-route"),
  );

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-outdoor-route", { data }),
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

export const useAddOutdoorEventDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("add-outdoor-event"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData<T>("add-outdoor-event"),
  );

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-outdoor-event", { data }),
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

export const useAddOutdoorReviewDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("add-outdoor-review"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData<T>("add-outdoor-review"),
  );

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-outdoor-review", { data }),
    close: () => closeDialog("add-outdoor-review"),
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
    open: (entityId: string) =>
      openDialog("view-outdoor-review", { entityId }),
    close: () => closeDialog("view-outdoor-review"),
  };
};

export const useAiGeneratePlanDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("ai-generate-plan"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData<T>("ai-generate-plan"),
  );

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("ai-generate-plan", { data }),
    close: () => closeDialog("ai-generate-plan"),
  };
};
