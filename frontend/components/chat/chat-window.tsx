'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'
import { Send, Loader2, PlusCircle } from 'lucide-react'
import { processAIChatMessage } from '@/lib/actions/chat'

interface Message {
    id: string
    content: string
    role: 'user' | 'system' | 'assistant'
    created_at: string
    agent_type?: string
}

export function ChatWindow({ contactId, companyId }: { contactId: string, companyId: string }) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const supabase = createClient()
    const scrollRef = useRef<HTMLDivElement>(null)

    // Fetch initial messages and subscribe
    useEffect(() => {
        const fetchMessages = async () => {
            const { data, error } = await supabase
                //.schema('wa') // Use public view instead to avoid 406 Not Acceptable
                .from('wa_consolidated')
                .select('*')
                .eq('contact_id', contactId)
                .order('created_at', { ascending: true })

            if (data) setMessages(data as any)
        }

        fetchMessages()

        const channel = supabase
            .channel('chat_updates')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'wa',
                    table: 'wa_consolidated',
                    filter: `contact_id=eq.${contactId}`
                },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new as any])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [contactId])

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const content = input.trim()
        setInput('')
        setIsLoading(true)

        // Optimistic update
        const userMsg: Message = {
            id: 'temp-' + Date.now(),
            content,
            role: 'user',
            created_at: new Date().toISOString()
        }
        setMessages((prev) => [...prev, userMsg])

        try {
            // Call native AI processing agent
            console.log('Calling processAIChatMessage with:', { contactId, companyId, content })
            const result = await processAIChatMessage(contactId, companyId, content)
            console.log('AI Response Result:', result)

            if (!result.success) {
                console.error('AI Error:', result.error)
            } else {
                // Optimistic update for AI response
                const aiMsg: Message = {
                    id: 'temp-ai-' + Date.now(),
                    content: result.data.assistant_reply,
                    role: 'assistant',
                    created_at: new Date().toISOString(),
                    agent_type: 'general'
                }
                setMessages((prev) => [...prev, aiMsg])
            }
        } catch (error) {
            console.error('Error sending message:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const resetChat = async () => {
        if (!confirm('¿Estás seguro de que quieres iniciar una nueva conversación? Se borrará el historial actual.')) return

        setIsLoading(true)
        try {
            // We'll call a hypothetical clear action or just do it here via supabase for now
            // For a simple implementation, we can delete from wa_consolidated and ai_chat_memory
            // But let's just clear the local state first and then the DB
            const { error } = await supabase.from('wa_consolidated').delete().eq('contact_id', contactId)
            if (error) throw error

            // Also clear AI memory to reset episodic context
            await supabase.from('ai_chat_memory').delete().eq('contact_id', contactId)

            setMessages([])
        } catch (error) {
            console.error('Error resetting chat:', error)
            alert('Error al reiniciar el chat')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="border-b p-4 bg-white flex justify-between items-center">
                <h2 className="font-semibold text-gray-700">Chat con Nova</h2>
                <button
                    onClick={resetChat}
                    className="text-xs flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Nueva Conversación"
                >
                    <PlusCircle size={14} />
                    <span>Nueva conversación</span>
                </button>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`rounded-lg p-3 max-w-[80%] ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-gray-200 text-gray-800 rounded-bl-none'
                            }`}>
                            {msg.content}
                            <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-10">
                        Start a conversation with our AI agents.
                    </div>
                )}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-200 text-gray-500 rounded-lg p-3 rounded-bl-none flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Nova está escribiendo...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="border-t p-4 bg-white">
                <form className="flex gap-2" onSubmit={sendMessage}>
                    <input
                        className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="bg-blue-600 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    )
}
