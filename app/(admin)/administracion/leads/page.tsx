"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Download, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { LeadDetailModal } from "@/components/admin/LeadDetailModal";

export default function LeadsPage() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredLeads = useMemo(() => {
        if (!searchTerm.trim()) return leads;
        const lowTerm = searchTerm.toLowerCase();
        return leads.filter(lead =>
            lead.name?.toLowerCase().includes(lowTerm) ||
            lead.email?.toLowerCase().includes(lowTerm) ||
            lead.phone?.toLowerCase().includes(lowTerm)
        );
    }, [leads, searchTerm]);

    const fetchLeads = useCallback(async () => {
        try {
            const supabase = createClient();

            const { data, error } = await supabase
                .from('leads')
                .select('*, generations(*)') // Fetch linked generations
                .order('created_at', { ascending: false });

            if (error) {
                toast.error(`Error cargando leads: ${error.message}`);
                throw error;
            }
            const updatedLeads = data || [];
            setLeads(updatedLeads);

            // Sync selectedLead if it's currently open, without causing a dependency loop
            setSelectedLead((prev: any) => {
                if (!prev) return null;
                const refreshedLead = updatedLeads.find((l: any) => l.id === prev.id);
                return refreshedLead || prev;
            });
        } catch (err: any) {
            console.error("Leads Fetch Error:", err);
            toast.error("No se pudieron cargar los leads. Revisa la consola.");
        } finally {
            setLoading(false);
        }
    }, []); // Empty dependencies to avoid callback recreation

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const statusLabels: Record<string, string> = {
        pending: "Pendiente",
        contacted: "Contactado",
        converted: "Convertido",
        rejected: "Rechazado"
    };

    const handleExportCSV = () => {
        if (!leads.length) {
            toast.error("No hay leads para exportar");
            return;
        }

        const headers = ["ID", "Fecha", "Nombre", "Email", "Teléfono", "Estado", "Rango Edad", "Objetivo", "Plazo", "Clínica"];
        const rows = leads.map(lead => [
            lead.id,
            new Date(lead.created_at).toLocaleString(),
            `"${lead.name?.replace(/"/g, '""') || ''}"`,
            `"${lead.email?.replace(/"/g, '""') || ''}"`,
            `"${lead.phone?.replace(/"/g, '""') || ''}"`,
            lead.status,
            lead.survey_data?.ageRange || '',
            lead.survey_data?.improvementGoal || '',
            lead.survey_data?.timeframe || '',
            lead.survey_data?.clinicPreference || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-heading font-bold text-foreground">Gestión de Leads</h2>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                    <Download className="w-4 h-4 mr-2" strokeWidth={1.5} /> Exportar CSV
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, email o teléfono..."
                    className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-black"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center text-muted-foreground">
                        <Loader2 className="animate-spin mr-2" /> Cargando datos...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/20 border-b border-border">
                                <tr>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3">Nombre</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Teléfono</th>
                                    <th className="px-6 py-3">Estado</th>
                                    <th className="px-6 py-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                                            {searchTerm ? "No se encontraron leads que coincidan con la búsqueda." : "No hay leads registrados aún."}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLeads.map((lead) => (
                                        <tr key={lead.id} className="bg-card border-b border-border hover:bg-muted/10 transition-colors">
                                            <td className="px-6 py-4">{new Date(lead.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-medium text-foreground">{lead.name}</td>
                                            <td className="px-6 py-4">{lead.email}</td>
                                            <td className="px-6 py-4">{lead.phone}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${lead.status === 'converted' ? 'bg-green-100 text-green-700' :
                                                    lead.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {statusLabels[lead.status] || lead.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => setSelectedLead(lead)}
                                                    className="text-primary hover:underline font-medium flex items-center"
                                                >
                                                    <Eye className="w-4 h-4 mr-1" strokeWidth={1.5} /> Ver Detalle
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <LeadDetailModal
                lead={selectedLead}
                open={!!selectedLead}
                onOpenChange={(open) => !open && setSelectedLead(null)}
                onLeadUpdated={() => {
                    fetchLeads(); // Refresh table when status changes
                    // No direct state mutation needed as fetchLeads handles it
                }}
            />
        </div>
    );
}
