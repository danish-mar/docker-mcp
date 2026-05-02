# Docker MCP Server

TypeScript MCP server for inspecting and operating a Docker host through [FastMCP](https://github.com/punkpeye/fastmcp). It exposes a streamable HTTP MCP endpoint plus a password-protected WebUI for server status.

## What It Provides

- Docker container, image, inspect, logs, stats, create, run, exec, and shell tools
- Enabled lifecycle tools for start, stop, restart, and remove
- FastMCP over streamable HTTP
- EJS monitoring dashboard
- `.env`-based configuration
- Health endpoint and protected WebUI routes

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Open these URLs locally:

- MCP endpoint: `http://127.0.0.1:8080/mcp`
- Health check: `http://127.0.0.1:8080/health`
- WebUI dashboard: `http://127.0.0.1:8080/dashboard`

## Environment Setup

Update `.env` with at least:

```bash
WEBUI_PASSWORD=your-password
WEBUI_SESSION_SECRET=your-session-secret
```

Available variables:

```bash
HOST=127.0.0.1
PORT=8080
MCP_ENDPOINT=/mcp
WEBUI_TITLE=Docker MCP Control Center
WEBUI_PASSWORD=change-me
WEBUI_SESSION_SECRET=replace-this-session-secret
DOCKER_COMMAND=docker
DOCKER_ENABLE_MUTATIONS=true
DOCKER_ENABLE_CONTAINER_CREATE=true
DOCKER_ENABLE_CONTAINER_EXEC=true
DOCKER_ENABLE_SHELL_EXEC=true
DOCKER_ALLOWED_IMAGES=*
DOCKER_TIMEOUT_MS=30000
DOCKER_EXEC_TIMEOUT_MS=30000
```

`DOCKER_ALLOWED_IMAGES=*` lets the client create containers from any image. Replace it with a comma-separated allowlist, such as `node:22-alpine,python:3.12-alpine`, if you want to narrow that later.

## Tools

- `docker_ps`: list containers
- `docker_images`: list images
- `docker_inspect`: inspect a Docker object
- `docker_logs`: read recent container logs
- `docker_stats`: read one-shot container stats
- `docker_pull_image`: pull an image
- `docker_create_container`: create a container from an image
- `docker_run_container`: create and start a container from an image
- `docker_exec`: execute an argv command inside a running container
- `docker_exec_shell`: execute a shell command inside a running container
- `docker_start`: start a container when mutations are enabled
- `docker_stop`: stop a container when mutations are enabled
- `docker_restart`: restart a container when mutations are enabled
- `docker_remove_container`: remove a container when mutations are enabled

## Scripts

```bash
npm run dev
npm run start
npm run build
npm run check
```

## Docker

The container needs access to a Docker daemon. The common local setup mounts the host Docker socket:

```bash
docker build -t docker-mcp .
docker run --rm \
  -p 8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e HOST=0.0.0.0 \
  -e PORT=8080 \
  -e WEBUI_PASSWORD=your-password \
  -e WEBUI_SESSION_SECRET=your-session-secret \
  docker-mcp
```

Mounting the Docker socket grants broad control over the host Docker daemon. Keep the WebUI password strong and expose the server only to trusted networks.
