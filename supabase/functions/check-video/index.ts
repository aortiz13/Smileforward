import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders, status: 200 })
    }

    try {
        const { generation_id } = await req.json()
        if (!generation_id) throw new Error('Generation ID is required')

        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Fetch Generation Info
        const { data: gen, error: genError } = await supabase
            .from('generations')
            .select('*')
            .eq('id', generation_id)
            .single()

        if (genError || !gen) throw new Error('Generation record not found')

        // If already completed, return data
        if (gen.status === 'completed') return new Response(JSON.stringify(gen), { headers: corsHeaders })

        const operationName = gen.metadata?.operation_name

        // If still initializing or missing operation name, it's still "pending" from the client perspective
        if (gen.status === 'initializing' || !operationName) {
            return new Response(JSON.stringify({ status: 'pending', id: generation_id, message: 'Initializing generation...' }), { headers: corsHeaders })
        }

        // 2. Check Operation Status with Google
        const apiKey = Deno.env.get('GOOGLE_API_KEY')
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`

        const response = await fetch(endpoint)
        if (!response.ok) throw new Error(`Google API Error: ${await response.text()}`)

        const operation = await response.json()

        // 3. Handle Result
        if (operation.done) {
            if (operation.error) {
                await supabase.from('generations').update({ status: 'error', metadata: { ...gen.metadata, error: operation.error } }).eq('id', generation_id)
                throw new Error(`Generation failed: ${operation.error.message}`)
            }

            // Check for Safety Filters
            const genResponse = operation.response?.generateVideoResponse || operation.response
            if (genResponse?.raiMediaFilteredReasons?.length > 0) {
                const reason = genResponse.raiMediaFilteredReasons.join(', ');
                console.log(`Generation filtered: ${reason}`);
                await supabase.from('generations')
                    .update({
                        status: 'failed',
                        metadata: { ...gen.metadata, error: { message: reason, code: 'RAI_FILTERED' } }
                    })
                    .eq('id', generation_id);

                // Return the failed record so client knows
                return new Response(JSON.stringify({
                    status: 'failed',
                    error: reason
                }), { headers: corsHeaders });
            }

            // Support both old and new generatedSamples structure
            const videoData = operation.response?.videos?.[0]
                || genResponse?.videos?.[0]
                || genResponse?.video
                || genResponse?.generatedSamples?.[0]?.video

            if (!videoData) {
                // Return structure in error to see what we got
                throw new Error(`No video found. Structure: ${JSON.stringify(operation)}`)
            }

            // 4. Upload to Supabase Storage
            // Get data. If URI, fetch. If bytes, decode.
            let videoBlob: Blob;
            if (videoData.uri) {
                // Ensure we have the API Key
                const downloadUrl = new URL(videoData.uri);
                downloadUrl.searchParams.set('key', apiKey || '');

                const vidRes = await fetch(downloadUrl.toString());
                if (!vidRes.ok) throw new Error(`Failed to download video: ${await vidRes.text()}`);

                videoBlob = await vidRes.blob();
            } else if (videoData.bytesBase64) {
                const binary = atob(videoData.bytesBase64)
                const array = new Uint8Array(binary.length)
                for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
                videoBlob = new Blob([array], { type: 'video/mp4' })
            } else {
                console.log("Unknown video data structure:", videoData)
                throw new Error('Unsupported video data format')
            }

            const fileName = `video_${generation_id}.mp4`
            const filePath = `videos/${fileName}`
            const { error: uploadError } = await supabase.storage
                .from('generated')
                .upload(filePath, videoBlob, { contentType: 'video/mp4', upsert: true })

            if (uploadError) throw uploadError

            // 5. Update Database
            const { data: updatedGen, error: updateError } = await supabase
                .from('generations')
                .update({
                    status: 'completed',
                    output_path: filePath
                })
                .eq('id', generation_id)
                .select()
                .single()

            if (updateError) throw updateError

            return new Response(JSON.stringify(updatedGen), { headers: corsHeaders })
        }

        // Still pending
        return new Response(JSON.stringify({ status: 'pending', id: generation_id }), { headers: corsHeaders })

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
