/**
 * Script to set MinIO bucket policies to public-read.
 * Run with: npx tsx scripts/setup-minio.ts
 * 
 * Requires: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY env vars
 */

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'https://smile-forward-minio.uta3hi.easypanel.host';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || '';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || '';

const PUBLIC_READ_POLICY = (bucket: string) => JSON.stringify({
    Version: "2012-10-17",
    Statement: [
        {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucket}/*`]
        }
    ]
});

async function setPublicPolicy(bucket: string) {
    // Use the S3 PutBucketPolicy API
    const url = `${MINIO_ENDPOINT}/${bucket}/?policy`;
    const policy = PUBLIC_READ_POLICY(bucket);

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(`${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}`).toString('base64'),
        },
        body: policy,
    });

    if (response.ok) {
        console.log(`✅ Bucket "${bucket}" → public-read`);
    } else {
        const text = await response.text();
        console.error(`❌ Error setting policy on "${bucket}":`, response.status, text);
    }
}

async function main() {
    if (!MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
        console.error('❌ Set MINIO_ACCESS_KEY and MINIO_SECRET_KEY env vars first');
        console.log('Usage: MINIO_ACCESS_KEY=xxx MINIO_SECRET_KEY=yyy npx tsx scripts/setup-minio.ts');
        process.exit(1);
    }

    console.log(`🔧 Configuring MinIO at ${MINIO_ENDPOINT}...`);
    await setPublicPolicy('scans');
    await setPublicPolicy('generated');
    console.log('🎉 Done!');
}

main().catch(console.error);
