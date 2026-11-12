# @cutoutlabs/mcp

MCP server for [Cutout Labs](https://www.cutoutlabs.com). It lets AI agents remove image backgrounds from local files or URLs and saves the transparent PNG next to the input.

## Setup

1. Get a free API key at https://www.cutoutlabs.com/background-removal-api
2. Add the server to your MCP client (Claude Desktop, Cursor, VS Code, and others):

```json
{
  "mcpServers": {
    "cutoutlabs": {
      "command": "npx",
      "args": ["-y", "@cutoutlabs/mcp"],
      "env": { "CUTOUTLABS_API_KEY": "your-key" }
    }
  }
}
```

No local install? Use the hosted server instead: `https://api.cutoutlabs.com/mcp` with the header `Authorization: Bearer your-key`. The hosted server takes image URLs or base64 and returns the image inline.

## Tools

- `remove_background`: `input_path` or `image_url`, plus optional `output_path`, `size` (`preview`, `medium`, `hd`, `full`), `format` (`png`, `webp`, `jpg`), `bg_color`, `crop`, `roi` (keep only the subject inside `x1 y1 x2 y2`), `clean_edges` (remove coloured fringes), `overwrite`. Saves the result and returns its path.
- `get_quota`: free calls left today. The quota resets at 00:00 UTC.

## Limits

Inputs up to 12 MB. Free daily quota per key during launch.

## License

MIT
