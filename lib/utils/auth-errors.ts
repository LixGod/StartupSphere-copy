/** Detect Supabase Auth rate-limit errors (429 / over_request_rate_limit). */
export function isAuthRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as { message?: string; status?: number; code?: string }
  const msg = e.message?.toLowerCase() ?? ""
  return (
    e.status === 429 ||
    e.code === "over_request_rate_limit" ||
    msg.includes("rate limit") ||
    msg.includes("over_request_rate_limit")
  )
}
