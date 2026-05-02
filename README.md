# 🐳 Docker MCP Server

[![Docker Build & Publish](https://github.com/keqing-pc/docker-mcp/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/keqing-pc/docker-mcp/actions/workflows/docker-publish.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![FastMCP](https://img.shields.io/badge/Built%20with-FastMCP-green.svg)](https://github.com/punkpeye/fastmcp)

A high-performance [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides an interface for LLMs to manage and interact with a Docker host. Built with TypeScript and FastMCP, it offers deep inspection, lifecycle management, and interactive execution capabilities.

---

## ✨ Key Features

- **🚀 Full Lifecycle Management**: Create, run, start, stop, restart, and remove containers effortlessly.
- **🐚 Interactive Execution**: Execute commands or full shell sessions inside running containers.
- **📊 Real-time Monitoring**: Stream logs and capture one-shot stats for performance analysis.
- **🛡️ Secure by Design**: Configurable image allowlists, mutation toggles, and password-protected WebUI.
- **💎 Premium Dev Experience**: `keepAlive` mode for interactive containers—automatically injects `sleep infinity` and overrides custom entrypoints (e.g., `alpine/git`) to keep environments operational for LLM tasks.
- **🖥️ Dashboard**: Built-in EJS-powered web interface for health monitoring and server status.

---

## 🛠️ Tools Provided

| Tool | Description |
| :--- | :--- |
| `docker_ps` | List all containers (active or all). |
| `docker_images` | List available images on the host. |
| `docker_inspect` | Get detailed JSON metadata for any Docker object. |
| `docker_logs` | Retrieve recent logs with tail and timestamp support. |
| `docker_stats` | Get a resource usage snapshot. |
| `docker_pull_image` | Pull new images from registries. |
| `docker_run_container` | The Swiss army knife: Create and start containers with advanced options. |
| `docker_exec_shell` | Run complex shell commands inside a container. |
| `docker_remove_container`| Safely or forcefully remove containers. |

---

## 🚀 Quick Start

### Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your desired credentials
   ```

3. **Launch**:
   ```bash
   npm run dev
   ```

### Running with Docker Compose (Recommended)

```yaml
services:
  docker-mcp:
    image: ghcr.io/your-username/docker-mcp:latest
    ports:
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WEBUI_PASSWORD=your-secure-password
      - WEBUI_SESSION_SECRET=your-secret-key
```

```bash
docker-compose up -d
```

---

## ⚙️ Configuration

Control the server via environment variables:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8080` | Server port. |
| `DOCKER_ENABLE_MUTATIONS` | `true` | Allow destructive actions (stop, rm, etc). |
| `DOCKER_ALLOWED_IMAGES` | `*` | Comma-separated list of allowed images. |
| `WEBUI_PASSWORD` | `change-me` | Password for the dashboard. |
| `DOCKER_TIMEOUT_MS` | `30000` | Default timeout for Docker operations. |

---

## 🧪 The `keepAlive` Feature

When creating containers for LLM tasks, use `keepAlive: true`. This ensures that even images with specific entrypoints (like `alpine/git` which defaults to `git`) are overridden with a `sleep infinity` loop, allowing you to `exec` into them later without the container exiting immediately.

---

## 🔒 Security Note

This server requires access to the Docker socket (`/var/run/docker.sock`). **Do not expose this server to the public internet without additional authentication layers.** It is intended for local use or within a secure, private network.

---

## 📄 License

MIT © 2024
