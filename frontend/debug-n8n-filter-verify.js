
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMWY4OTk3Ny04ZjhjLTQ1NzEtYTYwNC0yM2MwOTYxMGE0MjAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcwNDk2Mjk3fQ.9SH4QQpQrHVqld2dtWmokSL36XY869joxeI8bkQwghQ';
const apiUrl = 'https://workflow.remax-exclusive.cl/api/v1';
const tagId = 'XmLOpjNMQk8o5AMf'; // Diana

async function check() {
    console.log(`--- Verifying Filter for Tag ID: ${tagId} ---`);

    try {
        // 1. Test filtering via API Query Param
        console.log('\n--- Test 1: GET /workflows?tags=' + tagId);
        const resQuery = await fetch(`${apiUrl}/workflows?tags=${tagId}`, {
            headers: { 'X-N8N-API-KEY': apiKey }
        });

        if (resQuery.ok) {
            const data = await resQuery.json();
            const workflows = data.data || data;
            console.log(`API returned ${workflows.length} workflows.`);
            if (workflows.length > 0) {
                console.log('First match:', workflows[0].name);
            }
        } else {
            console.log('API Request failed:', resQuery.status);
        }

        // 2. Fetch ALL and check tags manually (to see if we need client-side filtering)
        console.log('\n--- Test 2: Fetch ALL and check tags manually ---');
        // Note: we might need specific params to include tags?
        const resAll = await fetch(`${apiUrl}/workflows?active=true&limit=100`, {
            headers: { 'X-N8N-API-KEY': apiKey }
        });

        if (resAll.ok) {
            const dataAll = await resAll.json();
            const allWorkflows = dataAll.data || dataAll.data; // n8n response structure check
            console.log(`Fetched ${allWorkflows.length} total workflows.`);

            // Print tags of first few to debug structure
            // console.log('First workflow structure:', JSON.stringify(allWorkflows[0], null, 2));

            const manualMatches = allWorkflows.filter(w => {
                if (!w.tags) return false;
                // Check if tags is array of objects or strings
                return w.tags.some(t => {
                    const tId = typeof t === 'object' ? t.id : t;
                    return tId === tagId;
                });
            });

            console.log(`Manually found ${manualMatches.length} workflows with tag ID ${tagId}.`);
            if (manualMatches.length > 0) {
                console.log('First manual match:', manualMatches[0].name);
                console.log('Its tags:', JSON.stringify(manualMatches[0].tags));
            }
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

check();
