/** In-memory cache for stock forecast alerts (5 min TTL). */
const CACHE_MS = 5 * 60 * 1000

let forecastCache: { data: unknown; timestamp: number } | null = null

export function getCachedForecast<T>(): T | null {
  if (!forecastCache) return null
  if (Date.now() - forecastCache.timestamp >= CACHE_MS) {
    forecastCache = null
    return null
  }
  return forecastCache.data as T
}

export function setCachedForecast<T>(data: T): void {
  forecastCache = { data, timestamp: Date.now() }
}

export function clearForecastCache(): void {
  forecastCache = null
}

export const FORECAST_CACHE_MS = CACHE_MS
