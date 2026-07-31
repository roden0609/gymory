const HONG_KONG_TIME_ZONE = "Asia/Hong_Kong";

export function formatHongKongDateTime(value: string, locale: string) {
  const formatted = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: HONG_KONG_TIME_ZONE,
  }).format(new Date(value));

  return `${formatted} HKT`;
}
