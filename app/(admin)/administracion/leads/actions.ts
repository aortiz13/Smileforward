'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deleteLeadAction(leadId: string) {
    if (!leadId) {
        return { success: false, error: 'Lead ID is required' };
    }

    try {
        const supabase = await createClient();

        // 1. Get all generations for this lead to find storage paths
        const { data: generations, error: genFetchError } = await supabase
            .from('generations')
            .select('id, input_path, output_path')
            .eq('lead_id', leadId);

        if (genFetchError) {
            console.error('Error fetching generations for deletion:', genFetchError);
            throw new Error(`Error fetching generations: ${genFetchError.message}`);
        }

        // 2. Collect storage paths to delete
        const pathsToDeleteByBucket: Record<string, string[]> = {
            'generated': [],
            'scans': [],
            'uploads': []
        };

        const addToBucket = (fullPath: string | null) => {
            if (!fullPath || fullPath === 'unknown') return;

            // Paths might be full URLs or just keys
            // If it's a URL, we need to extract the part after the bucket name
            // Common format: https://.../storage/v1/object/public/[bucket]/[path]
            let cleanPath = fullPath;
            let bucketName = '';

            if (fullPath.includes('/storage/v1/object/public/')) {
                const parts = fullPath.split('/storage/v1/object/public/');
                const bucketAndPath = parts[1];
                const bucketParts = bucketAndPath.split('/');
                bucketName = bucketParts[0];
                cleanPath = bucketParts.slice(1).join('/');
            } else {
                // If it's just a path, we might need a better heuristic or assume a default
                // Based on app/services/storage.ts, 'scans' and 'generated' are used.
                // Let's try to detect based on prefix or context if needed, 
                // but usually the DB stores either the key or the full URL.
                // Looking at LeadDetailModal.tsx line 443: src={`${supabaseUrl}/storage/v1/object/public/generated/${videoGen.output_path}`}
                // This suggests videoGen.output_path is JUST the filename/key within 'generated'.

                // If we reach here, we'll try 'generated' as default for generations outputs
                bucketName = 'generated';
            }

            if (bucketName && pathsToDeleteByBucket[bucketName]) {
                pathsToDeleteByBucket[bucketName].push(cleanPath);
            }
        };

        if (generations) {
            generations.forEach(gen => {
                // If it's just a filename (like in LeadDetailModal line 443), we know it's in 'generated'
                if (gen.output_path && !gen.output_path.includes('://')) {
                    pathsToDeleteByBucket['generated'].push(gen.output_path);
                } else {
                    addToBucket(gen.output_path);
                }

                if (gen.input_path && !gen.input_path.includes('://')) {
                    // Logic from storage.ts line 24: .from('scans').upload(filePath, file)
                    // Input paths usually go to 'scans'
                    pathsToDeleteByBucket['scans'].push(gen.input_path);
                } else {
                    addToBucket(gen.input_path);
                }
            });
        }

        // 3. Delete files from storage buckets
        for (const bucket in pathsToDeleteByBucket) {
            const files = pathsToDeleteByBucket[bucket];
            if (files.length > 0) {
                console.log(`Deleting ${files.length} files from bucket: ${bucket}`);
                const { error: storageError } = await supabase.storage.from(bucket).remove(files);
                if (storageError) {
                    console.error(`Error deleting files from ${bucket}:`, storageError);
                    // We continue even if storage deletion fails partially
                }
            }
        }

        // 4. Delete database records (Cascading logic in case DB constraints are not set to cascade)
        // analysis_results
        await supabase.from('analysis_results').delete().eq('lead_id', leadId);

        // generations
        await supabase.from('generations').delete().eq('lead_id', leadId);

        // leads
        const { error: deleteError } = await supabase
            .from('leads')
            .delete()
            .eq('id', leadId);

        if (deleteError) {
            console.error('Error deleting lead record:', deleteError);
            throw new Error(`Error deleting lead: ${deleteError.message}`);
        }

        revalidatePath('/administracion/leads');
        return { success: true };
    } catch (error: any) {
        console.error('deleteLeadAction critical error:', error);
        return { success: false, error: error.message || 'Error desconocido al eliminar' };
    }
}
