import { updatedAgoToMinutes, updatedOnToTimestamp } from "@/lib/format-updated-ago"

type UpdatedRow = {
  updatedAgo: string
  updatedOn: string
}

/** Most recent first (top → bottom). */
export function compareByMostRecent(a: UpdatedRow, b: UpdatedRow): number {
  const timeDiff = updatedOnToTimestamp(b.updatedOn) - updatedOnToTimestamp(a.updatedOn)

  if (timeDiff !== 0) {
    return timeDiff
  }

  return updatedAgoToMinutes(a.updatedAgo) - updatedAgoToMinutes(b.updatedAgo)
}
