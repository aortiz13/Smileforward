import { SupabaseClient } from '@supabase/supabase-js'

export interface AIContext {
    contact: any;
    userContext: any;
    company: any;
    companyContext: any;
    goals: any[];
    memorySnapshot: any;
    recentHistory: any[];
}

export class MemoryService {
    constructor(private supabase: SupabaseClient) { }

    async fetchContext(contactId: string, companyId: string): Promise<AIContext> {
        console.log(`Fetching context via RPC for contact: ${contactId}, company: ${companyId}`);

        const { data, error } = await this.supabase.rpc('get_ai_context', {
            p_contact_id: contactId,
            p_company_id: companyId
        });

        if (error) {
            console.error('Error fetching AI context via RPC:', error);
            // Return empty context on error to avoid crashing
            return {
                contact: null,
                userContext: null,
                company: null,
                companyContext: null,
                goals: [],
                memorySnapshot: null,
                recentHistory: []
            };
        }

        console.log('Context fetched via RPC successfully');

        return {
            contact: data.contact,
            userContext: data.user_context,
            company: data.company,
            companyContext: null, // Future: could add to RPC if needed
            goals: [], // Future: could add to RPC if needed
            memorySnapshot: null,
            recentHistory: data.history ? data.history.reverse() : []
        };
    }
}
