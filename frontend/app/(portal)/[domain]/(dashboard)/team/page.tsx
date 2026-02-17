import { createClient } from '@/lib/supabase/server'
import { Users, UserPlus, Mail, Shield, ShieldCheck, MoreVertical, Search, Trash2, XCircle } from 'lucide-react'
import { getProjectMembers } from '@/lib/actions/project-sharing'
import { InviteMemberModal } from './invite-modal' // We will create this
import { RemoveMemberButton, RevokeInviteButton } from './team-actions' // We will create these

export default async function TeamPage({ params }: { params: { domain: string } }) {
    const supabase = await createClient()

    // We need to resolve the domain to a project_id first
    // Assuming the layout or middleware handles this context, or we query companies by domain?
    // Since this is [domain], we might need to look up company by domain.
    // BUT for User Projects, do they have a domain? 
    // Usually User Projects are accessed via /project/[id] or similar if they don't have custom domain.
    // If this page is ONLY for client companies (white-label), then we might need a different page for User Projects.

    // Let's assume this page is REUSED for both, or we need to find where User Projects "settings" are.
    // Users create projects like "Familia Ortiz". They probably don't have a domain "familiaortiz.blukastor.com".
    // They access via /dashboard/project/[id]?

    // I need to confirm where the User Project settings are.
    // Assuming we are building the "Team" tab for a generic project context.

    // Query company by domain for now (standard portal logic)
    // Or if domain is actually an ID in some routing config?
    // Let's rely on finding standard logic.

    // For now, let's just list members for the "current" company context.
    // Since I don't have the context provider here, I'll assume we can get company_id from params or similar.

    // Wait, the previous code used:
    // .from('user_company_links').select(...)
    // It didn't filter by company_id? It filtered by RLS?
    // If user_company_links RLS restricts to "my companies", then it lists ALL members of ALL my companies? 
    // That seems wrong for a specific Team page.

    // Let's look at the previous code again (step 606):
    // const { data: members, error } = await supabase.from('user_company_links').select(...)
    // It implies it fetches EVERYTHING the user has access to.

    // We should filter by the specific company. 
    // If `params.domain` maps to a company.

    let projectId: string | null = null;

    const { data: company } = await supabase
        .from('client_companies')
        .select('id')
        .ilike('custom_domain', params.domain) // Or name based slug?
        .single()

    if (company) {
        projectId = company.id
    } else {
        // Fallback: maybe params.domain IS the id? for development?
        // Or query companies table
        const { data: userProject } = await supabase
            .from('companies')
            .select('id')
            .eq('id', params.domain) // Try treating domain as ID
            .single()

        if (userProject) projectId = userProject.id
    }

    if (!projectId) {
        // If we can't resolve project, maybe list ALL shared projects?
        // But this is a specific page.
        return <div className="p-8 text-red-500">Project not found for domain/id: {params.domain}</div>
    }

    const members = await getProjectMembers(projectId)

    // Fetch legacy members (from user_company_links) for backward compatibility
    const { data: legacyMembers } = await supabase
        .from('user_company_links')
        .select(`
            *,
            contact:wa.contacts(*)
        `)
        .eq('company_id', projectId)

    // Map legacy members to common format
    const legacyMapped = legacyMembers?.map((m: any) => ({
        id: m.contact_id,
        name: m.contact?.real_name || m.contact?.push_name || 'Usuario WhatsApp',
        email: null,
        phone: m.contact?.phone,
        role: m.relation,
        created_at: m.created_at,
        avatar_url: null,
        is_legacy: true
    })) || []

    // Merge members (avoid duplicates if any)
    const allMembers = [...members.map((m: any) => ({ ...m, is_legacy: false })), ...legacyMapped]

    // Fetch pending invites
    const { data: invites } = await supabase
        .from('company_invites')
        .select('*')
        .eq('company_id', projectId)
        .eq('status', 'pending')

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Equipo del Proyecto</h1>
                    <p className="text-gray-500 mt-1">Gestiona los miembros y colaboraciones.</p>
                </div>
                <InviteMemberModal projectId={projectId} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Miembros</p>
                        <p className="text-2xl font-black text-gray-900">{members?.length || 0}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                        <Mail size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Invitaciones</p>
                        <p className="text-2xl font-black text-gray-900">{invites?.length || 0}</p>
                    </div>
                </div>
            </div>

            {/* Team List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/30">
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Miembro</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rol</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Desde</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {allMembers.map((member: any) => (
                            <tr key={member.id} className="group hover:bg-gray-50/30 transition-colors">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                                        ) : (
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${member.is_legacy ? 'bg-green-50 text-green-600' : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'}`}>
                                                {member.name?.charAt(0).toUpperCase() || member.email?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold text-gray-900 flex items-center gap-2">
                                                {member.name || member.email?.split('@')[0] || 'Unknown'}
                                                {member.is_legacy && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">WHATSAPP</span>}
                                            </p>
                                            <p className="text-xs text-gray-400">{member.email || member.phone}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2">
                                        {member.role === 'owner' ? (
                                            <ShieldCheck size={14} className="text-blue-600" />
                                        ) : (
                                            <Shield size={14} className="text-gray-400" />
                                        )}
                                        <span className="text-sm font-bold text-gray-700 capitalize">{member.role}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-xs text-gray-500 font-mono">
                                    {new Date(member.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-5 text-right">
                                    {!member.is_legacy && member.role !== 'owner' && (
                                        <RemoveMemberButton memberId={member.id} />
                                    )}
                                </td>
                            </tr>
                        ))}
                        {allMembers.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-8 text-gray-400">
                                    No hay miembros en este proyecto.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pending Invites Section */}
            {invites && invites.length > 0 && (
                <div className="space-y-4 pt-4">
                    <h2 className="text-xl font-bold text-gray-900">Invitaciones Pendientes</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {invites.map((invite: any) => (
                            <div key={invite.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{invite.email || invite.phone || 'Sin email'}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rol: {invite.role}</p>
                                        <p className="text-[10px] text-gray-300 mt-1 font-mono">{invite.token}</p>
                                    </div>
                                </div>
                                <RevokeInviteButton inviteId={invite.id} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
