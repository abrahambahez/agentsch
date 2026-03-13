# Evals — scholartools agent (qwen3.5:2b)

Pruebas manuales. Criterio de éxito: **resultado final correcto** (tool seleccionado + parámetros + output sin alucinación). Guardrails y refusals fuera de scope en esta fase.

Marcar cada caso: ✅ pass / ❌ fail / ⚠️ pass parcial (anotar qué falló).

---

## 1. Consulta simple — biblioteca local

| # | Input | Tool esperado | Params clave | Pasa si |
|---|---|---|---|---|
| 1.1 | "muéstrame mis referencias" | `st_list_references` | — | devuelve lista real |
| 1.2 | "busca referencias de García" | `st_filter_references` | `author="García"` | filtra correctamente |
| 1.3 | "referencias de 2021" | `st_filter_references` | `year=2021` | filtra correctamente |
| 1.4 | "artículos con PDF adjunto" | `st_filter_references` | `has_file=true`, `ref_type="article"` | ambos params presentes |
| 1.5 | "busca 'redes neuronales' en mis referencias" | `st_filter_references` | `query="redes neuronales"` | no llama a `st_discover_references` |

> ⚠️ 1.5 es trampa de alucinación: el modelo podría confundir búsqueda local con búsqueda externa.

---

## 2. Búsqueda externa y adición

| # | Input | Flujo esperado | Pasa si |
|---|---|---|---|
| 2.1 | "busca papers sobre transformers" | `st_discover_references(query="transformers")` | devuelve resultados reales de APIs externas |
| 2.2 | "agrégame este DOI: 10.1145/3394486.3403168" | `st_fetch_reference` → `st_add_reference` | dos pasos en orden, referencia queda en biblioteca |
| 2.3 | "busca y agrega el paper de Vaswani sobre attention" | `st_discover_references` → confirma → `st_fetch_reference` → `st_add_reference` | pide confirmación antes de agregar |
| 2.4 | "busca solo en arxiv papers de LLMs" | `st_discover_references` | `sources=["arxiv"]` presente |

> ⚠️ 2.3: monitorear si el modelo se salta la confirmación y agrega directamente.

---

## 3. Procesamiento de PDF

| # | Input | Flujo esperado | Pasa si |
|---|---|---|---|
| 3.1 | "extrae los metadatos de /ruta/paper.pdf" | `st_extract_from_file` | devuelve metadatos reales del archivo |
| 3.2 | "agrega este PDF a mi biblioteca: /ruta/paper.pdf" | `st_extract_from_file` → confirma → `st_stage_reference` → `st_merge` | flujo completo en orden |
| 3.3 | "vincula /ruta/paper.pdf a García2021" | `st_link_file` | `citekey` y `file_path` correctos |

> ⚠️ 3.2: monitorear si inventa metadatos en lugar de usar los devueltos por extract.

---

## 4. Staging y merge

| # | Input | Flujo esperado | Pasa si |
|---|---|---|---|
| 4.1 | "muéstrame lo que tengo en staging" | `st_list_staged` | lista real del staging area |
| 4.2 | "elimina García2021 del staging" | `st_delete_staged` | `citekey="García2021"` correcto |
| 4.3 | "incorpora todo el staging a la biblioteca" | `st_merge` | ejecuta sin params extra |
| 4.4 | "incorpora el staging pero omite García2021" | `st_merge` | `omit=["García2021"]` presente |

---

## 5. Edición

| # | Input | Tool esperado | Pasa si |
|---|---|---|---|
| 5.1 | "cambia el año de García2021 a 2022" | `st_update_reference` | `citekey` y `fields={"year":2022}` correctos |
| 5.2 | "renombra García2021 a garcia2021b" | `st_rename_reference` | `old_key` y `new_key` correctos |
| 5.3 | "elimina la referencia García2021" | `st_delete_reference` | `citekey` correcto |

---

## Señales de alucinación a monitorear

- Inventa citekeys que no existen en la biblioteca
- Reporta que agregó una referencia sin haber llamado al tool
- Rellena parámetros opcionales con valores inventados (e.g. DOI falso)
- Confunde búsqueda local (`st_filter_references`) con búsqueda externa (`st_discover_references`)
- Inventa metadatos en flujos PDF en lugar de usar el resultado de `st_extract_from_file`
- Responde "listo" antes de que el tool devuelva `ok: true`
