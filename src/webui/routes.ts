import { Hono } from "hono";

import { appConfig, getPublicEnvSummary } from "../config.js";
import {
  buildSessionCookie,
  clearSessionCookie,
  isAuthenticated,
  matchesPassword,
} from "../lib/auth.js";
import { formatDuration, formatTimestamp } from "../lib/format.js";
import { renderPage } from "../lib/render.js";
import { metrics, startTime } from "../state/metrics.js";
import { updateWebUiSettings, webUiSettings } from "../state/settings.js";
import { registeredToolInfo } from "../tools/index.js";

type RouteOptions = {
  app: Hono;
  sessionToken: string;
};

export function registerWebUiRoutes({ app, sessionToken }: RouteOptions) {
  app.use("*", async (c, next) => {
    metrics.requestCount += 1;
    metrics.lastRequestAt = new Date();
    await next();
  });

  app.get("/", async (c) => {
    return c.redirect(
      isAuthenticated(c.req.header("cookie"), sessionToken) ? "/dashboard" : "/login",
    );
  });

  app.get("/login", async (c) => {
    if (isAuthenticated(c.req.header("cookie"), sessionToken)) {
      return c.redirect("/dashboard");
    }

    const html = await renderPage("login.ejs", {
      activePath: "/login",
      errorMessage:
        c.req.query("error") === "1" ? "Invalid password. Please try again." : "",
      pageTitle: "WebUI Login",
      serverName: appConfig.serverName,
      webUiTitle: webUiSettings.title,
    });

    return c.html(html);
  });

  app.post("/login", async (c) => {
    const formData = await c.req.formData();
    const submittedPassword = String(formData.get("password") ?? "");

    if (!matchesPassword(submittedPassword, sessionToken, appConfig.webUiSessionSecret)) {
      metrics.failedLogins += 1;
      return c.redirect("/login?error=1");
    }

    metrics.lastLoginAt = new Date();
    metrics.successfulLogins += 1;
    c.header("Set-Cookie", buildSessionCookie(sessionToken));
    return c.redirect("/dashboard");
  });

  app.post("/logout", async (c) => {
    c.header("Set-Cookie", clearSessionCookie());
    return c.redirect("/login");
  });

  app.get("/dashboard", async (c) => {
    if (!isAuthenticated(c.req.header("cookie"), sessionToken)) {
      return c.redirect("/login");
    }

    const uptimeSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const html = await renderPage("index.ejs", {
      activePath: "/dashboard",
      dashboardCards: [
        {
          icon: "fa-solid fa-bolt",
          label: "HTTP Requests",
          value: String(metrics.requestCount),
        },
        {
          icon: "fa-solid fa-shield-heart",
          label: "Successful Logins",
          value: String(metrics.successfulLogins),
        },
        {
          icon: "fa-solid fa-triangle-exclamation",
          label: "Failed Logins",
          value: String(metrics.failedLogins),
        },
        {
          icon: "fa-solid fa-clock",
          label: "Uptime",
          value: formatDuration(uptimeSeconds),
        },
      ],
      envSummary: getPublicEnvSummary(),
      healthUrl: `http://${appConfig.host}:${appConfig.port}/health`,
      lastLoginAt: formatTimestamp(metrics.lastLoginAt),
      lastRequestAt: formatTimestamp(metrics.lastRequestAt),
      mcpUrl: `http://${appConfig.host}:${appConfig.port}${appConfig.mcpEndpoint}`,
      pageTitle: "Dashboard",
      serverName: appConfig.serverName,
      serverVersion: appConfig.serverVersion,
      settingsSummary: [
        { key: "WebUI Title", value: webUiSettings.title },
        { key: "Accent Tone", value: webUiSettings.accentTone },
        { key: "Auto Refresh", value: `${webUiSettings.autoRefreshSeconds}s` },
        { key: "Compact Cards", value: webUiSettings.compactCards ? "Enabled" : "Disabled" },
      ],
      startedAt: startTime.toISOString(),
      toolCount: registeredToolInfo.length,
      tools: registeredToolInfo,
      webUiSettings,
      webUiTitle: webUiSettings.title,
    });

    return c.html(html);
  });

  app.get("/settings", async (c) => {
    if (!isAuthenticated(c.req.header("cookie"), sessionToken)) {
      return c.redirect("/login");
    }

    const html = await renderPage("settings.ejs", {
      activePath: "/settings",
      pageTitle: "Settings",
      saveMessage:
        c.req.query("saved") === "1" ? "Settings updated for the current process." : "",
      serverName: appConfig.serverName,
      webUiSettings,
      webUiTitle: webUiSettings.title,
    });

    return c.html(html);
  });

  app.post("/settings", async (c) => {
    if (!isAuthenticated(c.req.header("cookie"), sessionToken)) {
      return c.redirect("/login");
    }

    const formData = await c.req.formData();
    updateWebUiSettings({
      accentTone: String(formData.get("accentTone") ?? ""),
      autoRefreshSeconds: Number(formData.get("autoRefreshSeconds") ?? "15"),
      compactCards: formData.get("compactCards") === "on",
      title: String(formData.get("title") ?? ""),
    });

    return c.redirect("/settings?saved=1");
  });

  app.get("/api/metrics", async (c) => {
    if (!isAuthenticated(c.req.header("cookie"), sessionToken)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    return c.json({
      host: appConfig.host,
      lastLoginAt: formatTimestamp(metrics.lastLoginAt),
      lastRequestAt: formatTimestamp(metrics.lastRequestAt),
      mcpEndpoint: appConfig.mcpEndpoint,
      port: appConfig.port,
      requestCount: metrics.requestCount,
      serverName: appConfig.serverName,
      serverVersion: appConfig.serverVersion,
      settings: webUiSettings,
      startTime: startTime.toISOString(),
      toolCount: registeredToolInfo.length,
      uptimeSeconds: Math.floor((Date.now() - startTime.getTime()) / 1000),
      webUiTitle: webUiSettings.title,
    });
  });
}
