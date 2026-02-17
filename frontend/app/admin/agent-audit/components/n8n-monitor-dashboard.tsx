'use client'

import { useEffect, useState } from 'react'
import { Workflow, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { getN8nWorkflowStatus, getWorkflowExecutionHistory } from '@/lib/actions/monitoring'

interface WorkflowStatus {
    id: string
    workflow_id: string
    workflow_name: string
    execution_id?: string
    status: 'success' | 'error' | 'running' | 'waiting'
    started_at?: string
    finished_at?: string
    execution_time_ms?: number
    error_message?: string
    metadata: any
    created_at: string
}

interface Props {
    isSuperAdmin: boolean
    n8nUrl: string
}

export default function N8nMonitorDashboard({ isSuperAdmin, n8nUrl }: Props) {
    const [workflowStatuses, setWorkflowStatuses] = useState<WorkflowStatus[]>([])
    const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null)
    const [executionHistory, setExecutionHistory] = useState<WorkflowStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [workflowDetails, setWorkflowDetails] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'structure' | 'history'>('structure')

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        if (selectedWorkflow) {
            loadExecutionHistory(selectedWorkflow)
            loadWorkflowDetails(selectedWorkflow)
            // Default to history if status is error, otherwise structure
            const workflow = workflowStatuses.find(w => w.workflow_id === selectedWorkflow)
            if (workflow?.status === 'error') {
                setActiveTab('history')
            }
        } else {
            setWorkflowDetails(null)
        }
    }, [selectedWorkflow])

    async function loadData() {
        setLoading(true)
        try {
            // Parallel fetch: full list from API + recent executions from API
            const { getN8nWorkflows, getN8nExecutions } = await import('@/lib/actions/monitoring')

            const [allWorkflows, recentExecutions] = await Promise.all([
                getN8nWorkflows(),
                getN8nExecutions(undefined, 50)
            ])

            // Merge data: Create a map of workflows from API
            const workflowMap = new Map<string, WorkflowStatus>()

            // 1. Add all workflows from API with default "waiting" status
            allWorkflows.forEach((wf: any) => {
                workflowMap.set(wf.id, {
                    id: wf.id,
                    workflow_id: wf.id,
                    workflow_name: wf.name,
                    status: wf.active ? 'waiting' : 'waiting', // Default status
                    created_at: wf.createdAt,
                    metadata: { active: wf.active },
                    // Use updatedAt as a proxy for last activity if no execution
                    finished_at: wf.updatedAt
                })
            })

            // 2. Overlay execution status from API (overwrite with latest status)
            // Group executions by workflow_id to find latest
            const latestExecutions = recentExecutions.reduce((acc: any, exec: any) => {
                if (!acc[exec.workflow_id] || new Date(exec.started_at) > new Date(acc[exec.workflow_id].started_at)) {
                    acc[exec.workflow_id] = exec
                }
                return acc
            }, {} as Record<string, WorkflowStatus>)

            // Update map with real execution status
            Object.values(latestExecutions).forEach((status: any) => {
                if (workflowMap.has(status.workflow_id)) {
                    const existing = workflowMap.get(status.workflow_id)!
                    workflowMap.set(status.workflow_id, {
                        ...existing,
                        status: status.status,
                        execution_id: status.id,
                        started_at: status.started_at,
                        finished_at: status.finished_at,
                        execution_time_ms: status.execution_time_ms,
                        error_message: status.error_message
                    })
                }
            })

            setWorkflowStatuses(Array.from(workflowMap.values()))
        } catch (error) {
            console.error('Failed to load n8n data:', error)
        } finally {
            setLoading(false)
        }
    }

    async function loadExecutionHistory(workflowId: string) {
        try {
            const { getN8nExecutions } = await import('@/lib/actions/monitoring')
            const data = await getN8nExecutions(workflowId, 20)
            setExecutionHistory(data)
        } catch (error) {
            console.error('Failed to load execution history:', error)
        }
    }

    async function loadWorkflowDetails(workflowId: string) {
        setLoadingDetails(true)
        try {
            const { getN8nWorkflowDetails } = await import('@/lib/actions/monitoring')
            const details = await getN8nWorkflowDetails(workflowId)
            setWorkflowDetails(details)
        } catch (error) {
            console.error('Failed to load workflow details:', error)
        } finally {
            setLoadingDetails(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'bg-green-100 text-green-700 border-green-200'
            case 'error': return 'bg-red-100 text-red-700 border-red-200'
            case 'running': return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'waiting': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
            default: return 'bg-gray-100 text-gray-700 border-gray-200'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle className="w-4 h-4" />
            case 'error': return <XCircle className="w-4 h-4" />
            case 'running': return <Clock className="w-4 h-4 animate-spin" />
            case 'waiting': return <Clock className="w-4 h-4" />
            default: return <AlertTriangle className="w-4 h-4" />
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'success': return 'Exitoso'
            case 'error': return 'Error'
            case 'running': return 'Ejecutando'
            case 'waiting': return 'Esperando'
            default: return status
        }
    }

    const uniqueWorkflows = workflowStatuses
    const successCount = uniqueWorkflows.filter(w => w.status === 'success').length
    const errorCount = uniqueWorkflows.filter(w => w.status === 'error').length
    const runningCount = uniqueWorkflows.filter(w => w.status === 'running').length

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-2xl">
                            <Workflow className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-3xl font-black text-blue-600">{uniqueWorkflows.length}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Flujos Activos</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-2xl">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <span className="text-3xl font-black text-green-600">{successCount}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Exitosos</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-100 rounded-2xl">
                            <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <span className="text-3xl font-black text-red-600">{errorCount}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fallidos</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-2xl">
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-3xl font-black text-blue-600">{runningCount}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ejecutando</p>
                </div>
            </div>

            {/* Workflow List & Details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LIST (4 columns) */}
                <div className="lg:col-span-4 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
                    <div className="p-6 border-b border-gray-100 shrink-0">
                        <h3 className="text-xl font-black text-gray-900">Flujos de Trabajo</h3>
                        <p className="text-sm text-gray-500 mt-1">Estado de última ejecución</p>
                    </div>

                    <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
                        {loading ? (
                            <div className="p-12 text-center text-gray-500">Cargando flujos...</div>
                        ) : uniqueWorkflows.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">No se encontraron flujos</div>
                        ) : (
                            uniqueWorkflows.map((workflow) => (
                                <div
                                    key={workflow.workflow_id}
                                    className={`p-6 hover:bg-gray-50 transition cursor-pointer ${selectedWorkflow === workflow.workflow_id ? 'bg-purple-50' : ''
                                        }`}
                                    onClick={() => setSelectedWorkflow(workflow.workflow_id)}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-xl border ${getStatusColor(workflow.status)}`}>
                                            {getStatusIcon(workflow.status)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900">{workflow.workflow_name}</h4>
                                            <p className="text-xs text-gray-500 mt-1">ID: {workflow.workflow_id}</p>

                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                <span>{new Date(workflow.created_at).toLocaleDateString()}</span>
                                                {workflow.execution_time_ms && (
                                                    <span>{workflow.execution_time_ms}ms</span>
                                                )}
                                            </div>

                                            {workflow.status === 'error' && workflow.error_message && (
                                                <div className="mt-2 p-2 bg-red-50 rounded-lg">
                                                    <p className="text-xs text-red-700 line-clamp-2">{workflow.error_message}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* DETAILS (8 columns) */}
                <div className="lg:col-span-8 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
                    {!selectedWorkflow ? (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-center text-gray-400">
                            <Workflow className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Selecciona un flujo para ver detalles</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="border-b border-gray-100">
                                <nav className="flex" aria-label="Tabs">
                                    <button
                                        onClick={() => setActiveTab('structure')}
                                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'structure'
                                                ? 'text-purple-600 border-purple-600'
                                                : 'text-gray-500 border-transparent hover:text-gray-700'
                                            }`}
                                    >
                                        Estructura y Nodos
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'history'
                                                ? 'text-purple-600 border-purple-600'
                                                : 'text-gray-500 border-transparent hover:text-gray-700'
                                            }`}
                                    >
                                        Historial de Ejecuciones
                                    </button>
                                </nav>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="space-y-8">
                                    {/* NODE STRUCTURE */}
                                    {activeTab === 'structure' && (
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <Workflow className="w-5 h-5 text-gray-400" />
                                                Estructura del Flujo
                                            </h3>

                                            {loadingDetails ? (
                                                <div className="p-8 text-center text-gray-400 animate-pulse">Cargando estructura desde n8n...</div>
                                            ) : workflowDetails ? (
                                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {workflowDetails.nodes?.map((node: any) => (
                                                            <div key={node.id || node.name} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-bold text-gray-800 text-sm truncate" title={node.name}>{node.name}</span>
                                                                    {node.disabled && <span className="text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded">OFF</span>}
                                                                </div>
                                                                <span className="text-[10px] text-gray-500 font-mono truncate" title={node.type}>{node.type.split('.').pop()}</span>
                                                                {node.notesInFlow && (
                                                                    <div className="mt-1 text-[10px] text-gray-400 italic bg-gray-50 p-1 rounded">
                                                                        {node.notesInFlow}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-4 text-xs text-right text-gray-400">
                                                        Total Nodos: {workflowDetails.nodes?.length || 0}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400">
                                                    No se pudo cargar la estructura o no hay credenciales configuradas.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* EXECUTION HISTORY */}
                                    {activeTab === 'history' && (
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <Clock className="w-5 h-5 text-gray-400" />
                                                Últimas Ejecuciones
                                            </h3>
                                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                                <div className="divide-y divide-gray-50">
                                                    {executionHistory.length === 0 ? (
                                                        <div className="p-8 text-center text-gray-400">No hay historial reciente</div>
                                                    ) : (
                                                        executionHistory.slice(0, 50).map((execution) => (
                                                            <a
                                                                key={execution.id}
                                                                href={`${n8nUrl}/workflow/${execution.workflow_id}/executions/${execution.id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-4 flex items-center justify-between hover:bg-gray-50 transition group"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`p-1.5 rounded-lg ${getStatusColor(execution.status)}`}>
                                                                        {getStatusIcon(execution.status)}
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="text-sm font-bold text-gray-900 capitalize group-hover:text-purple-600 transition">
                                                                                {getStatusLabel(execution.status)}
                                                                            </p>
                                                                            <span className="opacity-0 group-hover:opacity-100 text-xs text-purple-600 transition">
                                                                                ↗ Ver en n8n
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-xs text-gray-400">{new Date(execution.created_at).toLocaleString()}</p>
                                                                    </div>
                                                                </div>
                                                                {execution.execution_time_ms && (
                                                                    <span className="text-xs font-mono text-gray-500">{execution.execution_time_ms}ms</span>
                                                                )}
                                                            </a>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
