import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export class MultimodalService {
    private model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    async processMedia(mediaType: string, base64Data: string, mimeType: string) {
        console.log(`MultimodalService: Processing ${mediaType} (${mimeType})...`);

        const prompt = this.getPromptForMediaType(mediaType);

        try {
            const result = await this.model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType
                    }
                }
            ]);

            const response = await result.response;
            const text = response.text();

            console.log("MultimodalService result:", text);

            try {
                return JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
            } catch (e) {
                return { text_extraction: text };
            }
        } catch (error) {
            console.error("MultimodalService Error:", error);
            throw error;
        }
    }

    private getPromptForMediaType(mediaType: string): string {
        if (mediaType === 'image') {
            return `Act more as a specialized accountant and operations manager. 
            Extract data from this image (receipt, invoice, or document).
            Return a JSON object with:
            {
              "type": "receipt" | "document" | "other",
              "extraction": {
                "amount": number,
                "currency": string,
                "vendor": string,
                "date": string (ISO),
                "items": [ { "description": string, "price": number } ],
                "summary": string
              },
              "intent_hint": "finance" | "business" | "other"
            }
            Only return the JSON.`;
        }

        if (mediaType === 'audio') {
            return `Extract the transcript and identify the intent.
            Return a JSON object with:
            {
              "transcript": string,
              "intent_hint": "goals" | "finance" | "business" | "other",
              "summary": string
            }
            Only return the JSON.`;
        }

        return "Describe concisely what you see or hear. Return JSON: { \"description\": string }";
    }
}
