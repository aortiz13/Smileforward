'use client'

import { useEffect, useState } from 'react'
import { Activity, Zap, TrendingUp, MessageSquare } from 'lucide-react'
import { getAIAgentMetrics, type DateRange } from '@/lib/actions/monitoring'

interface AIMetrics {
    totalInvocations: number
    successRate: number
    averageLatency: number
    byAgentType: Record<string, {
        count: number
        avgLatency: number
        successRate: number
    }>
}

interface Props {
    isSuperAdmin: boolean
}

export default function AIMetricsDashboard({ isSuperAdmin }: Props) {
    const [metrics, setMetrics] = useState<AIMetrics | null>(null)
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
        endDate: new Date().toISOString()
    })

    useEffect(() => {
        loadMetrics()
        // Auto-refresh every 60 seconds
        const interval = setInterval(loadMetrics, 60000)
        return () => clearInterval(interval)
    }, [dateRange])

    async function loadMetrics() {
        try {
            const data = await getAIAgentMetrics(dateRange)
            setMetrics(data)
        } catch (error) {
            console.error('Failed to load AI metrics:', error)
        } finally {
            setLoading(false)
        }
    }

    const getLatencyColor = (latency: number) => {
        if (latency < 5000) return 'text-green-600'
        if (latency < 15000) return 'text-yellow-600'
        return 'text-red-600'
    }

    const getSuccessRateColor = (rate: number) => {
        if (rate >= 95) return 'text-green-600'
        if (rate >= 85) return 'text-yellow-600'
        return 'text-red-600'
    }

    return (
        <div className="space-y-6">
            {/* Date Range Filter */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm font-bold text-gray-700">Rango de Fechas:</span>

                    <select
                        defaultValue="7"
                        onChange={(e) => {
                            const days = parseInt(e.target.value)
                            setDateRange({
                                startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
                                endDate: new Date().toISOString()
                            })
                        }}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="1">Últimas 24 horas</option>
                        <option value="7">Últimos 7 días</option>
                        <option value="30">Últimos 30 días</option>
                        <option value="90">Últimos 90 días</option>
                    </select>
                </div>
            </div>

            {/* Global KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 rounded-2xl">
                            <Activity className="w-5 h-5 text-purple-600" />
                        </div>
                        <span className="text-3xl font-black text-purple-600">
                            {metrics?.totalInvocations.toLocaleString('es-ES') || '0'}
                        </span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Invocaciones Totales</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-2xl">
                            <Zap className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className={`text-3xl font-black ${getLatencyColor(metrics?.averageLatency || 0)}`}>
                            {metrics ? `${(metrics.averageLatency / 1000).toFixed(1)}s` : '0s'}
                        </span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Latencia Promedio</p>
                    <p className="text-xs text-gray-500 mt-1">Objetivo: &lt;15s</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-2xl">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                        <span className={`text-3xl font-black ${getSuccessRateColor(metrics?.successRate || 0)}`}>
                            {metrics ? `${metrics.successRate.toFixed(1)}%` : '0%'}
                        </span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tasa de Éxito</p>
                    <p className="text-xs text-gray-500 mt-1">Objetivo: &gt;95%</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-100 rounded-2xl">
                            <MessageSquare className="w-5 h-5 text-orange-600" />
                        </div>
                        <span className="text-3xl font-black text-orange-600">
                            {metrics ? Object.keys(metrics.byAgentType).length : '0'}
                        </span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Agentes Activos</p>
                </div>
            </div>

            {/* Performance by Agent Type */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-black text-gray-900">Rendimiento por Tipo de Agente</h3>
                    <p className="text-sm text-gray-500 mt-1">Métricas detalladas por agente</p>
                </div>

                <div className="divide-y divide-gray-100">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">Cargando métricas...</div>
                    ) : !metrics || Object.keys(metrics.byAgentType).length === 0 ? (
                        <div className="p-12 text-center text-gray-500">No se encontraron métricas de agentes</div>
                    ) : (
                        Object.entries(metrics.byAgentType)
                            .sort((a, b) => b[1].count - a[1].count)
                            .map(([agentType, agentMetrics]) => (
                                <div key={agentType} className="p-6 hover:bg-gray-50 transition">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className="font-bold text-gray-900 capitalize">{agentType.replace('_', ' ')}</h4>
                                            <p className="text-sm text-gray-500 mt-1">{agentMetrics.count.toLocaleString('es-ES')} invocaciones</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-gray-50 p-4 rounded-2xl">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Latencia Promedio</p>
                                            <p className={`text-2xl font-black ${getLatencyColor(agentMetrics.avgLatency)}`}>
                                                {(agentMetrics.avgLatency / 1000).toFixed(2)}s
                                            </p>
                                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${agentMetrics.avgLatency < 5000 ? 'bg-green-500' :
                                                            agentMetrics.avgLatency < 15000 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                    style={{ width: `${Math.min((agentMetrics.avgLatency / 15000) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-2xl">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tasa de Éxito</p>
                                            <p className={`text-2xl font-black ${getSuccessRateColor(agentMetrics.successRate)}`}>
                                                {agentMetrics.successRate.toFixed(1)}%
                                            </p>
                                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${agentMetrics.successRate >= 95 ? 'bg-green-500' :
                                                            agentMetrics.successRate >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                    style={{ width: `${agentMetrics.successRate}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-2xl">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Volumen</p>
                                            <p className="text-2xl font-black text-purple-600">
                                                {agentMetrics.count.toLocaleString('es-ES')}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {((agentMetrics.count / metrics.totalInvocations) * 100).toFixed(1)}% del total
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </div>

            {/* Performance Targets */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-3xl border border-purple-100">
                <h3 className="text-lg font-black text-gray-900 mb-4">Objetivos de Rendimiento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl">
                        <div className="flex items-center gap-3 mb-2">
                            <Zap className="w-5 h-5 text-blue-600" />
                            <span className="font-bold text-gray-900">Objetivo de Latencia</span>
                        </div>
                        <p className="text-sm text-gray-600">El tiempo de respuesta promedio debe ser &lt;15 segundos</p>
                        <p className="text-xs text-gray-500 mt-2">
                            Actual: {metrics ? `${(metrics.averageLatency / 1000).toFixed(1)}s` : 'N/A'}
                            {metrics && metrics.averageLatency < 15000 && (
                                <span className="text-green-600 ml-2">✓ Cumpliendo objetivo</span>
                            )}
                            {metrics && metrics.averageLatency >= 15000 && (
                                <span className="text-red-600 ml-2">⚠ Por encima del objetivo</span>
                            )}
                        </p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            <span className="font-bold text-gray-900">Objetivo de Tasa de Éxito</span>
                        </div>
                        <p className="text-sm text-gray-600">La tasa de éxito debe ser &gt;95%</p>
                        <p className="text-xs text-gray-500 mt-2">
                            Actual: {metrics ? `${metrics.successRate.toFixed(1)}%` : 'N/A'}
                            {metrics && metrics.successRate >= 95 && (
                                <span className="text-green-600 ml-2">✓ Cumpliendo objetivo</span>
                            )}
                            {metrics && metrics.successRate < 95 && (
                                <span className="text-red-600 ml-2">⚠ Por debajo del objetivo</span>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
