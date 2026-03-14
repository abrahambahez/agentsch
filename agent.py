import functools
import re
import sys
from pathlib import Path
from pydantic_ai import Agent
from pydantic_ai.messages import ModelResponse, TextPart, ThinkingPart
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
import scholartools

DEFAULT_MODEL = "qwen2.5:3b"
SYSTEM = (Path(__file__).parent / "SYSTEM.md").read_text()

_model_name = next(
    (sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--model" and i + 1 < len(sys.argv)),
    DEFAULT_MODEL,
)
_provider = (
    OpenAIProvider(base_url="http://localhost:11434/v1") if ":" in _model_name else OpenAIProvider()
)

agent = Agent(
    OpenAIChatModel(_model_name, provider=_provider),
    system_prompt=SYSTEM,
)


def tool(fn):
    @functools.wraps(fn)
    def wrapper(**kwargs):
        shown = {k: v for k, v in kwargs.items() if v is not None and v is not False}
        print(f"  [→] {fn.__name__}({shown})")
        result = fn(**kwargs)
        ok = result.get("ok", "?")
        print(f"  [←] ok={ok}")
        return result
    return agent.tool_plain(wrapper)


@tool
def st_list_references(page: int = 1) -> dict:
    return scholartools.list_references(page=page).model_dump()


@tool
def st_filter_references(
    query: str | None = None,
    author: str | None = None,
    year: int | None = None,
    ref_type: str | None = None,
    has_file: bool | None = None,
    staging: bool = False,
    page: int = 1,
) -> dict:
    """Search ONLY within the local saved library. Never use to find new references.

    Args:
        query: Free-text search within titles only. Do NOT use for author names.
        author: Filter by author name (family, given, or full name like 'David Graeber').
        year: Filter by publication year.
        ref_type: Filter by reference type (e.g. 'book', 'article').
        has_file: Filter by whether a file is attached.
        staging: Search in staging area instead of main library.
        page: Page number for pagination.
    """
    return scholartools.filter_references(
        query=query,
        author=author,
        year=year,
        ref_type=ref_type,
        has_file=has_file,
        staging=staging,
        page=page,
    ).model_dump()


@tool
def st_get_reference(citekey: str | None = None, uid: str | None = None) -> dict:
    return scholartools.get_reference(citekey=citekey, uid=uid).model_dump()


@tool
def st_discover_references(
    query: str,
    sources: list[str] | None = None,
    limit: int = 10,
) -> dict:
    """Search ONLY external APIs for references not yet in the local library."""
    return scholartools.discover_references(
        query=query, sources=sources, limit=limit
    ).model_dump()


@tool
def st_fetch_reference(identifier: str) -> dict:
    """Fetch full metadata using a DOI, arXiv ID, or ISBN."""
    return scholartools.fetch_reference(identifier).model_dump()


@tool
def st_add_reference(ref: dict) -> dict:
    """Add a reference directly to the local library (bypasses staging)."""
    return scholartools.add_reference(ref).model_dump()


@tool
def st_update_reference(citekey: str, fields: dict) -> dict:
    return scholartools.update_reference(citekey, fields).model_dump()


@tool
def st_rename_reference(old_key: str, new_key: str) -> dict:
    return scholartools.rename_reference(old_key, new_key).model_dump()


@tool
def st_delete_reference(citekey: str) -> dict:
    return scholartools.delete_reference(citekey).model_dump()


@tool
def st_extract_from_file(file_path: str) -> dict:
    """Extract reference metadata from a PDF or EPUB file."""
    return scholartools.extract_from_file(file_path).model_dump()


@tool
def st_link_file(citekey: str, file_path: str) -> dict:
    return scholartools.link_file(citekey, file_path).model_dump()


@tool
def st_unlink_file(citekey: str) -> dict:
    return scholartools.unlink_file(citekey).model_dump()


@tool
def st_move_file(citekey: str, dest_name: str) -> dict:
    return scholartools.move_file(citekey, dest_name).model_dump()


@tool
def st_list_files(page: int = 1) -> dict:
    return scholartools.list_files(page=page).model_dump()


@tool
def st_stage_reference(ref: dict, file_path: str | None = None) -> dict:
    """Add a reference to the staging area before merging into the library."""
    return scholartools.stage_reference(ref, file_path).model_dump()


@tool
def st_list_staged(page: int = 1) -> dict:
    return scholartools.list_staged(page=page).model_dump()


@tool
def st_delete_staged(citekey: str) -> dict:
    return scholartools.delete_staged(citekey).model_dump()


@tool
def st_merge(omit: list[str] | None = None, allow_semantic: bool = False) -> dict:
    return scholartools.merge(omit=omit, allow_semantic=allow_semantic).model_dump()


if __name__ == "__main__":
    print(f"scholartools agent · {_model_name}")
    print("Escribe 'salir' para terminar.\n")
    history = []
    while True:
        user = input(">>> ").strip()
        if user.lower() in ("salir", "exit", "quit"):
            break
        if not user:
            continue
        print("  [iniciando...]")
        result = agent.run_sync(user, message_history=history)
        history = result.all_messages()
        for msg in result.new_messages():
            if isinstance(msg, ModelResponse):
                thinking = None
                for part in msg.parts:
                    if isinstance(part, ThinkingPart):
                        thinking = part.content
                    elif isinstance(part, TextPart):
                        m = re.search(r"<think>(.*?)</think>", part.content, re.DOTALL)
                        if m:
                            thinking = m.group(1).strip()
                if thinking:
                    print(f"\033[2m── thinking ──\n{thinking}\n──────────────\033[0m\n")
        print(result.output)
