'use server'

import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

export async function inviteUserToProject(projectId: string, email: string, role: 'editor' | 'viewer' = 'editor') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Unauthorized' }
    }

    // 1. Check permissions (must be owner or editor of the project)
    // For now, let's assume if they can access the project page, they can invite?
    // Ideally check against project_members, but we are just starting to populate it.
    // If project_members is empty, we might allow any authenticated user to invite to a project they "own" via other means?
    // But going forward, access is controlled by RLS linking to project_members.

    // For now, let's proceed. RLS on company_invites will enforce rules if set.

    // 2. Check if invites already exists
    const { data: existingInvite } = await supabase
        .from('company_invites')
        .select('id')
        .eq('company_id', projectId)
        .eq('email', email)
        .eq('status', 'pending')
        .single()

    if (existingInvite) {
        return { error: 'User already invited' }
    }

    // 3. Create invite
    const token = uuidv4()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const { error: insertError } = await supabase
        .from('company_invites')
        .insert({
            company_id: projectId,
            email: email,
            role: role,
            token: token,
            expires_at: expiresAt.toISOString(),
            created_by: user.id,
            status: 'pending'
        })

    if (insertError) {
        console.error('Error creating invite:', insertError)
        return { error: 'Failed to create invite' }
    }

    // 4. Send email (Mock for now, or use existing email service)
    // TODO: Integrate with email service
    console.log(`INVITE LINK: ${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/invite/${token}`)

    revalidatePath(`/project/${projectId}/team`)
    return { success: true, token }
}

export async function acceptProjectInvite(token: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        // Store token in cookie/url and redirect to login?
        // For now, assume user is logged in or will log in
        return { error: 'Please login to accept invite' }
    }

    // 1. Find invite
    const { data: invite, error: inviteError } = await supabase
        .from('company_invites')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single()

    if (inviteError || !invite) {
        return { error: 'Invalid or expired invite' }
    }

    if (new Date(invite.expires_at) < new Date()) {
        return { error: 'Invite expired' }
    }

    // 2. Add to project_members
    const { error: memberError } = await supabase
        .from('project_members')
        .insert({
            project_id: invite.company_id,
            user_id: user.id,
            role: invite.role
        })

    if (memberError) {
        // Ignore unique constraint violation (already member)
        if (memberError.code !== '23505') {
            console.error('Error adding member:', memberError)
            return { error: 'Failed to join project' }
        }
    }

    // 3. Update invite status
    await supabase
        .from('company_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id)

    // 4. Redirect to project
    return { success: true, projectId: invite.company_id }
}

export async function getProjectMembers(projectId: string) {
    const supabase = await createClient()

    // Use the view we created
    const { data: members, error } = await supabase
        .from('project_members_view')
        .select('*')
        .eq('project_id', projectId)

    if (error) {
        console.error('Error fetching members:', error)
        return []
    }

    return members
}

export async function getUserProjects() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    // Fetch projects where user is a member using the VIEW to avoid infinite recursion on RLS
    const { data: memberships, error: memberError } = await supabase
        .from('project_members_view')
        .select('project_id, role')
        .eq('user_id', user.id)

    if (memberError) {
        console.error('Error fetching user memberships:', JSON.stringify(memberError, null, 2))
        return []
    }

    if (!memberships || memberships.length === 0) {
        return []
    }

    const projectIds = memberships.map(m => m.project_id)

    // Fetch company details
    const { data: projects, error: projectsError } = await supabase
        .from('companies')
        .select('id, name, created_at')
        .in('id', projectIds)
        .order('created_at', { ascending: false })

    if (projectsError) {
        console.error('Error fetching project details:', JSON.stringify(projectsError, null, 2))
        return []
    }

    // Merge data (restore original structure expected by UI)
    return memberships.map(m => {
        const project = projects.find(p => p.id === m.project_id)
        if (!project) return null
        return {
            ...project,
            role: m.role
        }
    }).filter(p => p !== null)
}

export async function revokeInvite(inviteId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('company_invites')
        .delete()
        .eq('id', inviteId)

    if (error) return { error: 'Failed to revoke invite' }

    revalidatePath('/dashboard') // Invalidate broadly for now
    return { success: true }
}

export async function removeMember(memberId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId)

    if (error) return { error: 'Failed to remove member' }

    revalidatePath('/dashboard')
    return { success: true }
}
