"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ExportGenerationsButton() {
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('generations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                toast.info("No hay historial de generaciones para exportar.");
                return;
            }

            const headers = ["ID", "Fecha", "Tipo", "Estado", "Lead ID", "Input Path", "Output Path"];
            const rows = data.map(gen => [
                gen.id,
                new Date(gen.created_at).toLocaleString(),
                gen.type,
                gen.status,
                gen.lead_id,
                gen.input_path,
                gen.output_path
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `generations_history_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Historial exportado correctamente");

        } catch (err: any) {
            console.error("Export Error:", err);
            toast.error("Error al exportar historial.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar Historial
        </Button>
    );
}
