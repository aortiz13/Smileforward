'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface AgentPromptEditorProps {
    companyId: string
    agent: {
        key: string
        name: string
        description: string
        icon: string
        color: string
    }
    initialVariant?: {
        system_prompt?: string | null
        user_prompt_template?: string | null
    } | null
}

export function AgentPromptEditor({ companyId, agent, initialVariant }: AgentPromptEditorProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [systemPrompt, setSystemPrompt] = useState(initialVariant?.system_prompt || '')
    const [userPromptTemplate, setUserPromptTemplate] = useState(initialVariant?.user_prompt_template || '')

    const hasCustomPrompt = !!initialVariant

    const handleSave = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/companies/${companyId}/agents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_key: agent.key,
                    system_prompt: systemPrompt,
                    user_prompt_template: userPromptTemplate
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            router.refresh()
            alert('Prompts guardados exitosamente')
        } catch (error: any) {
            alert(`Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleRestore = async () => {
        if (!confirm('¿Estás seguro de que quieres restaurar los prompts por defecto? Esto eliminará la personalización.')) {
            return
        }

        setLoading(true)
        try {
            const res = await fetch(`/api/admin/companies/${companyId}/agents?agent_key=${agent.key}`, {
                method: 'DELETE'
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            router.refresh()
            alert('Prompts restaurados a valores por defecto')
        } catch (error: any) {
            alert(`Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className={`bg-${agent.color}-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{agent.icon}</span>
                    <div>
                        <h2 className="text-xl font-black text-gray-900">{agent.name}</h2>
                        <p className="text-sm text-gray-600">{agent.description}</p>
                    </div>
                </div>
                {hasCustomPrompt && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        Personalizado
                    </span>
                )}
            </div>

            <div className="p-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            System Prompt
                        </label>
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="Escribe el system prompt personalizado para este agente..."
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            User Prompt Template
                        </label>
                        <textarea
                            value={userPromptTemplate}
                            onChange={(e) => setUserPromptTemplate(e.target.value)}
                            placeholder="Escribe el user prompt template personalizado..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-1 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Guardar Cambios
                        </button>
                        {hasCustomPrompt && (
                            <button
                                onClick={handleRestore}
                                disabled={loading}
                                className="px-6 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                Restaurar Default
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
