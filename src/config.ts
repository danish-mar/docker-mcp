import dotenv from "dotenv";

dotenv.config();

export const appConfig = {
  dockerAllowedImages: (process.env.DOCKER_ALLOWED_IMAGES ?? "*")
    .split(",")
    .map((image) => image.trim())
    .filter(Boolean),
  dockerCommand: process.env.DOCKER_COMMAND ?? "docker",
  dockerEnableContainerCreate:
    process.env.DOCKER_ENABLE_CONTAINER_CREATE === "true",
  dockerEnableContainerExec: process.env.DOCKER_ENABLE_CONTAINER_EXEC === "true",
  dockerEnableMutations: process.env.DOCKER_ENABLE_MUTATIONS === "true",
  dockerEnableShellExec: process.env.DOCKER_ENABLE_SHELL_EXEC === "true",
  dockerExecTimeoutMs: Number(process.env.DOCKER_EXEC_TIMEOUT_MS ?? "30000"),
  dockerTimeoutMs: Number(process.env.DOCKER_TIMEOUT_MS ?? "30000"),
  host: process.env.HOST ?? "127.0.0.1",
  mcpEndpoint: (process.env.MCP_ENDPOINT ?? "/mcp") as `/${string}`,
  port: Number(process.env.PORT ?? "8080"),
  serverName: "docker-mcp",
  serverVersion: "1.0.0" as const,
  webUiPassword: process.env.WEBUI_PASSWORD ?? "change-me",
  webUiSessionSecret:
    process.env.WEBUI_SESSION_SECRET ?? "replace-this-session-secret",
  webUiTitle: process.env.WEBUI_TITLE ?? "Docker MCP Control Center",
};

export function getPublicEnvSummary() {
  return [
    { key: "HOST", value: appConfig.host },
    { key: "PORT", value: String(appConfig.port) },
    { key: "MCP_ENDPOINT", value: appConfig.mcpEndpoint },
    { key: "WEBUI_TITLE", value: appConfig.webUiTitle },
    { key: "DOCKER_COMMAND", value: appConfig.dockerCommand },
    {
      key: "DOCKER_ENABLE_MUTATIONS",
      value: appConfig.dockerEnableMutations ? "true" : "false",
    },
    {
      key: "DOCKER_ENABLE_CONTAINER_CREATE",
      value: appConfig.dockerEnableContainerCreate ? "true" : "false",
    },
    {
      key: "DOCKER_ENABLE_CONTAINER_EXEC",
      value: appConfig.dockerEnableContainerExec ? "true" : "false",
    },
    {
      key: "DOCKER_ENABLE_SHELL_EXEC",
      value: appConfig.dockerEnableShellExec ? "true" : "false",
    },
    { key: "DOCKER_ALLOWED_IMAGES", value: appConfig.dockerAllowedImages.join(",") },
    { key: "DOCKER_TIMEOUT_MS", value: String(appConfig.dockerTimeoutMs) },
    { key: "DOCKER_EXEC_TIMEOUT_MS", value: String(appConfig.dockerExecTimeoutMs) },
  ];
}
