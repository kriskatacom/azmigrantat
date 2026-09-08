/**
 * React Native DevTools on Linux launches Electron from a path with spaces.
 * Chromium's zygote then calls execvp on the truncated path and crashes.
 * Passing --no-sandbox skips zygote and lets the smoke-test succeed.
 */
if (process.platform !== "linux") {
  return;
}

const path = require("node:path");
const { spawn } = require("cross-spawn");
const debuggerShellPkg = path.dirname(
  require.resolve("@react-native/debugger-shell/package.json"),
);
const {
  prepareDebuggerShellFromDotSlashFile,
  spawnAndGetStderr,
} = require(path.join(debuggerShellPkg, "dist/node/private/LaunchUtils.js"));
const debuggerShell = require("@react-native/debugger-shell");

if (debuggerShell.__linuxNoSandboxPatched) {
  return;
}

const DEVTOOLS_BINARY_DOTSLASH_FILE = path.join(
  debuggerShellPkg,
  "bin/react-native-devtools",
);

function getShellBinaryAndArgs(flavor, prebuiltBinaryPath) {
  switch (flavor) {
    case "prebuilt":
      return [
        require("fb-dotslash"),
        [prebuiltBinaryPath ?? DEVTOOLS_BINARY_DOTSLASH_FILE],
      ];
    case "dev":
      return [require("electron"), [path.join(debuggerShellPkg, "dist/electron/index.js")]];
    default:
      throw new Error(`Unknown flavor: ${flavor}`);
  }
}

function withNoSandbox(args) {
  return args.includes("--no-sandbox") ? args : ["--no-sandbox", ...args];
}

debuggerShell.unstable_prepareDebuggerShell = async function unstable_prepareDebuggerShell({
  prebuiltBinaryPath,
  flavor = process.env.RNDT_DEV === "1" ? "dev" : "prebuilt",
} = {}) {
  try {
    if (flavor === "prebuilt") {
      const prebuiltResult = await prepareDebuggerShellFromDotSlashFile(
        prebuiltBinaryPath ?? DEVTOOLS_BINARY_DOTSLASH_FILE,
      );
      if (prebuiltResult.code !== "success") {
        return prebuiltResult;
      }
    } else if (flavor !== "dev") {
      throw new Error(`Unknown flavor: ${flavor}`);
    }

    const [binaryPath, baseArgs] = getShellBinaryAndArgs(
      flavor,
      prebuiltBinaryPath,
    );
    const { code, stderr } = await spawnAndGetStderr(binaryPath, [
      ...baseArgs,
      ...withNoSandbox(["--version"]),
    ]);

    if (code !== 0) {
      return {
        code: "unexpected_error",
        verboseInfo: stderr,
      };
    }

    return { code: "success" };
  } catch (error) {
    return {
      code: "unexpected_error",
      verboseInfo: error instanceof Error ? error.message : String(error),
    };
  }
};

debuggerShell.unstable_spawnDebuggerShellWithArgs = async function unstable_spawnDebuggerShellWithArgs(
  args,
  {
    mode = "detached",
    flavor = process.env.RNDT_DEV === "1" ? "dev" : "prebuilt",
    prebuiltBinaryPath,
    silent = process.env.NODE_ENV === "test",
  } = {},
) {
  const [binaryPath, baseArgs] = getShellBinaryAndArgs(
    flavor,
    prebuiltBinaryPath,
  );

  return new Promise((resolve, reject) => {
    const { ELECTRON_RUN_AS_NODE: _, ...env } = process.env;
    const child = spawn(
      binaryPath,
      [...baseArgs, ...withNoSandbox(args)],
      {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        detached: mode === "detached",
        env,
      },
    );

    if (mode === "detached") {
      child.on("spawn", () => {
        resolve();
      });
      child.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(`Failed to open debugger shell: exited with code ${code}`),
          );
        }
      });
      child.on("error", (error) => {
        reject(error);
      });
      if (!silent) {
        child.stdout.on("data", (data) =>
          console.log("[debugger-shell stdout] " + String(data)),
        );
        child.stderr.on("data", (data) =>
          console.warn("[debugger-shell stderr] " + String(data)),
        );
      }
      child.unref();
      return;
    }

    child.on("close", (code) => {
      process.exit(code ?? 1);
    });
  });
};

debuggerShell.__linuxNoSandboxPatched = true;
