import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { FastMCP } from "fastmcp";
import { z } from "zod";

import { appConfig } from "../config.js";

const execFileAsync = promisify(execFile);
const containerRefSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:/-]*$/, "Use a Docker container name or ID.");
const dockerImageSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:/@-]*$/, "Use a Docker image reference.");
const dockerNameSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/, "Use a Docker-compatible name.");
const keyValueSchema = z
  .string()
  .min(1)
  .max(1024)
  .regex(/^[A-Za-z_][A-Za-z0-9_]*=.*$/, "Use KEY=value format.");
const mountSchema = z
  .string()
  .min(1)
  .max(2048)
  .describe("Docker mount spec, such as source:/target or volume-name:/workspace.");
const portSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[0-9.:/-]+$/, "Use Docker port format, such as 8080:80.");

export const registeredToolInfo = [
  {
    description: "List Docker containers, optionally including stopped containers.",
    name: "docker_ps",
  },
  {
    description: "List Docker images available on the host.",
    name: "docker_images",
  },
  {
    description: "Inspect a Docker object by container, image, volume, or network name/ID.",
    name: "docker_inspect",
  },
  {
    description: "Read recent logs from a Docker container.",
    name: "docker_logs",
  },
  {
    description: "Read a one-shot Docker container stats snapshot.",
    name: "docker_stats",
  },
  {
    description: "Pull a Docker image.",
    name: "docker_pull_image",
  },
  {
    description: "Create a Docker container from an image.",
    name: "docker_create_container",
  },
  {
    description: "Create and start a Docker container from an image.",
    name: "docker_run_container",
  },
  {
    description: "Execute an argv command inside a running container.",
    name: "docker_exec",
  },
  {
    description: "Execute a shell command inside a running container.",
    name: "docker_exec_shell",
  },
  {
    description: "Start a container when DOCKER_ENABLE_MUTATIONS=true.",
    name: "docker_start",
  },
  {
    description: "Stop a container when DOCKER_ENABLE_MUTATIONS=true.",
    name: "docker_stop",
  },
  {
    description: "Restart a container when DOCKER_ENABLE_MUTATIONS=true.",
    name: "docker_restart",
  },
  {
    description: "Remove a container when DOCKER_ENABLE_MUTATIONS=true.",
    name: "docker_remove_container",
  },
] as const;

type DockerRunOptions = {
  allowMutation?: boolean;
  timeoutMs?: number;
};

async function runDocker(args: string[], options: DockerRunOptions = {}) {
  if (options.allowMutation && !appConfig.dockerEnableMutations) {
    throw new Error(
      "Mutating Docker tools are disabled. Set DOCKER_ENABLE_MUTATIONS=true to enable them.",
    );
  }

  try {
    const { stdout, stderr } = await execFileAsync(appConfig.dockerCommand, args, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: options.timeoutMs ?? appConfig.dockerTimeoutMs,
    });

    const output = stdout.trim();
    const diagnostics = stderr.trim();

    if (output && diagnostics) {
      return `${output}\n\nstderr:\n${diagnostics}`;
    }

    return output || diagnostics || "Docker command completed with no output.";
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Docker command failed: ${error.message}`);
    }

    throw error;
  }
}

function assertContainerCreateEnabled() {
  if (!appConfig.dockerEnableContainerCreate) {
    throw new Error(
      "Container creation is disabled. Set DOCKER_ENABLE_CONTAINER_CREATE=true to enable it.",
    );
  }
}

function assertContainerExecEnabled() {
  if (!appConfig.dockerEnableContainerExec) {
    throw new Error(
      "Container exec is disabled. Set DOCKER_ENABLE_CONTAINER_EXEC=true to enable it.",
    );
  }
}

function assertShellExecEnabled() {
  if (!appConfig.dockerEnableShellExec) {
    throw new Error(
      "Shell exec is disabled. Set DOCKER_ENABLE_SHELL_EXEC=true to enable it.",
    );
  }
}

function assertImageAllowed(image: string) {
  if (appConfig.dockerAllowedImages.includes("*")) {
    return;
  }

  if (!appConfig.dockerAllowedImages.includes(image)) {
    throw new Error(
      `Image "${image}" is not allowed. Allowed images: ${appConfig.dockerAllowedImages.join(", ")}`,
    );
  }
}

function buildContainerOptions(
  options: {
    autoRemove?: boolean;
    command?: string[];
    cpus?: string;
    detach?: boolean;
    entrypoint?: string;
    env?: string[];
    image: string;
    memory?: string;
    mounts?: string[];
    name?: string;
    network?: string;
    ports?: string[];
    privileged?: boolean;
    workdir?: string;
  },
  buildOptions: { includeRunFlags?: boolean } = {},
) {
  const args: string[] = [];
  const includeRunFlags = buildOptions.includeRunFlags ?? true;

  if (options.name) {
    args.push("--name", options.name);
  }

  if (includeRunFlags && (options.detach ?? true)) {
    args.push("--detach");
  }

  if (includeRunFlags && options.autoRemove) {
    args.push("--rm");
  }

  if (options.privileged) {
    args.push("--privileged");
  }

  if (options.memory) {
    args.push("--memory", options.memory);
  }

  if (options.cpus) {
    args.push("--cpus", options.cpus);
  }

  if (options.network) {
    args.push("--network", options.network);
  }

  if (options.workdir) {
    args.push("--workdir", options.workdir);
  }

  if (options.entrypoint !== undefined) {
    args.push("--entrypoint", options.entrypoint);
  }

  for (const item of options.env ?? []) {
    args.push("--env", item);
  }

  for (const item of options.mounts ?? []) {
    args.push("--volume", item);
  }

  for (const item of options.ports ?? []) {
    args.push("--publish", item);
  }

  args.push(options.image, ...(options.command ?? []));

  return args;
}

export function registerTools(server: FastMCP) {
  server.addTool({
    name: "docker_ps",
    description: "List Docker containers.",
    parameters: z.object({
      all: z.boolean().default(false).describe("Include stopped containers."),
    }),
    execute: async ({ all }) => {
      return runDocker([
        "ps",
        ...(all ? ["--all"] : []),
        "--format",
        "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}",
      ]);
    },
  });

  server.addTool({
    name: "docker_images",
    description: "List Docker images available on the host.",
    parameters: z.object({
      all: z.boolean().default(false).describe("Include intermediate images."),
    }),
    execute: async ({ all }) => {
      return runDocker([
        "images",
        ...(all ? ["--all"] : []),
        "--format",
        "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}\t{{.CreatedSince}}",
      ]);
    },
  });

  server.addTool({
    name: "docker_inspect",
    description: "Inspect a Docker object by container, image, volume, or network name/ID.",
    parameters: z.object({
      target: z.string().min(1).max(256).describe("Docker object name or ID to inspect."),
    }),
    execute: async ({ target }) => {
      return runDocker(["inspect", target]);
    },
  });

  server.addTool({
    name: "docker_logs",
    description: "Read recent logs from a Docker container.",
    parameters: z.object({
      container: containerRefSchema.describe("Container name or ID."),
      tail: z
        .number()
        .int()
        .min(1)
        .max(2000)
        .default(100)
        .describe("Number of log lines to return."),
      timestamps: z.boolean().default(false).describe("Include timestamps."),
    }),
    execute: async ({ container, tail, timestamps }) => {
      return runDocker([
        "logs",
        "--tail",
        String(tail),
        ...(timestamps ? ["--timestamps"] : []),
        container,
      ]);
    },
  });

  server.addTool({
    name: "docker_stats",
    description: "Read a one-shot Docker container stats snapshot.",
    parameters: z.object({
      container: containerRefSchema.optional().describe("Optional container name or ID."),
    }),
    execute: async ({ container }) => {
      return runDocker([
        "stats",
        "--no-stream",
        "--format",
        "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}",
        ...(container ? [container] : []),
      ]);
    },
  });

  server.addTool({
    name: "docker_pull_image",
    description: "Pull a Docker image.",
    parameters: z.object({
      image: dockerImageSchema.describe("Image reference to pull."),
    }),
    execute: async ({ image }) => {
      assertContainerCreateEnabled();
      assertImageAllowed(image);
      return runDocker(["pull", image], { allowMutation: true });
    },
  });

  server.addTool({
    name: "docker_create_container",
    description: "Create a Docker container from an image.",
    parameters: z.object({
      autoRemove: z.boolean().default(false).describe("Remove the container after it exits."),
      command: z.array(z.string().min(1).max(512)).default([]).describe("Command argv."),
      cpus: z.string().min(1).max(32).optional().describe("CPU limit, such as 1 or 0.5."),
      detach: z.boolean().default(true).describe("Create the container in detached mode."),
      env: z.array(keyValueSchema).default([]).describe("Environment variables as KEY=value."),
      image: dockerImageSchema.describe("Image reference to create from."),
      keepAlive: z
        .boolean()
        .default(true)
        .describe(
          "When true and no command is specified, inject 'sleep infinity' so the container stays running and is accessible via docker_exec_shell. Ideal for interactive/dev containers.",
        ),
      memory: z.string().min(1).max(32).optional().describe("Memory limit, such as 512m."),
      mounts: z.array(mountSchema).default([]).describe("Volume bind specs."),
      name: dockerNameSchema.optional().describe("Optional container name."),
      network: z.string().min(1).max(128).optional().describe("Docker network mode/name."),
      ports: z.array(portSchema).default([]).describe("Published ports, such as 8080:80."),
      privileged: z.boolean().default(false).describe("Run with Docker privileged mode."),
      workdir: z.string().min(1).max(512).optional().describe("Working directory."),
    }),
    execute: async (params) => {
      assertContainerCreateEnabled();
      assertImageAllowed(params.image);
      const keepAliveActive = params.keepAlive && params.command.length === 0;
      const effectiveCommand = keepAliveActive ? ["sleep", "infinity"] : params.command;
      // Clear the image entrypoint when injecting sleep or providing a custom command
      // so images with non-shell entrypoints (e.g. alpine/git → "git") don't corrupt the args.
      const effectiveEntrypoint = keepAliveActive || params.command.length > 0 ? "" : undefined;
      return runDocker(
        [
          "create",
          ...buildContainerOptions(
            { ...params, command: effectiveCommand, entrypoint: effectiveEntrypoint },
            { includeRunFlags: false },
          ),
        ],
        { allowMutation: true },
      );
    },
  });

  server.addTool({
    name: "docker_run_container",
    description: "Create and start a Docker container from an image.",
    parameters: z.object({
      autoRemove: z.boolean().default(false).describe("Remove the container after it exits."),
      command: z.array(z.string().min(1).max(512)).default([]).describe("Command argv."),
      cpus: z.string().min(1).max(32).optional().describe("CPU limit, such as 1 or 0.5."),
      detach: z.boolean().default(true).describe("Run the container in detached mode."),
      env: z.array(keyValueSchema).default([]).describe("Environment variables as KEY=value."),
      image: dockerImageSchema.describe("Image reference to run."),
      keepAlive: z
        .boolean()
        .default(true)
        .describe(
          "When true and no command is specified, inject 'sleep infinity' so the container stays running and is accessible via docker_exec_shell. Ideal for interactive/dev containers.",
        ),
      memory: z.string().min(1).max(32).optional().describe("Memory limit, such as 512m."),
      mounts: z.array(mountSchema).default([]).describe("Volume bind specs."),
      name: dockerNameSchema.optional().describe("Optional container name."),
      network: z.string().min(1).max(128).optional().describe("Docker network mode/name."),
      ports: z.array(portSchema).default([]).describe("Published ports, such as 8080:80."),
      privileged: z.boolean().default(false).describe("Run with Docker privileged mode."),
      workdir: z.string().min(1).max(512).optional().describe("Working directory."),
    }),
    execute: async (params) => {
      assertContainerCreateEnabled();
      assertImageAllowed(params.image);
      const keepAliveActive = params.keepAlive && params.detach && params.command.length === 0;
      const effectiveCommand = keepAliveActive ? ["sleep", "infinity"] : params.command;
      // Clear the image entrypoint when injecting sleep or providing a custom command
      // so images with non-shell entrypoints (e.g. alpine/git → "git") don't corrupt the args.
      const effectiveEntrypoint = keepAliveActive || params.command.length > 0 ? "" : undefined;
      return runDocker(
        ["run", ...buildContainerOptions({ ...params, command: effectiveCommand, entrypoint: effectiveEntrypoint })],
        { allowMutation: true },
      );
    },
  });

  server.addTool({
    name: "docker_exec",
    description: "Execute an argv command inside a running Docker container.",
    parameters: z.object({
      command: z.array(z.string().min(1).max(512)).min(1).describe("Command argv to execute."),
      container: containerRefSchema.describe("Container name or ID."),
      env: z.array(keyValueSchema).default([]).describe("Environment variables as KEY=value."),
      privileged: z.boolean().default(false).describe("Run exec with privileged mode."),
      user: z.string().min(1).max(128).optional().describe("User or UID for the command."),
      workdir: z.string().min(1).max(512).optional().describe("Working directory."),
    }),
    execute: async ({ command, container, env, privileged, user, workdir }) => {
      assertContainerExecEnabled();

      return runDocker(
        [
          "exec",
          ...(privileged ? ["--privileged"] : []),
          ...(user ? ["--user", user] : []),
          ...(workdir ? ["--workdir", workdir] : []),
          ...env.flatMap((item) => ["--env", item]),
          container,
          ...command,
        ],
        { timeoutMs: appConfig.dockerExecTimeoutMs },
      );
    },
  });

  server.addTool({
    name: "docker_exec_shell",
    description: "Execute a shell command inside a running Docker container.",
    parameters: z.object({
      command: z.string().min(1).max(8000).describe("Shell command to run inside the container."),
      container: containerRefSchema.describe("Container name or ID."),
      env: z.array(keyValueSchema).default([]).describe("Environment variables as KEY=value."),
      privileged: z.boolean().default(false).describe("Run exec with privileged mode."),
      shell: z.string().min(1).max(128).default("sh").describe("Shell binary to invoke."),
      user: z.string().min(1).max(128).optional().describe("User or UID for the command."),
      workdir: z.string().min(1).max(512).optional().describe("Working directory."),
    }),
    execute: async ({ command, container, env, privileged, shell, user, workdir }) => {
      assertContainerExecEnabled();
      assertShellExecEnabled();

      return runDocker(
        [
          "exec",
          ...(privileged ? ["--privileged"] : []),
          ...(user ? ["--user", user] : []),
          ...(workdir ? ["--workdir", workdir] : []),
          ...env.flatMap((item) => ["--env", item]),
          container,
          shell,
          "-lc",
          command,
        ],
        { timeoutMs: appConfig.dockerExecTimeoutMs },
      );
    },
  });

  server.addTool({
    name: "docker_start",
    description: "Start a Docker container. Requires DOCKER_ENABLE_MUTATIONS=true.",
    parameters: z.object({
      container: containerRefSchema.describe("Container name or ID."),
    }),
    execute: async ({ container }) => {
      return runDocker(["start", container], { allowMutation: true });
    },
  });

  server.addTool({
    name: "docker_stop",
    description: "Stop a Docker container. Requires DOCKER_ENABLE_MUTATIONS=true.",
    parameters: z.object({
      container: containerRefSchema.describe("Container name or ID."),
      timeoutSeconds: z
        .number()
        .int()
        .min(1)
        .max(300)
        .default(10)
        .describe("Seconds to wait before Docker kills the container."),
    }),
    execute: async ({ container, timeoutSeconds }) => {
      return runDocker(["stop", "--time", String(timeoutSeconds), container], {
        allowMutation: true,
      });
    },
  });

  server.addTool({
    name: "docker_restart",
    description: "Restart a Docker container. Requires DOCKER_ENABLE_MUTATIONS=true.",
    parameters: z.object({
      container: containerRefSchema.describe("Container name or ID."),
      timeoutSeconds: z
        .number()
        .int()
        .min(1)
        .max(300)
        .default(10)
        .describe("Seconds to wait before Docker kills the container."),
    }),
    execute: async ({ container, timeoutSeconds }) => {
      return runDocker(["restart", "--time", String(timeoutSeconds), container], {
        allowMutation: true,
      });
    },
  });

  server.addTool({
    name: "docker_remove_container",
    description: "Remove a Docker container. Requires DOCKER_ENABLE_MUTATIONS=true.",
    parameters: z.object({
      container: containerRefSchema.describe("Container name or ID."),
      force: z.boolean().default(false).describe("Force removal of a running container."),
      volumes: z.boolean().default(false).describe("Remove anonymous volumes."),
    }),
    execute: async ({ container, force, volumes }) => {
      return runDocker(
        ["rm", ...(force ? ["--force"] : []), ...(volumes ? ["--volumes"] : []), container],
        {
          allowMutation: true,
        },
      );
    },
  });
}
