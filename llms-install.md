# Installing the Cutout Labs MCP server

These steps are for an AI agent (such as Cline) setting up this server for a user.

## 1. Get an API key

The server needs a Cutout Labs API key. Ask the user for theirs. If they don't have one, tell them to get a free key at https://www.cutoutlabs.com/background-removal-api: they enter their email, open the sign-in link, and copy the key that starts with `cl_live_`. Don't make up a key or continue without one.

## 2. Add the server

No clone or build is needed. The server runs from npm with `npx` and needs Node.js 20 or later (check with `node --version`).

Add this entry to the MCP settings file (for Cline, `cline_mcp_settings.json`), replacing `your-key` with the user's key:

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

Keep any servers already in the file.

## 3. Check that it works

Call the `get_quota` tool. It should reply with the number of free calls left this month. If it says `CUTOUTLABS_API_KEY is not set` or `Invalid API key`, check the key in the settings file and restart the server.

## Using it

- `remove_background` takes exactly one of `input_path` (a local JPG, PNG or WebP up to 12 MB) or `image_url`, and saves a transparent PNG next to the input by default. Optional: `output_path`, `size`, `format`, `bg_color`, `crop`, `roi`, `clean_edges`, `overwrite`.
- `get_quota` returns the calls left this month. The quota resets on the 1st of each month at 00:00 UTC.
