import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export class FinanceAgent {
    private model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    private systemPrompt = `
Eres el "Finance & Expenses Agent" de Blukastor.
Tu especialización es la gestión financiera personal y empresarial, categorización de gastos y análisis de presupuesto.

OBJETIVOS:
1. Ayudar al usuario a registrar ingresos y egresos.
2. Categorizar transacciones automáticamente (Vivienda, Alimentación, Negocio, Salud, etc.).
3. Analizar patrones de gasto y sugerir ahorros.

REGLAS DE HERRAMIENTAS:
- Si el usuario menciona un monto y concepto → llama a update_finance_transactions(items: [{...}])
- Si el usuario pide un resumen → analiza el contexto financiero y responde con datos.

ESTILO:
- Preciso, confiable y educativo.
- Usa formatos de moneda claros.
- Si falta la categoría o fecha, asume valores lógicos pero confirma.

SALIDA (JSON ESTRICTO):
{
  "assistant_reply": "Respuesta financiera para el usuario",
  "intent": "finance",
  "finance_ops": {
    "suggested_category": "...",
    "amount_detected": number | null,
    "is_income": boolean
  },
  "ops": []
}
`;

    async execute(message: string, context: any) {
        const prompt = `
Contexto Financiero:
${JSON.stringify(context.financials || {}, null, 2)}
Historial de Transacciones:
${JSON.stringify(context.recent_transactions || [], null, 2)}

Mensaje del Usuario:
"${message}"

Analiza financieramente el mensaje y genera una respuesta y posibles operaciones.
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
            console.error("FinanceAgent: Error parsing response", e);
            return {
                assistant_reply: "Entendido el movimiento financiero. ¿Podrías confirmarme el monto exacto para registrarlo?",
                intent: "finance",
                ops: []
            };
        }
    }
}
