
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const n8nUrl = envConfig.N8N_API_URL;
const n8nKey = envConfig.N8N_API_KEY;

console.log('--- Debug Executions Script ---');
console.log('URL:', n8nUrl);

async function testExecutions() {
    try {
        const workflowId = 'EhrzM6AWss83YQoC'; // ID from previous run
        console.log('Fetching:', `${n8nUrl}/api/v1/executions?limit=5&workflowId=${workflowId}`);
        const response = await fetch(`${n8nUrl}/api/v1/executions?limit=5&workflowId=${workflowId}`, {
            headers: {
                'X-N8N-API-KEY': n8nKey
            }
        });

        console.log('Status:', response.status);
        const json = await response.json();
        console.log('JSON Keys:', Object.keys(json));

        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            console.log('First Execution Sample:', JSON.stringify(json.data[0], null, 2));
        } else {
            console.log('No executions found in "data" property.');
            console.log('Full JSON:', JSON.stringify(json, null, 2));
        }

    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

testExecutions();
