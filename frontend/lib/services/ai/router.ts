import { AIContext } from './memory';

export type AgentType = 'onboarding' | 'goals' | 'business' | 'finance' | 'default';

export interface RouterDecision {
    action: 'respond' | 'route';
    target?: AgentType;
    responseText?: string;
    decision: string;
}

export class RouterService {
    private greetingPatterns = /^(hola|hi|hey|buenos días|buenas tardes|buenas noches|qué tal|cómo estás)$/i;
    private thanksPatterns = /^(gracias|muchas gracias|perfecto|ok|entendido|vale|listo|excelente|genial)$/i;
    private profilePatterns = /mi nombre es|me llamo|vivo en|soy de|mi (email|correo|ciudad|país)/i;
    private goalsPatterns = /mi meta|mi objetivo|quiero (lograr|alcanzar|conseguir)/i;
    private businessPatterns = /empresa|negocio|proyecto|vendas|marketing|producto|startup/i;
    private financePatterns = /dinero|plata|gastos|presupuesto|deuda|ahorro|inversión|finanzas/i;

    async decide(message: string, context: AIContext): Promise<RouterDecision> {
        const cleanMessage = message.trim().toLowerCase();
        const profilePercent = context.userContext?.profile_completion_percent || 0;
        const agentHint = context.userContext?.agent_hint as AgentType;
        const pushName = context.contact?.push_name || context.userContext?.preferred_name || 'Usuario';

        // 1. Greetings
        if (this.greetingPatterns.test(cleanMessage) && cleanMessage.split(' ').length <= 3) {
            if (profilePercent < 50) {
                return {
                    action: 'respond',
                    responseText: `¡Hola ${pushName}! 👋 Soy Nova, tu coach personalizado. Veo que aún no terminamos de configurar tu perfil, ¿te parece si seguimos? ¿De qué país eres?`,
                    decision: 'greeting_resume_onboarding'
                };
            }
            return {
                action: 'respond',
                responseText: `¡Hola ${pushName}! 👋 ¿En qué puedo ayudarte hoy?`,
                decision: 'greeting_complete_profile'
            };
        }

        // 2. Thanks
        if (this.thanksPatterns.test(cleanMessage)) {
            return {
                action: 'respond',
                responseText: `¡De nada! Estoy aquí cuando me necesites 😊`,
                decision: 'thanks_direct'
            };
        }

        // 3. Forced Routing by Hint (Memory)
        if (agentHint && agentHint !== 'default') {
            return {
                action: 'route',
                target: agentHint,
                decision: `route_by_hint_${agentHint}`
            };
        }

        // 4. Keyword Routing
        if (this.profilePatterns.test(cleanMessage)) {
            return { action: 'route', target: 'onboarding', decision: 'route_profile_keywords' };
        }

        if (this.goalsPatterns.test(cleanMessage)) {
            return { action: 'route', target: 'goals', decision: 'route_goals_keywords' };
        }

        if (this.businessPatterns.test(cleanMessage)) {
            return { action: 'route', target: 'business', decision: 'route_business_keywords' };
        }

        if (this.financePatterns.test(cleanMessage)) {
            return { action: 'route', target: 'finance', decision: 'route_finance_keywords' };
        }

        // 5. Default Fallback Logic
        const target = profilePercent < 50 ? 'onboarding' : 'goals';
        return {
            action: 'route',
            target: target,
            decision: `route_default_by_profile_${profilePercent}`
        };
    }
}
