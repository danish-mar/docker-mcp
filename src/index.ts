import { appConfig } from "./config.js";
import { createServer } from "./server.js";

const server = createServer();

await server.start({
  transportType: "httpStream",
  httpStream: {
    host: appConfig.host,
    port: appConfig.port,
    endpoint: appConfig.mcpEndpoint,
  },
});

if (appConfig.webUiPassword === "change-me") {
  console.warn(
    "[Docker MCP warning] WEBUI_PASSWORD is using the default value. Set it in .env before exposing this server.",
  );
}

console.log(
  `Docker MCP HTTP server listening on http://${appConfig.host}:${appConfig.port}${appConfig.mcpEndpoint}`,
);
console.log(`Docker MCP WebUI available at http://${appConfig.host}:${appConfig.port}/dashboard`);
