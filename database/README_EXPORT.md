# Exportar Base de Datos Supabase

Para exportar la base de datos completa de tu proyecto `cjixvpsczmqhevvwqxcd` y poder importarla en otro proyecto, sigue estos pasos utilizando la CLI de Supabase que ya tienes instalada.

## 1. Login (si es necesario)
Si no has iniciado sesión recientemente, ejecuta:
```bash
supabase login
```
Sigue las instrucciones en pantalla para autenticarte con tu cuenta de Supabase.

## 2. Vincular Proyecto (Opcional pero recomendado)
Para facilitar los comandos, vincula tu carpeta actual al proyecto remoto:
```bash
supabase link --project-ref cjixvpsczmqhevvwqxcd
```
Te pedirá la contraseña de la base de datos de tu proyecto.

## 3. Exportar Esquema (Tablas, Funciones, Triggers)
Este comando guardará la estructura de tu base de datos en el archivo `schema.sql`. Esto es lo que necesitas para recrear la estructura en otro proyecto.

```bash
supabase db dump --project-ref cjixvpsczmqhevvwqxcd -f database/schema.sql
```

## 4. Exportar Datos (Opcional)
Si también deseas exportar los datos (el contenido de las tablas), ejecuta:

```bash
supabase db dump --project-ref cjixvpsczmqhevvwqxcd --data-only -f database/data.sql
```
*Nota: Exportar todos los datos de producción puede tomar tiempo y generar un archivo grande.*

## 5. Exportar Roles y Permisos (Opcional)
Si tienes roles personalizados:

```bash
supabase db dump --project-ref cjixvpsczmqhevvwqxcd --role-only -f database/roles.sql
```

---

## Cómo Importar en Otro Proyecto
Una vez tengas los archivos `.sql`, puedes importarlos en tu nuevo proyecto de Supabase:

1.  Ve al Dashboard de tu nuevo proyecto > SQL Editor.
2.  Copia y pega el contenido de `schema.sql` y ejecútalo.
3.  (Opcional) Haz lo mismo con `data.sql` si exportaste los datos.

Alternativamente, usando la CLI para el nuevo proyecto:
```bash
supabase db push --project-ref <NUEVO_PROJECT_ID>
```
(Asegúrate de que los archivos estén en la carpeta `supabase/migrations` si usas `db push`, o usa `psql` para importarlos manualmente).
