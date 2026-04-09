'use server';

import { db } from '@/lib/db';
import { storage } from '@/lib/storage';
import { revalidatePath } from 'next/cache';

export async function deleteLeadAction(leadId: string) {
    if (!leadId) {
        return { success: false, error: 'Lead ID is required' };
    }

    try {
        // 1. Get all generations for this lead to find storage paths
        const genResult = await db.query(
            'SELECT id, input_path, output_path FROM generations WHERE lead_id = $1',
            [leadId]
        );
        const generations = genResult.rows;

        // 2. Collect storage paths to delete
        const pathsToDeleteByBucket: Record<string, string[]> = {
            'generated': [],
            'scans': [],
            'uploads': []
        };

        const addToBucket = (fullPath: string | null) => {
            if (!fullPath || fullPath === 'unknown') return;

            let cleanPath = fullPath;
            let bucketName = '';

            if (fullPath.includes('/storage/v1/object/public/')) {
                const parts = fullPath.split('/storage/v1/object/public/');
                const bucketAndPath = parts[1];
                const bucketParts = bucketAndPath.split('/');
                bucketName = bucketParts[0];
                cleanPath = bucketParts.slice(1).join('/');
            } else if (fullPath.includes('://')) {
                // Full URL from MinIO — extract key from path
                try {
                    const urlObj = new URL(fullPath);
                    const pathParts = urlObj.pathname.split('/').filter(Boolean);
                    if (pathParts.length >= 2) {
                        bucketName = pathParts[0];
                        cleanPath = pathParts.slice(1).join('/');
                    }
                } catch {
                    bucketName = 'generated';
                }
            } else {
                bucketName = 'generated';
            }

            if (bucketName && pathsToDeleteByBucket[bucketName]) {
                pathsToDeleteByBucket[bucketName].push(cleanPath);
            }
        };

        if (generations) {
            generations.forEach((gen: any) => {
                if (gen.output_path && !gen.output_path.includes('://')) {
                    pathsToDeleteByBucket['generated'].push(gen.output_path);
                } else {
                    addToBucket(gen.output_path);
                }

                if (gen.input_path && !gen.input_path.includes('://')) {
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
                try {
                    await storage.deleteFiles(bucket, files);
                } catch (storageError) {
                    console.error(`Error deleting files from ${bucket}:`, storageError);
                    // Continue even if storage deletion fails partially
                }
            }
        }

        // 4. Delete database records (CASCADE handles most of this, but be explicit)
        await db.query('DELETE FROM analysis_results WHERE lead_id = $1', [leadId]);
        await db.query('DELETE FROM generations WHERE lead_id = $1', [leadId]);
        await db.query('DELETE FROM leads WHERE id = $1', [leadId]);

        revalidatePath('/administracion/leads');
        return { success: true };
    } catch (error: any) {
        console.error('deleteLeadAction critical error:', error);
        return { success: false, error: error.message || 'Error desconocido al eliminar' };
    }
}
