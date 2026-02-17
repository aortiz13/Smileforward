

/**
 * Parses OCR-extracted text from receipts to find structured financial data.
 * Handles Spanish and English receipt formats.
 */
export function parseReceiptText(text: string): {
    total: number | null
    date: string | null
    vendor: string | null
    description: string
} {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    return {
        total: extractTotal(text),
        date: extractDate(text),
        vendor: extractVendor(lines),
        description: lines.slice(0, 5).join(' | ').substring(0, 200)
    }
}

function extractTotal(text: string): number | null {
    // Patterns for totals in Spanish and English receipts
    const patterns = [
        // "Total: $12,345.67" or "TOTAL $12.345,67"
        /(?:total|monto\s*total|gran\s*total|amount\s*due|neto|net)\s*[:\s]*\$?\s*([\d.,]+)/gi,
        // "$ 12.345" at end of line
        /\$\s*([\d.,]+)\s*$/gm,
        // Standalone large numbers that look like amounts
        /(?:^|\s)([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*$/gm,
    ]

    let bestTotal: number | null = null

    for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(text)) !== null) {
            const raw = match[1]
            const num = parseAmount(raw)
            if (num && num > 0 && (bestTotal === null || num > bestTotal)) {
                bestTotal = num
            }
        }
    }

    return bestTotal
}

function parseAmount(raw: string): number | null {
    // Handle both "12,345.67" (US) and "12.345,67" (Latin America/Europe)
    const cleaned = raw.trim()

    // If last separator is comma and has 2 digits after → "12.345,67" format
    if (/,\d{2}$/.test(cleaned)) {
        const normalized = cleaned.replace(/\./g, '').replace(',', '.')
        const num = parseFloat(normalized)
        return isNaN(num) ? null : num
    }

    // Otherwise assume US format "12,345.67"
    const normalized = cleaned.replace(/,/g, '')
    const num = parseFloat(normalized)
    return isNaN(num) ? null : num
}

function extractDate(text: string): string | null {
    // DD/MM/YYYY or DD-MM-YYYY
    let match = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
    if (match) {
        const [, day, month, year] = match
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // YYYY-MM-DD (ISO format)
    match = text.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
        return match[0]
    }

    // "10 Feb 2026" or "10 de Febrero 2026"
    const months: Record<string, string> = {
        'ene': '01', 'jan': '01', 'enero': '01', 'january': '01',
        'feb': '02', 'febrero': '02', 'february': '02',
        'mar': '03', 'marzo': '03', 'march': '03',
        'abr': '04', 'apr': '04', 'abril': '04', 'april': '04',
        'may': '05', 'mayo': '05',
        'jun': '06', 'junio': '06', 'june': '06',
        'jul': '07', 'julio': '07', 'july': '07',
        'ago': '08', 'aug': '08', 'agosto': '08', 'august': '08',
        'sep': '09', 'sept': '09', 'septiembre': '09', 'september': '09',
        'oct': '10', 'octubre': '10', 'october': '10',
        'nov': '11', 'noviembre': '11', 'november': '11',
        'dic': '12', 'dec': '12', 'diciembre': '12', 'december': '12',
    }

    const monthPattern = Object.keys(months).join('|')
    const textDateRegex = new RegExp(`(\\d{1,2})\\s*(?:de\\s+)?(${monthPattern})\\.?\\s*(\\d{4})`, 'i')
    match = text.match(textDateRegex)
    if (match) {
        const day = match[1].padStart(2, '0')
        const monthStr = months[match[2].toLowerCase()]
        const year = match[3]
        if (monthStr) return `${year}-${monthStr}-${day}`
    }

    return null
}

function extractVendor(lines: string[]): string | null {
    // First non-empty line is usually the vendor/store name
    for (const line of lines.slice(0, 3)) {
        // Skip lines that are mostly numbers, dates, or very short
        if (line.length < 3) continue
        if (/^\d+[\s\/\-]/.test(line)) continue
        if (/^(rut|nit|rfc|cuit|fecha|date|hora|time|folio|boleta|factura)/i.test(line)) continue
        return line.substring(0, 100)
    }
    return null
}
