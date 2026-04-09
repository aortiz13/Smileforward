/**
 * API Route: Cleanup Storage
 * Converted from Supabase Edge Function: cleanup-storage
 * 
 * Deletes files older than 24 hours from the 'uploads' bucket.
 * Should be called via a cron job / scheduled task.
 */
import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function POST(req: NextRequest) {
    try {
        // Simple auth check
        const authHeader = req.headers.get('Authorization');
        const expectedToken = process.env.CRON_SECRET || process.env.API_SECRET;

        if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // List files in uploads bucket
        const files = await storage.listFiles('uploads', undefined, 100);

        const now = new Date();
        const filesToDelete: string[] = [];

        for (const file of files) {
            if (file.key === '.emptyFolderPlaceholder') continue;

            if (file.lastModified) {
                const diffHours = (now.getTime() - file.lastModified.getTime()) / (1000 * 60 * 60);
                if (diffHours > 24) {
                    filesToDelete.push(file.key);
                }
            }
        }

        if (filesToDelete.length > 0) {
            await storage.deleteFiles('uploads', filesToDelete);
            return NextResponse.json({
                message: `Deleted ${filesToDelete.length} files.`,
            });
        }

        return NextResponse.json({ message: 'No files to delete.' });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 400 }
        );
    }
}
