'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Bug, CheckCircle, Clock, Filter, X } from 'lucide-react'
import { getSystemErrors, resolveError, type ErrorFilters } from '@/lib/actions/monitoring'

interface SystemError {
    id: string
    timestamp: string
    severity: 'critical' | 'warning' | 'info'
    origin: string
    error_type: string
    error_message: string
    stack_trace?: string
    metadata: any
    resolved: boolean
    resolved_at?: string
}

interface Props {
    isSuperAdmin: boolean
}

export default function SystemHealthDashboard({ isSuperAdmin }: Props) {
    const [errors, setErrors] = useState<SystemError[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedError, setSelectedError] = useState<SystemError | null>(null)
    const [filters, setFilters] = useState<ErrorFilters>({
        resolved: false
    })

    useEffect(() => {
        loadErrors()
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadErrors, 30000)
        return () => clearInterval(interval)
    }, [filters])

    async function loadErrors() {
        try {
            const data = await getSystemErrors(filters)
            setErrors(data)
        } catch (error) {
            console.error('Failed to load errors:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleResolve(errorId: string) {
        try {
            await resolveError(errorId)
            await loadErrors()
            setSelectedError(null)
        } catch (error) {
            console.error('Failed to resolve error:', error)
        }
    }

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-700 border-red-200'
            case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
            case 'info': return 'bg-blue-100 text-blue-700 border-blue-200'
            default: return 'bg-gray-100 text-gray-700 border-gray-200'
        }
    }

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return <AlertCircle className="w-4 h-4" />
            case 'warning': return <Bug className="w-4 h-4" />
            case 'info': return <CheckCircle className="w-4 h-4" />
            default: return <AlertCircle className="w-4 h-4" />
        }
    }

    const criticalCount = errors.filter(e => e.severity === 'critical' && !e.resolved).length
    const warningCount = errors.filter(e => e.severity === 'warning' && !e.resolved).length
    const infoCount = errors.filter(e => e.severity === 'info' && !e.resolved).length

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-100 rounded-2xl">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <span className="text-3xl font-black text-red-600">{criticalCount}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Errores Críticos</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-yellow-100 rounded-2xl">
                            <Bug className="w-5 h-5 text-yellow-600" />
                        </div>
                        <span className="text-3xl font-black text-yellow-600">{warningCount}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Advertencias</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-2xl">
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-3xl font-black text-blue-600">{infoCount}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Información</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-2xl">
                            <Clock className="w-5 h-5 text-green-600" />
                        </div>
                        <span className="text-3xl font-black text-green-600">{errors.filter(e => e.resolved).length}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resueltos</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-bold text-gray-700">Filtros:</span>
                    </div>

                    <select
                        value={filters.severity || ''}
                        onChange={(e) => setFilters({ ...filters, severity: e.target.value as any || undefined })}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">Todas las Severidades</option>
                        <option value="critical">Crítico</option>
                        <option value="warning">Advertencia</option>
                        <option value="info">Información</option>
                    </select>

                    <select
                        value={filters.origin || ''}
                        onChange={(e) => setFilters({ ...filters, origin: e.target.value || undefined })}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">Todos los Orígenes</option>
                        <option value="n8n_webhook">Webhook n8n</option>
                        <option value="agent">Agente</option>
                        <option value="supabase_function">Función Supabase</option>
                        <option value="frontend">Frontend</option>
                    </select>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.resolved === false}
                            onChange={(e) => setFilters({ ...filters, resolved: e.target.checked ? false : undefined })}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Ocultar Resueltos</span>
                    </label>

                    <button
                        onClick={() => setFilters({ resolved: false })}
                        className="ml-auto px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition"
                    >
                        Limpiar Filtros
                    </button>
                </div>
            </div>

            {/* Error List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-black text-gray-900">Registro de Errores</h3>
                    <p className="text-sm text-gray-500 mt-1">Monitoreo de errores del sistema en tiempo real</p>
                </div>

                <div className="divide-y divide-gray-100">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">Cargando errores...</div>
                    ) : errors.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">No se encontraron errores</div>
                    ) : (
                        errors.map((error) => (
                            <div
                                key={error.id}
                                className="p-6 hover:bg-gray-50 transition cursor-pointer"
                                onClick={() => setSelectedError(error)}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-2 rounded-xl border ${getSeverityColor(error.severity)}`}>
                                        {getSeverityIcon(error.severity)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div>
                                                <h4 className="font-bold text-gray-900">{error.error_type}</h4>
                                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{error.error_message}</p>
                                            </div>
                                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                                {new Date(error.timestamp).toLocaleString('es-ES')}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="font-medium">Origen: {error.origin}</span>
                                            {error.metadata?.workflow_name && (
                                                <span>Flujo: {error.metadata.workflow_name}</span>
                                            )}
                                            {error.resolved && (
                                                <span className="text-green-600 font-bold">✓ Resuelto</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Error Detail Modal */}
            {selectedError && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedError(null)}>
                    <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">{selectedError.error_type}</h3>
                                <p className="text-sm text-gray-500 mt-1">{new Date(selectedError.timestamp).toLocaleString('es-ES')}</p>
                            </div>
                            <button
                                onClick={() => setSelectedError(null)}
                                className="p-2 hover:bg-gray-100 rounded-xl transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Severidad</label>
                                <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-xl border ${getSeverityColor(selectedError.severity)}`}>
                                    {getSeverityIcon(selectedError.severity)}
                                    <span className="font-bold capitalize">{selectedError.severity === 'critical' ? 'Crítico' : selectedError.severity === 'warning' ? 'Advertencia' : 'Información'}</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mensaje de Error</label>
                                <p className="mt-2 text-gray-900">{selectedError.error_message}</p>
                            </div>

                            {selectedError.stack_trace && (
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stack Trace</label>
                                    <pre className="mt-2 p-4 bg-gray-900 text-green-400 rounded-2xl text-xs overflow-x-auto font-mono">
                                        {selectedError.stack_trace}
                                    </pre>
                                </div>
                            )}

                            {selectedError.metadata && Object.keys(selectedError.metadata).length > 0 && (
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Metadatos</label>
                                    <pre className="mt-2 p-4 bg-gray-50 rounded-2xl text-xs overflow-x-auto">
                                        {JSON.stringify(selectedError.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {!selectedError.resolved && (
                                <button
                                    onClick={() => handleResolve(selectedError.id)}
                                    className="w-full px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition"
                                >
                                    Marcar como Resuelto
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
