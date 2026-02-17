'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, User, Bot, Calendar, Clock, Hash, Download, Search, Filter, X, ChevronRight, Phone, Building2 } from 'lucide-react'
import { getConversationSessions, getConversationTranscript, getConversationMetrics, exportConversationTranscript, type ConversationFilters } from '@/lib/actions/monitoring'
import { cn } from '@/lib/utils'

interface ConversationAuditDashboardProps {
    isSuperAdmin: boolean
}

export default function ConversationAuditDashboard({ isSuperAdmin }: ConversationAuditDashboardProps) {
    const [sessions, setSessions] = useState<any[]>([])
    const [metrics, setMetrics] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [selectedSession, setSelectedSession] = useState<string | null>(null)
    const [transcript, setTranscript] = useState<any>(null)
    const [transcriptLoading, setTranscriptLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filters, setFilters] = useState<ConversationFilters>({
        limit: 50
    })

    // Fetch sessions and metrics
    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            try {
                const [sessionsData, metricsData] = await Promise.all([
                    getConversationSessions(filters),
                    getConversationMetrics()
                ])
                setSessions(sessionsData)
                setMetrics(metricsData)
            } catch (error) {
                console.error('Error fetching conversation data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [filters])

    // Fetch transcript when session is selected
    useEffect(() => {
        async function fetchTranscript() {
            if (!selectedSession) {
                setTranscript(null)
                return
            }
            setTranscriptLoading(true)
            try {
                const data = await getConversationTranscript(selectedSession)
                setTranscript(data)
            } catch (error) {
                console.error('Error fetching transcript:', error)
            } finally {
                setTranscriptLoading(false)
            }
        }
        fetchTranscript()
    }, [selectedSession])

    const handleSearch = () => {
        setFilters(prev => ({ ...prev, searchTerm }))
    }

    const handleExport = async (sessionId: string, format: 'json' | 'txt') => {
        try {
            const data = await exportConversationTranscript(sessionId, format)
            const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/plain' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `transcript_${sessionId}.${format}`
            a.click()
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Error exporting transcript:', error)
        }
    }

    const formatDuration = (seconds: number) => {
        if (seconds < 60) return `${Math.round(seconds)}s`
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = Math.round(seconds % 60)
        return `${minutes}m ${remainingSeconds}s`
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Cargando conversaciones...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Sesiones</p>
                            <p className="text-3xl font-black text-gray-900 mt-1">{metrics?.totalSessions || 0}</p>
                        </div>
                        <MessageSquare className="w-8 h-8 text-blue-500" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Promedio Mensajes</p>
                            <p className="text-3xl font-black text-gray-900 mt-1">{metrics?.avgMessagesPerSession || 0}</p>
                        </div>
                        <Hash className="w-8 h-8 text-green-500" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Duración Promedio</p>
                            <p className="text-3xl font-black text-gray-900 mt-1">{metrics?.avgDurationMinutes || 0}m</p>
                        </div>
                        <Clock className="w-8 h-8 text-orange-500" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sesiones Hoy</p>
                            <p className="text-3xl font-black text-gray-900 mt-1">{metrics?.sessionsToday || 0}</p>
                        </div>
                        <Calendar className="w-8 h-8 text-purple-500" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sessions List */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Sesiones de Conversación</h3>
                            <button className="text-xs font-bold text-gray-400 hover:text-gray-900 transition">
                                <Filter className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por teléfono o nombre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>

                    <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                        {sessions.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                No se encontraron sesiones
                            </div>
                        ) : (
                            sessions.map((session) => (
                                <div
                                    key={session.session_id}
                                    onClick={() => setSelectedSession(session.session_id)}
                                    className={cn(
                                        "p-4 cursor-pointer transition-colors hover:bg-gray-50",
                                        selectedSession === session.session_id && "bg-blue-50 border-l-4 border-blue-500"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                                <span className="text-sm font-bold text-gray-900 truncate">
                                                    {session.real_name || session.push_name || session.phone}
                                                </span>
                                            </div>

                                            {session.company_name && (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                                                    <span className="text-xs text-gray-500 truncate">{session.company_name}</span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Hash className="w-3 h-3" />
                                                    {session.message_count} msgs
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDuration(session.duration_seconds)}
                                                </span>
                                            </div>

                                            {session.agent_types && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {session.agent_types.split(', ').slice(0, 2).map((agent: string) => (
                                                        <span
                                                            key={agent}
                                                            className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold uppercase tracking-wider"
                                                        >
                                                            {agent}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(session.session_end).toLocaleDateString('es-CL')}
                                            </span>
                                            <ChevronRight className={cn(
                                                "w-5 h-5 text-gray-300 transition-colors",
                                                selectedSession === session.session_id && "text-blue-500"
                                            )} />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Transcript Viewer */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Transcript de Conversación</h3>
                            {selectedSession && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleExport(selectedSession, 'txt')}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                                        title="Exportar como TXT"
                                    >
                                        <Download className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <button
                                        onClick={() => setSelectedSession(null)}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                                    >
                                        <X className="w-4 h-4 text-gray-600" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 max-h-[600px] overflow-y-auto">
                        {!selectedSession ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <MessageSquare className="w-12 h-12 mb-3" />
                                <p className="text-sm">Selecciona una sesión para ver el transcript</p>
                            </div>
                        ) : transcriptLoading ? (
                            <div className="flex items-center justify-center h-64 text-gray-400">
                                Cargando transcript...
                            </div>
                        ) : transcript ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                                    <span className="px-2 py-1 bg-gray-100 rounded-md font-bold">
                                        {transcript.source === 'whatsapp' ? 'WhatsApp' : 'AI Chat'}
                                    </span>
                                    <span>{transcript.messages.length} mensajes</span>
                                </div>

                                {transcript.messages.map((msg: any, index: number) => (
                                    <div
                                        key={msg.id || index}
                                        className={cn(
                                            "flex gap-3",
                                            msg.role === 'user' ? 'justify-start' : 'justify-end'
                                        )}
                                    >
                                        {msg.role === 'user' && (
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                                <User className="w-4 h-4 text-gray-600" />
                                            </div>
                                        )}

                                        <div className={cn(
                                            "max-w-[80%] rounded-2xl p-4",
                                            msg.role === 'user'
                                                ? 'bg-gray-100 text-gray-900'
                                                : 'bg-blue-500 text-white'
                                        )}>
                                            {msg.agentType && (
                                                <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
                                                    {msg.agentType}
                                                </div>
                                            )}
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                                            {msg.agentSummary && (
                                                <div className="mt-2 pt-2 border-t border-white/20">
                                                    <p className="text-xs italic opacity-80">Resumen: {msg.agentSummary}</p>
                                                </div>
                                            )}

                                            <div className={cn(
                                                "text-[10px] mt-2 opacity-60",
                                                msg.role === 'user' ? 'text-gray-500' : 'text-white'
                                            )}>
                                                {new Date(msg.timestamp).toLocaleTimeString('es-CL')}
                                            </div>
                                        </div>

                                        {msg.role !== 'user' && (
                                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                                                <Bot className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-64 text-red-500">
                                Error cargando transcript
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
