import { createClient } from '../../supabase/server';
import { MemoryService } from './memory';
import { RouterService } from './router';
import { OnboardingAgent } from './agents/onboarding';
import { GoalsAgent } from './agents/goals';
import { BusinessAgent } from './agents/business';
import { FinanceAgent } from './agents/finance';
import { MultimodalService } from './multimodal';
import { OperationExecutor } from './tools/executor';

export class OrchestratorService {
    constructor(private supabaseClient?: any) { }

    async processMessage(contactId: string, companyId: string, message: string, mediaData?: { type: string, base64: string, mime: string }) {
        const supabase = this.supabaseClient || await createClient();
        const memory = new MemoryService(supabase);
        const router = new RouterService();
        const multimodal = new MultimodalService();
        const executor = new OperationExecutor(supabase);

        let multimodalContext = null;
        let enhancedMessage = message;

        // 0. Prefetch Multimodal Context if media exists
        if (mediaData) {
            console.log('Orchestrator: Processing media with MultimodalService...');
            multimodalContext = await multimodal.processMedia(mediaData.type, mediaData.base64, mediaData.mime);
            console.log('Orchestrator: Multimodal context captured:', multimodalContext);

            if (multimodalContext.transcript) {
                enhancedMessage = `${message}\n[Voice Transcript]: ${multimodalContext.transcript}`;
            } else if (multimodalContext.extraction) {
                enhancedMessage = `${message}\n[Image Extraction]: ${JSON.stringify(multimodalContext.extraction)}`;
            }
        }

        // 1. Fetch Context
        console.log('Orchestrator: Fetching context...');
        const context = await memory.fetchContext(contactId, companyId);

        // 2. Decide Action (Heuristic Router)
        console.log('Orchestrator: Deciding action...');
        const decision = await router.decide(enhancedMessage, context);

        // Force routing if multimodal suggested an intent
        if (multimodalContext?.intent_hint) {
            decision.target = multimodalContext.intent_hint;
        }
        console.log('Orchestrator decision:', decision);

        if (decision.action === 'respond') {
            const responseText = decision.responseText || 'Hola, ¿en qué puedo ayudarte?';
            console.log('Orchestrator: Direct response:', responseText);
            await this.saveMessageToHistory(supabase, contactId, companyId, message, responseText);
            return { assistant_reply: responseText };
        }

        console.log('Orchestrator: Routing to agent:', decision.target);
        // 3. Route to specialized Agent
        let agentResponse;
        switch (decision.target) {
            case 'onboarding':
                agentResponse = await new OnboardingAgent().execute(message, context);
                break;
            case 'goals':
                agentResponse = await new GoalsAgent().execute(message, context);
                break;
            case 'business':
                agentResponse = await new BusinessAgent().execute(message, context);
                break;
            case 'finance':
                agentResponse = await new FinanceAgent().execute(message, context);
                break;
            default:
                // Fallback to onboarding if no specific target or unknown
                agentResponse = await new OnboardingAgent().execute(message, context);
        }

        console.log('Agent response received:', agentResponse.assistant_reply);
        // 4. Handle Ops (Tools)
        if (agentResponse.ops && agentResponse.ops.length > 0) {
            console.log('Orchestrator: Executing ops:', agentResponse.ops.length);
            await executor.execute(agentResponse.ops, contactId, companyId);
        }

        // 5. Save To Memory (Chat History)
        await this.saveMessageToHistory(supabase, contactId, companyId, message, agentResponse.assistant_reply, agentResponse);

        return agentResponse;
    }

    private async saveMessageToHistory(supabase: any, contactId: string, companyId: string, userMessage: string, assistantReply: string, meta?: any) {
        console.log('Orchestrator: Saving history via RPC...');
        try {
            const { error } = await supabase.rpc('save_ai_chat_message', {
                p_contact_id: contactId,
                p_company_id: companyId,
                p_user_message: userMessage,
                p_assistant_reply: assistantReply,
                p_metadata: meta || {},
                p_agent_type: meta?.intent || 'onboarding'
            });

            if (error) throw error;
            console.log('Orchestrator: History saved successfully via RPC');
        } catch (e) {
            console.error('Orchestrator: Error saving history:', e);
        }
    }
}
