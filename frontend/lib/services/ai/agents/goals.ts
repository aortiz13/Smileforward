import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export class GoalsAgent {
    private model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    private systemPrompt = `
REGLAS DE PREGUNTAS (Q-BUDGET):
- Presupuesto por turno: 2 preguntas. Sube a 3 si el usuario menciona múltiples metas o falta un dato crítico (deadline o scope).
- Prioridad: (1) confirmar scope (user/company) cuando sea ambiguo, (2) completar deadline/target, (3) elevar microgoal a objetivo mayor (sugerencia no-interrogativa).
- Preguntas en viñetas, breves, en el idioma del usuario (usa language_pref si existe).
- Si el usuario ignora alguna, continúa con lo que tengas y reintenta en un turno posterior sin repetir de inmediato.

CLASIFICACIÓN DE SCOPE:
- Cada meta: scope_sugerido = "user" | "company" | "ambiguous".
- Si "ambiguous": 1 pregunta corta (consume Q-BUDGET).
- En la salida, incluye scope_final si confirmado; si no, marca scope_pending.

ELEVACIÓN (goal vs microgoal):
- Si detectas un microgoal (“publicar 3 posts esta semana”), incluye una sugerencia de objetivo mayor (“construir canal orgánico en 90 días”). La sugerencia no cuenta como pregunta.

CONSTITUCIÓN DE LA SALIDA (JSON ESTRICTO):
{
  "assistant_reply": "Mensaje para el usuario siguiendo el tono de Nova",
  "goals_patch": {
    "items": [
      {
        "title": "...",
        "scope_sugerido": "user|company|ambiguous",
        "scope_final": "user|company|null",
        "deadline": "YYYY-MM-DD|null",
        "target": "string|null",
        "krs": ["..."]|null,
        "topic_tags": ["ventas","marca_personal","wellbeing"],
        "is_microgoal": true|false,
        "elevate_suggestion": "string|null"
      }
    ]
  },
  "intent": "goals",
  "question_bundle": [{"slot":"scope_confirm|deadline|target","goal":"<title>"}],
  "q_budget": 2|3,
  "ops": [
    { "type": "update_goals", "args": { ... } }
  ]
}
`;

    async execute(message: string, context: any) {
        const prompt = `
Contexto del Usuario:
${JSON.stringify(context, null, 2)}

Mensaje del Usuario:
"${message}"

Genera una respuesta siguiendo las reglas del GoalsAgent.
`;

        const result = await this.model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            systemInstruction: this.systemPrompt,
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        try {
            const responseText = result.response.text();
            return JSON.parse(responseText);
        } catch (e) {
            console.error("GoalsAgent: Error parsing response", e);
            return {
                assistant_reply: "Lo siento, tuve un problema procesando tus metas. ¿Podrías repetirlo?",
                intent: "goals",
                ops: []
            };
        }
    }
}
