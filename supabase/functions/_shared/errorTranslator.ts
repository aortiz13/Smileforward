/**
 * Sistema de traducción de errores de Gemini API para Edge Functions (Deno)
 */

export interface ErrorConfig {
    title: string;
    message: string;
    suggestion: string | null;
    icon: string;
    canRetry: boolean;
    retryDelay?: number;
    userAction?: 'modify_prompt' | 'wait' | 'contact_support';
    isSystemError?: boolean;
    autoRetry?: boolean;
}

const USER_FRIENDLY_ERRORS: Record<string | number, ErrorConfig> = {
    400: {
        title: "Solicitud no válida",
        message: "No pudimos procesar tu solicitud. Por favor, intenta de nuevo.",
        suggestion: "Revisa la imagen o descripción",
        icon: "⚠️",
        canRetry: true,
    },
    429: {
        title: "Demasiadas solicitudes",
        message: "Has generado muchas imágenes recientemente.",
        suggestion: "Espera unos segundos antes de intentar de nuevo",
        icon: "⏱️",
        canRetry: true,
        retryDelay: 10000,
    },
    503: {
        title: "Servicio ocupado",
        message: "Nuestros motores de IA están bajo mucha carga ahora mismo.",
        suggestion: "Estamos reintentando automáticamente...",
        icon: "⏳",
        canRetry: true,
        autoRetry: true,
    },
    SAFETY: {
        title: "Contenido no permitido",
        message: "La imagen o descripción no cumple con nuestras políticas de seguridad.",
        suggestion: "Intenta con una imagen diferente",
        icon: "🚫",
        canRetry: true,
    },
    DEFAULT: {
        title: "Error inesperado",
        message: "Algo no salió como esperábamos en el procesamiento.",
        suggestion: "Si persiste, por favor contáctanos",
        icon: "❌",
        canRetry: true,
    }
};

function detectErrorType(error: any): string | number {
    const errorString = typeof error === 'string' ? error : JSON.stringify(error);
    const errorLower = errorString.toLowerCase();

    const httpMatch = errorString.match(/\b(400|401|403|404|429|500|503|504)\b/);
    if (httpMatch) return parseInt(httpMatch[1]);

    if (errorLower.includes('safety') || errorLower.includes('finish_reason: safety')) return 'SAFETY';
    if (errorLower.includes('quota') || errorLower.includes('exhausted')) return 429;

    return 'DEFAULT';
}

export function translateGeminiError(error: any) {
    const errorType = detectErrorType(error);
    const errorConfig = USER_FRIENDLY_ERRORS[errorType] || USER_FRIENDLY_ERRORS.DEFAULT;

    return {
        title: errorConfig.title,
        message: errorConfig.message,
        suggestion: errorConfig.suggestion,
        icon: errorConfig.icon,
        canRetry: errorConfig.canRetry,
        retryDelay: errorConfig.retryDelay,
        autoRetry: errorConfig.autoRetry || false,
        userAction: errorConfig.userAction,
        isSystemError: errorConfig.isSystemError || false,
        errorType: errorType,
        timestamp: new Date().toISOString()
    };
}
