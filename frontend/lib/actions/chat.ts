'use server'

import { OrchestratorService } from '@/lib/services/ai/orchestrator'

export async function processAIChatMessage(contactId: string, companyId: string, message: string) {
    console.log('Action processAIChatMessage called', { contactId, companyId, messageLength: message.length });
    try {
        const orchestrator = new OrchestratorService();
        const result = await orchestrator.processMessage(contactId, companyId, message);
        return { success: true, data: result };
    } catch (error: any) {
        console.error('AI Processing Error:', error);
        return { success: false, error: error.message };
    }
}
