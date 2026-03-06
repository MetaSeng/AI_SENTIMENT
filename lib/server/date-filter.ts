import type { DateFilterOptions, DateRangePreset } from "@/lib/types"

export function getDateFilterFromSearchParams(searchParams: URLSearchParams): DateFilterOptions {
  const rawRange = searchParams.get("range")
  const preset: DateRangePreset =
    rawRange === "7d" || rawRange === "30d" || rawRange === "90d" || rawRange === "custom"
      ? rawRange
      : "30d"
  return {
    preset,
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  }
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function parseIsoDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function getDateBounds(filter: DateFilterOptions): { from: Date; to: Date } | null {
  const now = new Date()

  if (filter.preset === "7d" || filter.preset === "30d" || filter.preset === "90d") {
    const days = filter.preset === "7d" ? 7 : filter.preset === "30d" ? 30 : 90
    const to = endOfDay(now)
    const from = startOfDay(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000))
    return { from, to }
  }

  const fromParsed = parseIsoDateOnly(filter.from)
  const toParsed = parseIsoDateOnly(filter.to)
  if (!fromParsed || !toParsed) return null
  return { from: startOfDay(fromParsed), to: endOfDay(toParsed) }
}

