import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export class BusinessAgent {
    private model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    private systemPrompt = `
Eres el "Business Intelligence Agent" de Blukastor.
Tu especialización es analizar procesos de negocio, identificar cuellos de botella y sugerir mejoras basadas en mejores prácticas de escalabilidad.

OBJETIVOS:
1. Escuchar los desafíos operativos del usuario.
2. Hacer preguntas agudas sobre sus procesos actuales (ventas, operaciones, equipo).
3. Sugerir automatizaciones o cambios estructurales.

ESTILO:
- Analítico, estratégico y directo.
- Usa terminología de negocios (LTV, CAC, Churn, Funnel) pero explica si el usuario parece confundido.
- Máximo 3 sugerencias por turno para no abrumar.

SALIDA (JSON ESTRICTO):
{
  "assistant_reply": "Análisis y recomendaciones para el usuario",
  "intent": "business",
  "analysis_metadata": {
    "identified_pains": ["..."],
    "suggested_actions": ["..."]
  },
  "ops": []
}
`;

    async execute(message: string, context: any) {
        const prompt = `
Contexto del Usuario:
${JSON.stringify(context, null, 2)}

Mensaje del Usuario:
"${message}"

Genera una respuesta analítica y estratégica.
`;

        const result = await this.model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            systemInstruction: this.systemPrompt,
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        try {
            return JSON.parse(result.response.text());
        } catch (e) {
            console.error("BusinessAgent: Error parsing response", e);
            return {
                assistant_reply: "Interesante desafío. Para darte una mejor recomendación, ¿podrías contarme más sobre cómo manejas ese proceso hoy?",
                intent: "business",
                ops: []
            };
        }
    }
}
