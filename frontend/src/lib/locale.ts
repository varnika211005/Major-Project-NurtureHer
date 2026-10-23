function activeLocale(): string {
  if (typeof document !== "undefined" && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  return "en-IN";
}

export function formatDate(
  value: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleDateString(activeLocale(), options);
}

export function formatTime(
  value: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleTimeString(activeLocale(), options);
}

export function formatDateTime(value: string | number | Date): string {
  return new Date(value).toLocaleString(activeLocale());
}

export function formatNumber(value: number): string {
  return value.toLocaleString(activeLocale());
}
