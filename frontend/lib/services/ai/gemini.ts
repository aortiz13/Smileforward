export interface GeminiResponse {
    assistant_reply: string;
    intent: string;
    confidence: number;
    ops: any[];
    next_agent_hint?: string | null;
    meta: {
        provider: string;
        model: string;
        tokens_used: number;
    };
}

export class GeminiService {
    private apiKey: string;
    private endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || '';
    }

    async generate(systemMessage: string, userMessage: string, history: any[] = []): Promise<GeminiResponse> {
        if (!this.apiKey) {
            throw new Error('GEMINI_API_KEY is not defined in environment variables.');
        }

        // Format history according to Gemini requirements (assistant -> model)
        const contents = [
            ...history.map(h => ({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.content }]
            })),
            { role: 'user', parts: [{ text: userMessage }] }
        ];

        console.log(`Gemini: Sending request with ${history.length} history messages.`);

        const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemMessage }]
                },
                contents,
                generationConfig: {
                    temperature: 0.1, // Lower temperature for more deterministic JSON
                    topP: 1,
                    maxOutputTokens: 2048,
                    responseMimeType: 'application/json'
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gemini API Error: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('Empty response from Gemini');
        }

        try {
            // Clean up markdown code blocks if necessary
            const jsonString = text.replace(/```json\n?|```/g, '').trim();
            return JSON.parse(jsonString);
        } catch (e) {
            console.error('Failed to parse Gemini response as JSON:', text);
            throw new Error('Invalid JSON response from Gemini');
        }
    }
}
