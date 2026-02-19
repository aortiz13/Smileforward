/**
 * Sistema de traducción de errores de Gemini API a mensajes user-friendly
 * que NO revelan que estás usando Google/Gemini
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
    // ===== ERRORES HTTP =====
    400: {
        title: "Solicitud no válida",
        message: "No pudimos procesar tu solicitud. Por favor, intenta reformular tu descripción.",
        suggestion: "Usa un lenguaje más claro y descriptivo",
        icon: "⚠️",
        canRetry: true,
        retryDelay: 2000,
        userAction: "modify_prompt"
    },

    401: {
        title: "Error de configuración",
        message: "Estamos experimentando problemas técnicos. Nuestro equipo ya fue notificado.",
        suggestion: null,
        icon: "🔧",
        canRetry: false,
        isSystemError: true,
        userAction: "contact_support"
    },

    403: {
        title: "Acceso restringido",
        message: "Este servicio no está disponible en tu región actualmente.",
        suggestion: "Contáctanos para más información",
        icon: "🌍",
        canRetry: false,
        userAction: "contact_support"
    },

    404: {
        title: "Servicio no disponible",
        message: "El servicio de generación está temporalmente fuera de línea.",
        suggestion: "Por favor, inténtalo más tarde",
        icon: "🔌",
        canRetry: true,
        retryDelay: 30000
    },

    429: {
        title: "Demasiadas solicitudes",
        message: "Has generado muchas imágenes recientemente. Tómate un breve descanso.",
        suggestion: "Espera unos segundos antes de continuar",
        icon: "⏱️",
        canRetry: true,
        retryDelay: 10000,
        userAction: "wait"
    },

    500: {
        title: "Error del servidor",
        message: "Algo salió mal de nuestro lado. Por favor, intenta nuevamente.",
        suggestion: null,
        icon: "⚠️",
        canRetry: true,
        retryDelay: 5000
    },

    503: {
        title: "Servicio temporalmente ocupado",
        message: "Estamos procesando muchas solicitudes. Inténtalo en unos segundos.",
        suggestion: "Este suele ser un problema temporal",
        icon: "⏳",
        canRetry: true,
        retryDelay: 8000,
        autoRetry: true
    },

    504: {
        title: "Tiempo de espera agotado",
        message: "La generación está tomando más tiempo del esperado.",
        suggestion: "Intenta con una descripción más simple",
        icon: "⏱️",
        canRetry: true,
        retryDelay: 3000
    },

    // ===== FINISH REASONS (Errores de contenido) =====
    SAFETY: {
        title: "Contenido no permitido",
        message: "Tu descripción contiene elementos que no podemos procesar por nuestras políticas de uso.",
        suggestion: "Intenta con una descripción diferente y apropiada",
        icon: "🚫",
        canRetry: true,
        retryDelay: 0,
        userAction: "modify_prompt"
    },

    RECITATION: {
        title: "Descripción muy específica",
        message: "Tu descripción es demasiado específica. Intenta ser más creativo y original.",
        suggestion: "Reformula tu idea con tus propias palabras",
        icon: "✏️",
        canRetry: true,
        retryDelay: 0,
        userAction: "modify_prompt"
    },

    OTHER: {
        title: "Contenido no soportado",
        message: "No podemos procesar esta solicitud según nuestros términos de uso.",
        suggestion: "Intenta con un concepto diferente",
        icon: "🚫",
        canRetry: false,
        userAction: "modify_prompt"
    },

    BLOCKLIST: {
        title: "Términos no permitidos",
        message: "Tu descripción contiene términos que no podemos procesar.",
        suggestion: "Reformula evitando términos sensibles",
        icon: "🚫",
        canRetry: true,
        retryDelay: 0,
        userAction: "modify_prompt"
    },

    PROHIBITED_CONTENT: {
        title: "Contenido prohibido",
        message: "Esta solicitud no cumple con nuestras políticas de contenido.",
        suggestion: "Por favor, mantén tus descripciones apropiadas",
        icon: "⛔",
        canRetry: false,
        userAction: "modify_prompt"
    },

    SPII: {
        title: "Información sensible detectada",
        message: "Tu descripción contiene información personal o sensible.",
        suggestion: "Evita incluir datos personales específicos",
        icon: "🔒",
        canRetry: true,
        retryDelay: 0,
        userAction: "modify_prompt"
    },

    // ===== ERRORES ESPECIALES =====
    RESOURCE_EXHAUSTED: {
        title: "Límite alcanzado",
        message: "Has alcanzado tu límite de generaciones. Por favor, espera un momento.",
        suggestion: "Disponible nuevamente en breve",
        icon: "📊",
        canRetry: true,
        retryDelay: 15000,
        userAction: "wait"
    },

    TIMEOUT: {
        title: "Tiempo agotado",
        message: "La generación tomó demasiado tiempo. Intenta con algo más simple.",
        suggestion: null,
        icon: "⏰",
        canRetry: true,
        retryDelay: 3000
    },

    NETWORK_ERROR: {
        title: "Error de conexión",
        message: "No pudimos conectar con el servidor. Verifica tu conexión.",
        suggestion: null,
        icon: "📡",
        canRetry: true,
        retryDelay: 5000
    },

    // Default fallback
    DEFAULT: {
        title: "Error inesperado",
        message: "Algo no salió como esperábamos. Por favor, intenta nuevamente.",
        suggestion: "Si el problema persiste, contáctanos",
        icon: "❌",
        canRetry: true,
        retryDelay: 5000
    }
};

function detectErrorType(error: any): string | number {
    const errorString = typeof error === 'string' ? error : JSON.stringify(error);
    const errorLower = errorString.toLowerCase();

    const httpMatch = errorString.match(/\b(400|401|403|404|429|500|503|504)\b/);
    if (httpMatch) {
        return parseInt(httpMatch[1]);
    }

    if (errorLower.includes('finish_reason') || errorLower.includes('finishreason')) {
        if (errorLower.includes('safety')) return 'SAFETY';
        if (errorLower.includes('recitation')) return 'RECITATION';
        if (errorLower.includes('blocklist')) return 'BLOCKLIST';
        if (errorLower.includes('prohibited')) return 'PROHIBITED_CONTENT';
        if (errorLower.includes('spii')) return 'SPII';
        if (errorLower.includes('other')) return 'OTHER';
    }

    if (errorLower.includes('high demand') || errorLower.includes('unavailable')) {
        return 503;
    }
    if (errorLower.includes('rate limit') || errorLower.includes('quota') ||
        errorLower.includes('resource exhausted') || errorLower.includes('resource has been exhausted')) {
        return 429;
    }
    if (errorLower.includes('unauthorized') || errorLower.includes('api key')) {
        return 401;
    }
    if (errorLower.includes('permission denied') || errorLower.includes('access restricted')) {
        return 403;
    }
    if (errorLower.includes('invalid') || errorLower.includes('bad request')) {
        return 400;
    }
    if (errorLower.includes('timeout') || errorLower.includes('deadline')) {
        return 'TIMEOUT';
    }
    if (errorLower.includes('network') || errorLower.includes('fetch')) {
        return 'NETWORK_ERROR';
    }
    if (errorLower.includes('blocked due to safety')) {
        return 'SAFETY';
    }
    if (errorLower.includes('blocked due to recitation')) {
        return 'RECITATION';
    }

    return 'DEFAULT';
}

export function translateGeminiError(error: any) {
    const errorType = detectErrorType(error);
    const errorConfig = USER_FRIENDLY_ERRORS[errorType] || USER_FRIENDLY_ERRORS.DEFAULT;

    if (typeof window === 'undefined' || process.env.NODE_ENV === 'development') {
        console.error('[Gemini Error - Internal]', {
            type: errorType,
            original: error,
            timestamp: new Date().toISOString()
        });
    }

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
        errorType: errorType
    };
}

export function handleGeminiResponse(response: any) {
    if (!response || !response.candidates || response.candidates.length === 0) {
        return translateGeminiError('No response from API');
    }

    const candidate = response.candidates[0];

    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        return translateGeminiError(candidate.finishReason);
    }

    return {
        success: true,
        content: candidate.content
    };
}

export default {
    translate: translateGeminiError,
    handleResponse: handleGeminiResponse,
    USER_FRIENDLY_ERRORS
};
