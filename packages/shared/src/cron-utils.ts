import { CronExpressionParser } from "cron-parser";

export function isValidCron(expression: string): boolean {
  if (!expression || !expression.trim()) {
    return false;
  }
  try {
    CronExpressionParser.parse(expression);
    return true;
  } catch {
    return false;
  }
}

export function getNextRunAt(
  expression: string,
  after: Date = new Date()
): Date | null {
  try {
    const interval = CronExpressionParser.parse(expression, {
      currentDate: after,
      tz: "UTC",
    });
    return interval.next().toDate();
  } catch {
    return null;
  }
}
