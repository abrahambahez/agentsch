import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { spawnSync } from "child_process";

function call(fn: string, args: Record<string, unknown> = {}): unknown {
  const payload = JSON.stringify(
    Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined && v !== null))
  );
  const code = `import scholartools,json,sys;a=json.loads(sys.argv[1]);print(json.dumps(scholartools.${fn}(**a).model_dump()))`;
  try {
    const result = spawnSync("python3", ["-c", code, payload], {
      encoding: "utf8",
      timeout: 30000,
    });
    if (result.status !== 0) return { ok: false, errors: [result.stderr.trim()] };
    return JSON.parse(result.stdout.trim());
  } catch (e) {
    return { ok: false, errors: [String(e)] };
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "st_list_references",
    description: "List all references in the local library (paginated).",
    parameters: Type.Object({
      page: Type.Optional(Type.Number({ description: "Page number, default 1" })),
    }),
    async execute({ page }) {
      return call("list_references", { page });
    },
  });

  pi.registerTool({
    name: "st_filter_references",
    description:
      "Search ONLY within the local saved library. Never use this to find new references. Filter by text query, author, year, type, or file presence.",
    parameters: Type.Object({
      query: Type.Optional(Type.String({ description: "Full-text search" })),
      author: Type.Optional(Type.String()),
      year: Type.Optional(Type.Number()),
      ref_type: Type.Optional(
        Type.String({ description: "e.g. article, book, inproceedings" })
      ),
      has_file: Type.Optional(Type.Boolean()),
      staging: Type.Optional(Type.Boolean({ description: "Search in staging area instead" })),
      page: Type.Optional(Type.Number()),
    }),
    async execute(args) {
      return call("filter_references", args);
    },
  });

  pi.registerTool({
    name: "st_get_reference",
    description: "Get a single reference by citekey or uid.",
    parameters: Type.Object({
      citekey: Type.Optional(Type.String()),
      uid: Type.Optional(Type.String()),
    }),
    async execute(args) {
      return call("get_reference", args);
    },
  });

  pi.registerTool({
    name: "st_discover_references",
    description:
      "Search ONLY external APIs (crossref, arxiv, openalex, semantic_scholar, doaj) for references not yet in the local library.",
    parameters: Type.Object({
      query: Type.String({ description: "Search terms" }),
      sources: Type.Optional(
        Type.Array(Type.String(), {
          description: "Limit to specific sources, e.g. ['arxiv', 'crossref']",
        })
      ),
      limit: Type.Optional(Type.Number({ description: "Max results, default 10" })),
    }),
    async execute(args) {
      return call("discover_references", args);
    },
  });

  pi.registerTool({
    name: "st_fetch_reference",
    description:
      "Fetch full metadata for a single reference from external APIs using a DOI, arXiv ID, or ISBN.",
    parameters: Type.Object({
      identifier: Type.String({ description: "DOI, arXiv ID, or ISBN" }),
    }),
    async execute({ identifier }) {
      return call("fetch_reference", { identifier });
    },
  });

  pi.registerTool({
    name: "st_add_reference",
    description: "Add a new reference directly to the local library.",
    parameters: Type.Object({
      ref: Type.Object(
        {
          citekey: Type.Optional(Type.String()),
          title: Type.String(),
          authors: Type.Array(Type.String()),
          year: Type.Optional(Type.Number()),
          ref_type: Type.Optional(Type.String()),
          doi: Type.Optional(Type.String()),
          url: Type.Optional(Type.String()),
          abstract: Type.Optional(Type.String()),
          source: Type.Optional(Type.String()),
        },
        { additionalProperties: true }
      ),
    }),
    async execute({ ref }) {
      return call("add_reference", { ref });
    },
  });

  pi.registerTool({
    name: "st_update_reference",
    description: "Update fields of an existing reference by citekey.",
    parameters: Type.Object({
      citekey: Type.String(),
      fields: Type.Record(Type.String(), Type.Unknown()),
    }),
    async execute({ citekey, fields }) {
      return call("update_reference", { citekey, fields });
    },
  });

  pi.registerTool({
    name: "st_rename_reference",
    description: "Rename the citekey of an existing reference.",
    parameters: Type.Object({
      old_key: Type.String(),
      new_key: Type.String(),
    }),
    async execute({ old_key, new_key }) {
      return call("rename_reference", { old_key, new_key });
    },
  });

  pi.registerTool({
    name: "st_delete_reference",
    description: "Delete a reference from the local library by citekey.",
    parameters: Type.Object({
      citekey: Type.String(),
    }),
    async execute({ citekey }) {
      return call("delete_reference", { citekey });
    },
  });

  pi.registerTool({
    name: "st_extract_from_file",
    description:
      "Extract reference metadata from a PDF or EPUB file using pdfplumber or LLM vision fallback.",
    parameters: Type.Object({
      file_path: Type.String({ description: "Absolute path to the file" }),
    }),
    async execute({ file_path }) {
      return call("extract_from_file", { file_path });
    },
  });

  pi.registerTool({
    name: "st_link_file",
    description: "Link a file (PDF/EPUB) to an existing reference by citekey.",
    parameters: Type.Object({
      citekey: Type.String(),
      file_path: Type.String({ description: "Absolute path to the file" }),
    }),
    async execute({ citekey, file_path }) {
      return call("link_file", { citekey, file_path });
    },
  });

  pi.registerTool({
    name: "st_unlink_file",
    description: "Remove the file association from a reference.",
    parameters: Type.Object({
      citekey: Type.String(),
    }),
    async execute({ citekey }) {
      return call("unlink_file", { citekey });
    },
  });

  pi.registerTool({
    name: "st_move_file",
    description: "Move/rename the linked file of a reference within the files directory.",
    parameters: Type.Object({
      citekey: Type.String(),
      dest_name: Type.String({ description: "New filename (not full path)" }),
    }),
    async execute({ citekey, dest_name }) {
      return call("move_file", { citekey, dest_name });
    },
  });

  pi.registerTool({
    name: "st_list_files",
    description: "List all files in the library files directory.",
    parameters: Type.Object({
      page: Type.Optional(Type.Number()),
    }),
    async execute({ page }) {
      return call("list_files", { page });
    },
  });

  pi.registerTool({
    name: "st_stage_reference",
    description:
      "Add a reference to the staging area (inbox) before merging into the library.",
    parameters: Type.Object({
      ref: Type.Object(
        {
          title: Type.String(),
          authors: Type.Array(Type.String()),
          year: Type.Optional(Type.Number()),
          ref_type: Type.Optional(Type.String()),
          doi: Type.Optional(Type.String()),
          url: Type.Optional(Type.String()),
          abstract: Type.Optional(Type.String()),
          source: Type.Optional(Type.String()),
        },
        { additionalProperties: true }
      ),
      file_path: Type.Optional(Type.String()),
    }),
    async execute({ ref, file_path }) {
      return call("stage_reference", { ref, file_path });
    },
  });

  pi.registerTool({
    name: "st_list_staged",
    description: "List references currently in the staging area.",
    parameters: Type.Object({
      page: Type.Optional(Type.Number()),
    }),
    async execute({ page }) {
      return call("list_staged", { page });
    },
  });

  pi.registerTool({
    name: "st_delete_staged",
    description: "Remove a reference from the staging area by citekey.",
    parameters: Type.Object({
      citekey: Type.String(),
    }),
    async execute({ citekey }) {
      return call("delete_staged", { citekey });
    },
  });

  pi.registerTool({
    name: "st_merge",
    description:
      "Merge staged references into the main library, with optional deduplication.",
    parameters: Type.Object({
      omit: Type.Optional(
        Type.Array(Type.String(), { description: "Citekeys to skip during merge" })
      ),
      allow_semantic: Type.Optional(
        Type.Boolean({ description: "Enable semantic similarity dedup, default false" })
      ),
    }),
    async execute(args) {
      return call("merge", args);
    },
  });
}
