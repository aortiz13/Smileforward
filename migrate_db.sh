#!/bin/bash

# Este script replica una base de datos de origen a un destino.
# ADVERTENCIA: Esto borrará y recreará el esquema en el destino.

SOURCE_PROJECT="cjixvpsczmqhevvwqxcd"
TARGET_PROJECT="jgnvjqfvlgljmwwazmea"
MIGRATION_DIR="migration_temp"

echo "==================================================="
echo "REPLICACIÓN DE BASE DE DATOS"
echo "Origen: $SOURCE_PROJECT"
echo "Destino: $TARGET_PROJECT"
echo "==================================================="
echo "⚠️  ADVERTENCIA: Esto SOBREESCRIBIRÁ la base de datos en el destino ($TARGET_PROJECT)."
echo "Asegúrate de tener un respaldo si es necesario."
echo "==================================================="
read -p "¿Estás seguro de continuar? (s/n): " confirm
if [[ $confirm != "s" && $confirm != "S" ]]; then
    echo "Operación cancelada."
    exit 1
fi

mkdir -p "$MIGRATION_DIR"

# 1. Exportar Origen
echo "\n1. Exportando esquema y datos del origen ($SOURCE_PROJECT)..."
supabase db dump --project-ref "$SOURCE_PROJECT" -f "$MIGRATION_DIR/schema.sql"
supabase db dump --project-ref "$SOURCE_PROJECT" --data-only -f "$MIGRATION_DIR/data.sql"
supabase db dump --project-ref "$SOURCE_PROJECT" --role-only -f "$MIGRATION_DIR/roles.sql"

if [ $? -ne 0 ]; then
    echo "❌ Error al exportar. Verifica tus credenciales del origen."
    exit 1
fi

# 2. Resetear Destino (Opcional, pero recomendado para una réplica limpia)
echo "\n2. ¿Deseas resetear la base de datos de destino antes de importar? (Recomendado)"
echo "Esto ejecutará 'supabase db reset' (si es local) o tendrás que hacerlo manualmente si es remoto."
echo "Para proyectos remotos, es mejor aplicar el esquema sobre lo existente o borrar manualmente."
echo "Nota: 'db push' intentará aplicar cambios. Si hay conflictos, fallará."

# En remoto, no hay un 'db reset' directo seguro vía CLI sin interacción compleja.
# Usaremos 'db push' o conexión directa psql para importar.

echo "\n3. Importando al destino ($TARGET_PROJECT)..."
echo "Se te pedirá la contraseña del proyecto DESTINO ($TARGET_PROJECT)."

# Opción A: Usar psql directamente si es posible (requiere string de conexión, que no tenemos fácil)
# Opción B: Usar `supabase db push` no sirve para restaurar dumps completos SQL.
# Opción C: Usar `supabase link` y luego psql < file.sql

# Vamos a intentar vincular temporalmente al destino para usar la configuración de la CLI
echo "Vinculando al proyecto destino..."
supabase link --project-ref "$TARGET_PROJECT"

# Obtener la URL de conexión de la base de datos es difícil sin password en texto plano.
# La mejor forma interactiva es usar el comando de psql que ofrece supabase.

echo "\nInstrucciones para importar:"
echo "La CLI no permite una importación automática desatendida de archivos SQL grandes a remoto sin configuración extra."
echo "Se ha descargado el esquema y datos en '$MIGRATION_DIR/'."
echo ""
echo "Para completar la importación, ejecuta los siguientes comandos manualmente (te pedirá la contraseña del destino):"
echo ""
echo "  supabase projects list # Para ver tus proyectos"
echo "  # Si tienes la URL de conexión (postgres://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres):"
echo "  # psql \"postgres://...\" < $MIGRATION_DIR/roles.sql"
echo "  # psql \"postgres://...\" < $MIGRATION_DIR/schema.sql"
echo "  # psql \"postgres://...\" < $MIGRATION_DIR/data.sql"
echo ""
echo "O usando la CLI si soporta input directo (experimental):"
echo "  supabase db reset --remote # ¡CUIDADO! Borra todo"
echo "  supabase db push --remote  # Aplica migraciones locales si las moviste a supabase/migrations"

# Mover schema a migraciones para intentar un push limpio?
# Es arriesgado automático. Mejor dejamos los archivos listos.

echo "\n✅ Archivos listos en $MIGRATION_DIR"
echo "Schema: $MIGRATION_DIR/schema.sql"
echo "Data:   $MIGRATION_DIR/data.sql"
echo "Roles:  $MIGRATION_DIR/roles.sql"

