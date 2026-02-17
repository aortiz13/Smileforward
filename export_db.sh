#!/bin/bash

# Este script utiliza la CLI de Supabase para exportar la estructura y datos de tu proyecto.
# Requisito: Tener instalada y logueada la CLI de Supabase (supabase login).

PROJECT_ID="cjixvpsczmqhevvwqxcd"
OUTPUT_DIR="database"

mkdir -p "$OUTPUT_DIR"

echo "Iniciando exportación de base de datos del proyecto: $PROJECT_ID"
echo "Es posible que se te solicite la contraseña de la base de datos."

# 1. Exportar Esquema (Tablas, funciones, triggers, RLS)
echo "1. Exportando esquema..."
supabase db dump --project-ref "$PROJECT_ID" -f "$OUTPUT_DIR/schema.sql"

if [ $? -eq 0 ]; then
    echo "✅ Esquema exportado exitosamente en $OUTPUT_DIR/schema.sql"
else
    echo "❌ Error al exportar el esquema. Verifica tu conexión y contraseña."
    exit 1
fi

# 2. Exportar Roles (Opcional)
echo "2. Exportando roles..."
supabase db dump --project-ref "$PROJECT_ID" --role-only -f "$OUTPUT_DIR/roles.sql"

# 3. Exportar Datos (Opcional - puede tomar tiempo)
echo "3. Exportando datos..."
supabase db dump --project-ref "$PROJECT_ID" --data-only -f "$OUTPUT_DIR/data.sql"

if [ $? -eq 0 ]; then
    echo "✅ Datos exportados exitosamente en $OUTPUT_DIR/data.sql"
else
    echo "⚠️ Advertencia: Error al exportar datos o cancelado."
fi

echo "---"
echo "🎉 Proceso finalizado."
echo "Archivos generados en la carpeta '$OUTPUT_DIR/'."
