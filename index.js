#!/usr/bin/env node
import { access, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = (
  process.env.CUTOUTLABS_API_URL ?? "https://api.cutoutlabs.com"
).replace(/\/$/, "");
const API_KEY = process.env.CUTOUTLABS_API_KEY;
const SIGNUP_URL = "https://www.cutoutlabs.com/background-removal-api";
const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const text = (value) => ({ content: [{ type: "text", text: value }] });
const failure = (value) => ({ ...text(value), isError: true });
const missingKey = () =>
  failure(
    `CUTOUTLABS_API_KEY is not set. Get a free key at ${SIGNUP_URL} and add it to this server's env.`,
  );

async function errorMessage(response) {
  const body = await response.json().catch(() => undefined);
  return (
    body?.errors?.[0]?.title ?? `Request failed with HTTP ${response.status}.`
  );
}

async function exists(file) {
  return access(file).then(
    () => true,
    () => false,
  );
}

const server = new McpServer({
  name: "cutoutlabs",
  title: "Cutout Labs",
  version: "0.2.1",
});

server.registerTool(
  "remove_background",
  {
    title: "Remove image background",
    description:
      "Remove the background from a local image file or an image URL and save the result to disk. Returns the saved file path. Provide exactly one of input_path or image_url. When several objects or a person and a product appear together, the model may keep or drop some of them (for example a hand holding a product); use roi to restrict the subject area. Parts of a subject hidden behind something else cannot be recovered.",
    inputSchema: {
      input_path: z
        .string()
        .optional()
        .describe("Path to a local JPG, PNG or WebP image (max 12 MB)."),
      image_url: z
        .string()
        .url()
        .optional()
        .describe("Public http(s) URL of the source image."),
      output_path: z
        .string()
        .optional()
        .describe(
          "Where to save the result. Defaults to '<input name>-no-bg.<ext>' next to the input, or the current directory for URLs.",
        ),
      size: z
        .enum(["preview", "medium", "hd", "full"])
        .default("full")
        .describe(
          "preview ≈ 0.25 MP, medium 1.5 MP, hd 4 MP, full up to 25 MP.",
        ),
      format: z.enum(["png", "webp", "jpg"]).default("png"),
      bg_color: z
        .string()
        .optional()
        .describe(
          "Background colour such as ffffff or white. Omit for transparency.",
        ),
      crop: z
        .boolean()
        .default(false)
        .describe("Crop the output to the subject."),
      roi: z
        .string()
        .optional()
        .describe(
          "Region of interest as 'x1 y1 x2 y2' in px or %, e.g. '20% 10% 80% 95%'. Only the subject inside this box is kept.",
        ),
      clean_edges: z
        .boolean()
        .default(false)
        .describe(
          "Remove coloured fringes from the old background in hair, fur, and soft edges.",
        ),
      overwrite: z
        .boolean()
        .default(false)
        .describe("Replace output_path if it already exists."),
    },
    annotations: { destructiveHint: false, openWorldHint: true },
  },
  async ({
    input_path,
    image_url,
    output_path,
    size,
    format,
    bg_color,
    crop,
    roi,
    clean_edges,
    overwrite,
  }) => {
    if (!API_KEY) return missingKey();
    if (Boolean(input_path) === Boolean(image_url))
      return failure("Provide exactly one of input_path or image_url.");

    const form = new FormData();
    if (input_path) {
      const source = path.resolve(input_path);
      const info = await stat(source).catch(() => undefined);
      if (!info?.isFile()) return failure(`File not found: ${source}`);
      if (info.size > MAX_INPUT_BYTES) return failure("Image exceeds 12 MB.");
      form.append(
        "image_file",
        new Blob([await readFile(source)]),
        path.basename(source),
      );
    } else {
      form.append("image_url", image_url);
    }
    form.append("size", size);
    form.append("format", format);
    form.append("crop", String(crop));
    form.append("clean_edges", String(clean_edges));
    if (roi) form.append("roi", roi);
    if (bg_color) form.append("bg_color", bg_color);

    const response = await fetch(`${API_URL}/v1.0/removebg`, {
      method: "POST",
      headers: { "X-Api-Key": API_KEY },
      body: form,
      signal: AbortSignal.timeout(180_000),
    });
    if (!response.ok) return failure(await errorMessage(response));

    const extension =
      EXTENSIONS[response.headers.get("content-type")] ?? format;
    const target = path.resolve(
      output_path ??
        (input_path
          ? path.join(
              path.dirname(input_path),
              `${path.parse(input_path).name}-no-bg.${extension}`,
            )
          : `cutout-${Date.now()}.${extension}`),
    );
    if (!overwrite && (await exists(target)))
      return failure(
        `${target} already exists. Pass overwrite: true or another output_path.`,
      );
    await writeFile(target, Buffer.from(await response.arrayBuffer()));

    const width = response.headers.get("x-width");
    const height = response.headers.get("x-height");
    const remaining = response.headers.get("x-quota-remaining");
    return text(
      `Saved ${target}${width && height ? ` (${width}×${height})` : ""}. ${remaining ?? "?"} free calls left today.`,
    );
  },
);

server.registerTool(
  "get_quota",
  {
    title: "Check remaining free calls",
    description: "Return how many free remove_background calls remain today.",
    annotations: { readOnlyHint: true },
  },
  async () => {
    if (!API_KEY) return missingKey();
    const response = await fetch(`${API_URL}/v1.0/account`, {
      headers: { "X-Api-Key": API_KEY },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return failure(await errorMessage(response));
    const body = await response.json();
    return text(
      `${body.data.attributes.api.free_calls} free calls left today. Resets at 00:00 UTC.`,
    );
  },
);

await server.connect(new StdioServerTransport());
