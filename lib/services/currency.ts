/**
 * Currency Service
 * Handles live exchange rate fetching and conversion
 */

const RATES_CACHE_KEY = 'ss_exchange_rates';
const RATES_EXPIRY = 3600000; // 1 hour

export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
  last_fetched: number;
}

export const CurrencyService = {
  /**
   * Fetches latest exchange rates with caching
   */
  async getLatestRates(baseCurrency: string = 'INR'): Promise<ExchangeRates | null> {
    try {
      // Check cache
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(`${RATES_CACHE_KEY}_${baseCurrency}`);
        if (cached) {
          const parsed = JSON.parse(cached) as ExchangeRates;
          if (Date.now() - parsed.last_fetched < RATES_EXPIRY) {
            return parsed;
          }
        }
      }

      // Removed console.log for production
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
      if (!response.ok) throw new Error("Failed to fetch exchange rates");
      
      const data = await response.json();
      const ratesData: ExchangeRates = {
        base: data.base,
        date: data.date,
        rates: data.rates,
        last_fetched: Date.now()
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(`${RATES_CACHE_KEY}_${baseCurrency}`, JSON.stringify(ratesData));
      }

      return ratesData;
    } catch (error) {
      console.error("Currency fetch failed:", error);
      return null;
    }
  },

  /**
   * Converts an amount between two currencies
   */
  async convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;
    
    const ratesData = await this.getLatestRates(from);
    if (!ratesData || !ratesData.rates[to]) {
      console.warn(`[Currency] Could not find rate for ${from} -> ${to}. Returning original amount.`);
      return amount;
    }

    return amount * ratesData.rates[to];
  }
};
