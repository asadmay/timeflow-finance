export function formatRub(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("ru-RU").format(abs);
  return `${amount < 0 ? "−" : ""}${formatted} ₽`;
}

export function formatRubSigned(amount: number): string {
  const formatted = new Intl.NumberFormat("ru-RU").format(Math.abs(amount));
  return `${amount >= 0 ? "+" : "−"}${formatted} ₽`;
}

export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
