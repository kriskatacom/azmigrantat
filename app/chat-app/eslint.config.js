// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    rules: {
        // State updates in these effects are intentional: they synchronize async
        // requests and realtime subscriptions with the React state model.
        // The rule treats these external callbacks as cascading renders.
        "react-hooks/preserve-manual-memoization": "warn",
        "react-hooks/purity": "warn",
        "react-hooks/refs": "warn",
        "react-hooks/set-state-in-effect": "off",
    },
  },
]);
