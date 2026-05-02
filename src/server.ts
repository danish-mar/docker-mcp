import { FastMCP } from "fastmcp";

import { appConfig } from "./config.js";
import { createSessionToken } from "./lib/auth.js";
import { registerTools } from "./tools/index.js";
import { registerWebUiRoutes } from "./webui/routes.js";

export function createServer() {
  const server = new FastMCP({
    name: appConfig.serverName,
    version: appConfig.serverVersion,
    health: {
      enabled: true,
      message: "ok",
      path: "/health",
    },
  });

  registerTools(server);

  const app = server.getApp();
  const sessionToken = createSessionToken(
    appConfig.webUiPassword,
    appConfig.webUiSessionSecret,
  );

  registerWebUiRoutes({ app, sessionToken });

  return server;
}
