export const CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
    { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
    { code: 'COP', name: 'Colombian Peso', symbol: '$' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/' },
    { code: 'UYU', name: 'Uruguayan Peso', symbol: '$' },
]

export const DEFAULT_CURRENCY = 'USD'

interface ExchangeRateResponse {
    amount: number
    base: string
    date: string
    rates: Record<string, number>
}

/**
 * Fetches the current exchange rate from `fromCurrency` to `toCurrency`.
 * Returns the rate (e.g. 1 USD = 950 CLP -> returns 950).
 * Switched to fawazahmed0/currency-api for better support of LATAM currencies.
 */
export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    if (!fromCurrency || !toCurrency) return null
    if (fromCurrency === toCurrency) return 1

    try {
        // This API requires lowercase currency codes
        const from = fromCurrency.toLowerCase()
        const to = toCurrency.toLowerCase()

        // We use the jsdelivr CDN for the community-driven currency API
        const res = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${from}.json`)

        if (!res.ok) {
            console.error(`Failed to fetch rates for ${fromCurrency}. Status: ${res.status}`)
            return null
        }

        const data = await res.json()

        // Structure: { [date]: "YYYY-MM-DD", [from]: { [to]: rate } }
        const rate = data[from]?.[to]

        if (typeof rate !== 'number') {
            console.warn(`Rate not found in response for ${fromCurrency} -> ${toCurrency}`)
            return null
        }

        return rate
    } catch (error) {
        console.error('Exchange rate error:', error)
        return null
    }
}

/**
 * Formats a number as a currency string.
 * Uses strict Int.NumberFormat for the given currency code.
 */
export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: currencyCode === 'CLP' || currencyCode === 'COP' ? 0 : 2,
        maximumFractionDigits: currencyCode === 'CLP' || currencyCode === 'COP' ? 0 : 2,
    }).format(amount)
}
