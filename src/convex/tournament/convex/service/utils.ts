export function getTorontoDate() {
  const date = new Date();
  return { iso: date.toISOString(), localDate: date };
}