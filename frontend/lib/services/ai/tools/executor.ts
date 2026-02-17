import { SupabaseClient } from '@supabase/supabase-js';

export class OperationExecutor {
    constructor(private supabase: SupabaseClient) { }

    async execute(ops: any[], contactId: string, companyId: string) {
        for (const op of ops) {
            if (op.op === 'call') {
                const { path, args } = op;
                console.log(`Executing tool: ${path}`, args);

                switch (path) {
                    case 'update_user_context':
                        await this.updateUserContext(contactId, companyId, args);
                        break;
                    // Add other tools here (update_goals, update_tasks, etc.)
                    default:
                        console.warn(`Unknown tool path: ${path}`);
                }
            }
        }
    }

    private async updateUserContext(contactId: string, companyId: string, args: any) {
        // 1. Update wa.contacts profile if applicable
        const contactUpdates: any = {};
        if (args.real_name) contactUpdates.real_name = args.real_name;
        if (args.nickname) contactUpdates.nickname = args.nickname;

        // Handle email in notes or custom field if needed
        if (args.email) {
            const { data: contact } = await this.supabase.schema('wa').from('contacts').select('notes').eq('id', contactId).single();
            const currentNotes = contact?.notes || '';
            if (!currentNotes.includes(args.email)) {
                contactUpdates.notes = (currentNotes + `\nEmail: ${args.email}`).trim();
            }
        }

        if (Object.keys(contactUpdates).length > 0) {
            console.log('Executor: Updating wa.contacts', contactUpdates);
            const { error } = await this.supabase.schema('wa').from('contacts').update(contactUpdates).eq('id', contactId);
            if (error) console.error('Executor: Error updating wa.contacts', error);
        }

        // 2. Update public.user_context via RPC (to bypass RLS)
        console.log('Executor: Upserting user_context via RPC', args);
        const { error: rpcError } = await this.supabase.rpc('upsert_user_context', {
            p_contact_id: contactId,
            p_company_id: companyId,
            p_profile: args
        });

        if (rpcError) {
            console.error('Executor: Error calling upsert_user_context RPC', rpcError);
        } else {
            console.log('Executor: user_context updated successfully');
        }
    }
}
