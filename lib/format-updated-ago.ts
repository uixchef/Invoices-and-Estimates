const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 1440
const MINUTES_PER_WEEK = 10080

/** Reference "now" for seed data so dates/labels stay consistent across renders. */
const SEED_NOW = new Date(2026, 5, 7, 1, 6, 0)

export type UpdatedMeta = {
  updatedOn: string
  updatedAgo: string
}

/** Formats a minute offset as a relative updated label. */
export function formatUpdatedAgoFromMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) {
    return "Just now"
  }

  if (totalMinutes < MINUTES_PER_HOUR) {
    return `${totalMinutes}min ago`
  }

  if (totalMinutes < MINUTES_PER_DAY) {
    return `${Math.floor(totalMinutes / MINUTES_PER_HOUR)}h ago`
  }

  if (totalMinutes < MINUTES_PER_WEEK) {
    return `${Math.floor(totalMinutes / MINUTES_PER_DAY)}d ago`
  }

  return `${Math.floor(totalMinutes / MINUTES_PER_WEEK)}w ago`
}

/** Formats a date as "M/D/YYYY" — relative label carries the time context. */
export function formatUpdatedOn(date: Date): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const year = date.getFullYear()

  return `${month}/${day}/${year}`
}

/**
 * Non-linear spread: recent rows are minutes apart, older rows stretch into
 * hours, days, then weeks — so a list reads like a realistic edit history.
 */
function offsetMinutesForIndex(index: number): number {
  return Math.round(2.9 * index * index) + index * 2
}

/** Realistic, consistent date + relative label for each seed row (0 = newest). */
export function buildUpdatedMeta(count: number, baseNow: Date = SEED_NOW): UpdatedMeta[] {
  return Array.from({ length: count }, (_, index) => {
    const minutes = offsetMinutesForIndex(index)
    const date = new Date(baseNow.getTime() - minutes * 60_000)

    return {
      updatedOn: formatUpdatedOn(date),
      updatedAgo: formatUpdatedAgoFromMinutes(minutes),
    }
  })
}

/** Parses a display timestamp back to epoch ms for sorting. */
export function updatedOnToTimestamp(value: string): number {
  const parsed = Date.parse(value.replace(",", " "))
  return Number.isNaN(parsed) ? 0 : parsed
}

/** Parses relative labels back to minutes (fallback sort key). */
export function updatedAgoToMinutes(ago: string): number {
  const normalized = ago.trim().toLowerCase()

  if (normalized === "just now") {
    return 0
  }

  const minuteMatch = normalized.match(/^(\d+)\s*min/)
  if (minuteMatch) {
    return Number(minuteMatch[1])
  }

  const hourMatch = normalized.match(/^(\d+)\s*h/)
  if (hourMatch) {
    return Number(hourMatch[1]) * MINUTES_PER_HOUR
  }

  const dayMatch = normalized.match(/^(\d+)\s*d/)
  if (dayMatch) {
    return Number(dayMatch[1]) * MINUTES_PER_DAY
  }

  const weekMatch = normalized.match(/^(\d+)\s*w/)
  if (weekMatch) {
    return Number(weekMatch[1]) * MINUTES_PER_WEEK
  }

  return Number.MAX_SAFE_INTEGER
}
