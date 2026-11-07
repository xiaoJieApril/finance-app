export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const dateFromKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
};

export const monthDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1).getDay();
  const dayCount = new Date(year, month + 1, 0).getDate();
  const days: Array<number | null> = Array.from({ length: firstDay }, () => null);
  for (let day = 1; day <= dayCount; day += 1) days.push(day);
  while (days.length % 7 !== 0) days.push(null);
  const weeks: Array<Array<number | null>> = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));
  return weeks;
};
