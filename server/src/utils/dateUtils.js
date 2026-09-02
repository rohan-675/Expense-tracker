export const getMonthRange = (month) => {
  const monthValue = month || new Date().toISOString().slice(0, 7);
  const [year, monthIndex] = monthValue.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 1);

  return { start, end, month: monthValue };
};

export const getPreviousMonth = (month) => {
  const { start } = getMonthRange(month);
  start.setMonth(start.getMonth() - 1);
  return start.toISOString().slice(0, 7);
};

export const addFrequency = (date, frequency) => {
  const next = new Date(date);
  if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
    return next;
  }

  next.setMonth(next.getMonth() + 1);
  return next;
};

