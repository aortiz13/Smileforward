'use server'

import { createServiceClient } from '../supabase/service'
import { revalidatePath } from 'next/cache'

export async function updateCompanySettings(companyId: string, data: { currency: string }) {
    const adminDb = createServiceClient()

    const { error } = await adminDb
        .from('companies')
        .update({ currency: data.currency })
        .eq('id', companyId)

    if (error) {
        console.error('Error updating company settings:', error)
        return { error: 'Failed to update settings' }
    }

    revalidatePath('/settings')
    revalidatePath('/finance') // Revalidate finance dashboard too
    return { success: true }
}
