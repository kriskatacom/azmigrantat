// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  {
    ignores: ["dist/**", ".expo/**", "tsconfig/**", "scripts/**"],
  },
  expoConfig,
  {
    rules: {
      // These React Compiler diagnostics are not compatible with the
      // imperative React Native/WebRTC APIs used by this app.
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  }
]);
