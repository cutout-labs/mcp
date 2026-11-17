// Starts the server over stdio with no API key and checks what MCP directories inspect:
// the server starts, lists its tools, and explains a missing key instead of crashing.
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const env = { ...process.env };
delete env.CUTOUTLABS_API_KEY;

const client = new Client({ name: "smoke-test", version: "1.0.0" });
await client.connect(
  new StdioClientTransport({ command: process.execPath, args: ["index.js"], env }),
);

const { tools } = await client.listTools();
assert.deepEqual(tools.map((tool) => tool.name).sort(), [
  "get_quota",
  "remove_background",
]);

const quota = await client.callTool({ name: "get_quota", arguments: {} });
assert.equal(quota.isError, true);
assert.match(quota.content[0].text, /CUTOUTLABS_API_KEY is not set/);

await client.close();
console.log(`OK: ${tools.length} tools listed`);
