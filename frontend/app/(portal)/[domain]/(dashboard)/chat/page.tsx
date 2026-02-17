import { createClient } from '../../../../../lib/supabase/server'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { ChatWindow } from '@/components/chat/chat-window'
import { redirect } from 'next/navigation'

export default async function ChatPage({ params }: { params: Promise<{ domain: string }> }) {
    const supabase = await createClient()

    const { domain: rawDomain } = await params
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/login`)
    }

    // Fetch contact_id for the user using the public view to avoid schema restrictions
    const { data: contact, error } = await supabase
        .from('wa_contacts_view')
        .select('id, company_id')
        .eq('user_id', user.id)
        .single()

    if (error || !contact) {
        console.error('Chat access error:', error)
        return (
            <div className="p-8 text-red-500">
                <h1 className="text-xl font-bold">Error: Contact not found</h1>
                <p>User ID: {user.id}</p>
                <p>Status: {error?.message || 'No record found'}</p>
                <p className="mt-4 text-gray-600">Please refresh or contact support.</p>
            </div>
        )
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* Sidebar: List of Agents */}
            <div className="w-80 border-r bg-gray-50/40">
                <ChatSidebar />
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                <ChatWindow contactId={contact.id} companyId={contact.company_id} />
            </div>
        </div>
    )
}
