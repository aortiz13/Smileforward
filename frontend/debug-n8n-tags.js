
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMWY4OTk3Ny04ZjhjLTQ1NzEtYTYwNC0yM2MwOTYxMGE0MjAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcwNDk2Mjk3fQ.9SH4QQpQrHVqld2dtWmokSL36XY869joxeI8bkQwghQ';
const apiUrl = 'https://workflow.remax-exclusive.cl/api/v1';

async function check() {
    console.log('--- Searching for "Diana" tag ---');

    try {
        console.log('\n--- Fetching All Tags ---');
        const resTags = await fetch(`${apiUrl}/tags`, {
            headers: { 'X-N8N-API-KEY': apiKey }
        });

        if (resTags.ok) {
            const tagsData = await resTags.json();
            const tags = tagsData.data || tagsData;
            console.log(`Fetched ${tags.length} tags.`);
            // console.log('first 5 tags:', JSON.stringify(tags.slice(0, 5), null, 2));

            const targetName = 'Diana';
            // Case-insensitive check
            const match = tags.find(t => t.name.toLowerCase() === targetName.toLowerCase());
            if (match) {
                console.log(`\nSUCCESS: Found tag '${match.name}'!`);
                console.log(`Tag ID: ${match.id}`);
            } else {
                console.log(`\nTag '${targetName}' NOT found in tags list. Available tags names:`, tags.map(t => t.name).join(', '));
            }
        } else {
            console.log('Failed to fetch tags:', resTags.status);
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

check();
