# agentsch

Entorno de pruebas minimalista para evaluar modelos pequeños (ej. qwen2.5:3b) como agente de gestión de referencias académicas con [scholartools](https://github.com/badlogic/pi-mono).

## Objetivo

Validar si un modelo pequeño (2–3B parámetros) puede actuar como bridge confiable entre el usuario y una librería Python cuando:
- Las acciones están predefinidas como tools tipados (no escribe código)
- El comportamiento está acotado por un system prompt estricto

No se evalúan guardrails ni refusals — solo corrección del resultado final.

## Enfoques

### pydantic-ai (`agent.py`)

Agente conversacional en Python puro usando [pydantic-ai](https://ai.pydantic.dev/). Conecta con un modelo local vía Ollama (OpenAI-compatible API) o con la API de OpenAI.

```bash
# Instalar dependencias
uv sync

# Lanzar con modelo local (Ollama)
uv run agent.py --model qwen2.5:3b

# Lanzar con modelo remoto
OPENAI_API_KEY=... uv run agent.py --model gpt-4o-mini
```

### pi-agent (`.pi/`)

Pruebas con [pi-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent): 18 tools tipados en TypeScript que invocan scholartools vía `python3`.

```bash
# Instalar scholartools en el Python accesible por pi
pip install -e /ruta/a/scholartools

# Registrar la extensión en .pi/settings.json
{
  "extensions": [".pi/extensions/scholartools.ts"],
  "skills": [".pi/skills"]
}

# Lanzar pi con qwen3.5:2b
pi --model qwen3.5:2b
```

## Estructura

```
agent.py                        # agente pydantic-ai (REPL conversacional)
pyproject.toml
.pi/
├── SYSTEM.md                   # system prompt para pi-agent
├── extensions/
│   └── scholartools.ts         # 18 tools tipados → llaman a scholartools vía python3
└── skills/
    └── scholartools/
        └── SKILL.md            # flujos multi-paso: buscar, PDFs, staging, merge
docs/
└── evals.md                    # checklist de pruebas manuales
```

## Evaluación

Ver `docs/evals.md`. Criterio de pass: tool correcto + parámetros correctos + output sin alucinación.
