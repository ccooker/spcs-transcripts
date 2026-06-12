export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatMonthYear(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function formatPeriod(
  startMonth: number,
  startYear: number,
  endMonth: number | null | undefined,
  endYear: number | null | undefined,
): string {
  const start = formatMonthYear(startMonth, startYear);
  if (endMonth == null || endYear == null) {
    return `${start} – Present`;
  }
  return `${start} – ${formatMonthYear(endMonth, endYear)}`;
}
