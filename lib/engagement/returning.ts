/**
 * Returning visitor: someone with at least one eligible impression in the
 * labelled window whose first impression UTC day is before that window starts.
 * Not an account. Not inferred from opens alone.
 */
export function isReturningVisitor(firstDay: string | null | undefined, windowStartDay: string): boolean {
  return Boolean(firstDay && firstDay < windowStartDay);
}

export function mergeFirstDay(existing: string | null | undefined, nextDay: string): string {
  if (!existing) return nextDay;
  return existing < nextDay ? existing : nextDay;
}
