export const calculatePeriodDates = (startDate, periodLength) => {
  const periodDates = [];
  const periodStartDate = new Date(startDate);

  for (let i = 0; i < periodLength; i++) {
    const current = new Date(periodStartDate);
    current.setDate(periodStartDate.getDate() + i);
    periodDates.push(current.toISOString().split("T")[0]);
  }

  return periodDates;
};

export const calculateNextPeriodStart = (periodEnd, cycleLength) => {
  const nextPeriodStart = new Date(periodEnd);
  nextPeriodStart.setDate(periodEnd.getDate() + 1 + cycleLength);
  return nextPeriodStart.toISOString().split("T")[0];
};

export const calculateOvulationDate = (nextPeriodStart) => {
  const computedOvulation = new Date(nextPeriodStart);
  computedOvulation.setDate(nextPeriodStart.getDate() - 14);
  return computedOvulation.toISOString().split("T")[0];
};

export const calculateFertileWindow = (ovulationDate) => {
  const fertileWindow = [];
  const ovulation = new Date(ovulationDate);

  for (let offset = -2; offset <= 2; offset++) {
    const d = new Date(ovulation);
    d.setDate(ovulation.getDate() + offset);
    fertileWindow.push(d.toISOString().split("T")[0]);
  }

  return fertileWindow;
};