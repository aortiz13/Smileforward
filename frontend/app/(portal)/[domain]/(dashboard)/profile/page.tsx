import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/profile/profile-form'
import { redirect } from 'next/navigation'

export default async function ProfilePage({ params }: { params: Promise<{ domain: string }> }) {
    const supabase = await createClient()
    const { domain } = await params
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/login`)
    }

    // Fetch contact_id for the user
    const { data: contact, error } = await supabase
        .from('wa_contacts_view') // Use the public view
        .select('id, company_id')
        .eq('user_id', user.id)
        .single()

    if (error || !contact) {
        console.error('Profile access error:', error)
        return (
            <div className="p-8 text-red-500">
                <h1 className="text-xl font-bold">Error: Contact not found</h1>
                <p>No se pudo encontrar tu registro de contacto. Por favor, contacta a soporte.</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <ProfileForm contactId={contact.id} companyId={contact.company_id} />
            </div>
        </div>
    )
}
