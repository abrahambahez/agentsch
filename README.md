# agentsch

Entorno de pruebas para evaluar modelos pequeños como agente de gestión de referencias académicas con [scholartools](https://github.com/badlogic/pi-mono).

## Problema

Se busca un modelo local (inferencia en CPU/GPU consumer, vía Ollama) que pueda actuar como bridge confiable entre el usuario y una librería Python. El modelo **no escribe código**: selecciona tools predefinidos y extrae parámetros de instrucciones en lenguaje natural.

Restricciones duras:
- Inferencia local (Ollama, hardware consumer — sin GPU de datacenter)
- Tamaño: preferiblemente ≤4B parámetros, máximo ~8B
- Idioma de interacción: español
- Sin fine-tuning: solo prompt engineering + system prompt

## Tareas cognitivas requeridas

El agente debe manejar estas capacidades, en orden de dificultad:

1. **Selección de tool** — elegir el tool correcto entre 18 opciones con nombres y propósitos similares (ej. `st_filter_references` vs `st_discover_references`: búsqueda local vs externa)
2. **Extracción de parámetros** — mapear lenguaje natural a parámetros tipados (strings, ints, listas, booleans opcionales)
3. **Chaining multi-paso** — ejecutar flujos de 2–4 tools en secuencia sin saltarse pasos (ej. fetch → stage → merge)
4. **Resistencia a alucinación** — no inventar citekeys, DOIs, metadatos ni reportar éxito antes de recibir `ok: true` del tool
5. **Desambiguación por contexto** — distinguir "buscar en mi biblioteca" vs "buscar en internet" según la intención del usuario

## Patrones de falla observados

Señales concretas de fallo en pruebas manuales:
- Confunde `st_filter_references` (local) con `st_discover_references` (externo)
- Rellena parámetros opcionales con valores inventados (DOIs falsos, años arbitrarios)
- Inventa citekeys que no existen en la biblioteca
- Inventa metadatos en flujos PDF en lugar de usar el resultado de `st_extract_from_file`
- Reporta "listo" o "agregado" antes de que el tool devuelva `ok: true`
- Se salta confirmación del usuario en flujos destructivos o irreversibles

## Modelos evaluados

| Modelo | Params | Estado |
|--------|--------|--------|
| qwen2.5:3b | 3B | en prueba |
| qwen3.5:2b | 2B (razonador) | en prueba |

## Criterios de evaluación

Criterio de pass por caso: **tool correcto + parámetros correctos + output sin alucinación**.

Ver `docs/evals.md` para el checklist completo (5 categorías, ~18 casos).

No se evalúan en esta fase: guardrails, refusals, latencia, ni memoria a largo plazo.

## Enfoques de implementación

### pydantic-ai (`agent.py`)

Agente conversacional Python con [pydantic-ai](https://ai.pydantic.dev/). Se conecta a Ollama vía API compatible con OpenAI.

```bash
uv sync
uv run agent.py --model qwen2.5:3b
```

### pi-agent (`.pi/`)

18 tools tipados en TypeScript que invocan scholartools vía `python3`, usados con [pi-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent).

```bash
pi --model qwen3.5:2b
```

## Estructura

```
agent.py                        # agente pydantic-ai (REPL conversacional)
pyproject.toml
.pi/
├── SYSTEM.md
├── extensions/scholartools.ts  # 18 tools tipados
└── skills/scholartools/SKILL.md
docs/
└── evals.md                    # checklist de pruebas manuales
```
