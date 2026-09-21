const fs = require("node:fs");
const path = require("node:path");

const routerPackagePath = require.resolve("expo-router/package.json");
const routerPackage = require(routerPackagePath);
const targetPath = path.join(
  path.dirname(routerPackagePath),
  "build/fork/useLinking.native.js",
);

const original = fs.readFileSync(targetPath, "utf8");

if (original.includes("flushPendingUnhandledLink")) {
  console.log("Expo Router initial-link race patch is already applied.");
  process.exit(0);
}

const anchor = "    const independent = (0, native_1.useNavigationIndependentTree)();\n";
const anchorReplacement = `${anchor}    const mountedRef = (0, react_1.useRef)(false);\n    const pendingUnhandledLinkRef = (0, react_1.useRef)();\n    const flushPendingUnhandledLink = (0, react_1.useCallback)((path) => {\n        if (mountedRef.current) {\n            onUnhandledLinking(path);\n        }\n        else {\n            pendingUnhandledLinkRef.current = path;\n        }\n    }, [onUnhandledLinking]);\n    (0, react_1.useEffect)(() => {\n        mountedRef.current = true;\n        if (pendingUnhandledLinkRef.current !== undefined) {\n            onUnhandledLinking(pendingUnhandledLinkRef.current);\n            pendingUnhandledLinkRef.current = undefined;\n        }\n        return () => {\n            mountedRef.current = false;\n        };\n    }, [onUnhandledLinking]);\n`;

let patched = original.replace(anchor, anchorReplacement);
patched = patched.replaceAll(
  "onUnhandledLinking((0, extractPathFromURL_1.extractExpoPathFromURL)",
  "flushPendingUnhandledLink((0, extractPathFromURL_1.extractExpoPathFromURL)",
);
patched = patched.replace(
  "[getStateFromURL, onUnhandledLinking, prefixes]",
  "[flushPendingUnhandledLink, getStateFromURL, prefixes]",
);

if (
  patched === original ||
  !patched.includes("flushPendingUnhandledLink") ||
  patched.includes("[getStateFromURL, onUnhandledLinking, prefixes]")
) {
  throw new Error(
    `Unsupported expo-router ${routerPackage.version}: initial-link race patch could not be applied.`,
  );
}

fs.writeFileSync(targetPath, patched);
console.log(
  `Patched expo-router ${routerPackage.version} Android initial-link mount race.`,
);
