'use client'

import { useEffect, useState } from 'react'
import { Shield, User, AlertCircle, Database } from 'lucide-react'
import { getUserAuditTrail, getDataQualityIssues, type AuditFilters } from '@/lib/actions/monitoring'

interface AuditEntry {
    id: string
    timestamp: string
    action: string
    table_name: string
    record_id: string
    actor_uid: string
    actor_role: string
    company_id: string
    company_name?: string
    old_data: any
    new_data: any
    actor_type: string
}

interface DataQualityIssue {
    issue_type: string
    contact_id: string
    phone: string
    company_id: string
    profile_completion_percent?: number
    last_updated: string
    description: string
    detected_at: string
}

interface Props {
    isSuperAdmin: boolean
}

export default function AuditTrailDashboard({ isSuperAdmin }: Props) {
    const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
    const [dataQualityIssues, setDataQualityIssues] = useState<DataQualityIssue[]>([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState<AuditFilters>({})

    useEffect(() => {
        loadAuditData()
        // Auto-refresh every 60 seconds
        const interval = setInterval(loadAuditData, 60000)
        return () => clearInterval(interval)
    }, [filters])

    async function loadAuditData() {
        try {
            const [auditData, qualityData] = await Promise.all([
                getUserAuditTrail(filters),
                getDataQualityIssues()
            ])
            setAuditEntries(auditData)
            setDataQualityIssues(qualityData)
        } catch (error) {
            console.error('Failed to load audit data:', error)
        } finally {
            setLoading(false)
        }
    }

    const maskPII = (data: any) => {
        if (!isSuperAdmin && data) {
            // Mask sensitive fields for non-super admins
            const masked = { ...data }
            if (masked.email) masked.email = '***@***.***'
            if (masked.phone) masked.phone = '***-***-****'
            if (masked.real_name) masked.real_name = '***'
            return masked
        }
        return data
    }

    const userActionCount = auditEntries.filter(e => e.actor_type === 'User').length
    const adminActionCount = auditEntries.filter(e => e.actor_type !== 'User').length

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-2xl">
                            <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-3xl font-black text-blue-600">{auditEntries.length}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Acciones Totales</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-2xl">
                            <User className="w-5 h-5 text-green-600" />
                        </div>
                        <span className="text-3xl font-black text-green-600">{userActionCount}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Acciones de Usuarios</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 rounded-2xl">
                            <Shield className="w-5 h-5 text-purple-600" />
                        </div>
                        <span className="text-3xl font-black text-purple-600">{adminActionCount}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Acciones de Admins</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-100 rounded-2xl">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <span className="text-3xl font-black text-red-600">{dataQualityIssues.length}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Problemas de Datos</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm font-bold text-gray-700">Filtros:</span>

                    <select
                        value={filters.action || ''}
                        onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined })}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">Todas las Acciones</option>
                        <option value="INSERT">Insertar</option>
                        <option value="UPDATE">Actualizar</option>
                        <option value="DELETE">Eliminar</option>
                    </select>

                    <select
                        value={filters.tableName || ''}
                        onChange={(e) => setFilters({ ...filters, tableName: e.target.value || undefined })}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">Todas las Tablas</option>
                        <option value="contacts">Contactos</option>
                        <option value="user_context">Contexto de Usuario</option>
                        <option value="companies">Empresas</option>
                        <option value="user_compliance">Cumplimiento de Usuario</option>
                    </select>

                    <button
                        onClick={() => setFilters({})}
                        className="ml-auto px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition"
                    >
                        Limpiar Filtros
                    </button>
                </div>
            </div>

            {/* Data Quality Issues */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-black text-gray-900">Problemas de Calidad de Datos</h3>
                    <p className="text-sm text-gray-500 mt-1">Problemas de integridad de datos detectados</p>
                </div>

                <div className="divide-y divide-gray-100">
                    {dataQualityIssues.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">No se encontraron problemas de calidad de datos</div>
                    ) : (
                        dataQualityIssues.map((issue, index) => (
                            <div key={index} className="p-6 hover:bg-gray-50 transition">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 rounded-xl bg-red-100 text-red-700 border border-red-200">
                                        <Database className="w-4 h-4" />
                                    </div>

                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900">{issue.description}</h4>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                            <span>Contacto: {isSuperAdmin ? issue.phone : '***-***-****'}</span>
                                            {issue.profile_completion_percent !== null && (
                                                <span>Perfil: {issue.profile_completion_percent}% completo</span>
                                            )}
                                            <span>Detectado: {new Date(issue.detected_at).toLocaleDateString('es-ES')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Audit Trail */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-black text-gray-900">Registro de Auditoría</h3>
                    <p className="text-sm text-gray-500 mt-1">Historial de acciones de usuarios y administradores</p>
                    {!isSuperAdmin && (
                        <p className="text-xs text-yellow-600 mt-2">⚠️ Los datos PII están enmascarados para administradores no-super</p>
                    )}
                </div>

                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">Cargando registro de auditoría...</div>
                    ) : auditEntries.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">No se encontraron entradas de auditoría</div>
                    ) : (
                        auditEntries.map((entry) => (
                            <div key={entry.id} className="p-6 hover:bg-gray-50 transition">
                                <div className="flex items-start gap-4">
                                    <div className={`p-2 rounded-xl border ${entry.actor_type === 'User'
                                            ? 'bg-blue-100 text-blue-700 border-blue-200'
                                            : 'bg-purple-100 text-purple-700 border-purple-200'
                                        }`}>
                                        {entry.actor_type === 'User' ? <User className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div>
                                                <h4 className="font-bold text-gray-900">
                                                    {entry.action === 'INSERT' ? 'Insertar' : entry.action === 'UPDATE' ? 'Actualizar' : 'Eliminar'} en {entry.table_name}
                                                </h4>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {entry.actor_type === 'User' ? 'Usuario' : entry.actor_type === 'Blukastor Admin' ? 'Admin Blukastor' : 'Admin de Empresa'} • {entry.company_name || 'Empresa Desconocida'}
                                                </p>
                                            </div>
                                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                                {new Date(entry.timestamp).toLocaleString('es-ES')}
                                            </span>
                                        </div>

                                        {entry.action === 'UPDATE' && entry.old_data && entry.new_data && (
                                            <div className="mt-3 grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Antes</p>
                                                    <pre className="text-xs bg-gray-50 p-2 rounded-lg overflow-x-auto">
                                                        {JSON.stringify(maskPII(entry.old_data), null, 2)}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Después</p>
                                                    <pre className="text-xs bg-gray-50 p-2 rounded-lg overflow-x-auto">
                                                        {JSON.stringify(maskPII(entry.new_data), null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}

                                        {entry.action === 'INSERT' && entry.new_data && (
                                            <div className="mt-3">
                                                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Datos</p>
                                                <pre className="text-xs bg-gray-50 p-2 rounded-lg overflow-x-auto">
                                                    {JSON.stringify(maskPII(entry.new_data), null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
