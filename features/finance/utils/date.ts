export function toDateKey(date: Date | string) {
  return new Date(date).toLocaleDateString('en-CA');
}

export function isSameMonth(date: Date | string, month: Date) {
  const target = new Date(date);

  return (
    target.getMonth() === month.getMonth() &&
    target.getFullYear() === month.getFullYear()
  );
}

export function getCurrentMonth() {
  return new Date();
}
