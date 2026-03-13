---
name: scholartools
description: "Manage an academic reference library. Use this skill for multi-step workflows: searching and adding references, processing PDFs, staging and merging batches, deduplication, and file management. Requires scholartools extension tools (st_*)."
allowed-tools: st_list_references st_filter_references st_get_reference st_discover_references st_fetch_reference st_add_reference st_update_reference st_rename_reference st_delete_reference st_extract_from_file st_link_file st_unlink_file st_move_file st_list_files st_stage_reference st_list_staged st_delete_staged st_merge
---

# scholartools

Biblioteca de gestión de referencias académicas. Todos los flujos usan las herramientas `st_*`.

## Flujos principales

### Buscar y agregar una referencia

1. `st_discover_references` con la consulta del usuario.
2. Mostrar resultados: título, autores, año, fuente.
3. Esperar confirmación del usuario sobre qué referencia agregar.
4. `st_fetch_reference` con el DOI o identificador para obtener metadatos completos.
5. `st_add_reference` con los metadatos obtenidos.

### Procesar un PDF

1. `st_extract_from_file` con la ruta del archivo.
2. Mostrar los metadatos extraídos al usuario para confirmación.
3. Si el usuario confirma: `st_stage_reference` con los metadatos y la ruta del archivo.
4. Cuando el usuario quiera incorporarlo: `st_merge`.

### Agregar por lotes (staging workflow)

1. Para cada referencia: `st_stage_reference`.
2. Revisar con `st_list_staged`.
3. Eliminar entradas no deseadas con `st_delete_staged`.
4. `st_merge` para incorporar todo al a biblioteca principal.

### Deduplicar la biblioteca

1. `st_merge` con `allow_semantic: true`.
2. Reportar el resultado: cuántos duplicados se encontraron y resolvieron.

### Buscar en la biblioteca local

- Búsqueda libre: `st_filter_references` con `query`.
- Por autor: `st_filter_references` con `author`.
- Por año: `st_filter_references` con `year`.
- Solo referencias con archivo adjunto: `st_filter_references` con `has_file: true`.
- Combinar filtros según lo que pida el usuario.

### Gestionar archivos

- Vincular un PDF existente a una referencia: `st_link_file`.
- Desvincular: `st_unlink_file`.
- Renombrar el archivo: `st_move_file`.
- Ver todos los archivos: `st_list_files`.

## Manejo de errores

- Si `ok: false` en cualquier resultado, reportar `errors` literalmente y preguntar al usuario cómo proceder.
- Si `st_discover_references` devuelve lista vacía, sugerir reformular la búsqueda o probar otras fuentes.
- Si `st_extract_from_file` falla, pedir al usuario que verifique la ruta y que el archivo sea PDF o EPUB.
