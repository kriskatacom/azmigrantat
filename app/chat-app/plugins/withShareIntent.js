const {
  AndroidConfig,
  withAndroidManifest,
  withStringsXml,
} = require("expo/config-plugins");

const MIME_TYPES = [
  "image/*",
  "video/*",
  "audio/*",
  "application/*",
  "text/*",
  "*/*",
];

const ACTIONS = [
  "android.intent.action.SEND",
  "android.intent.action.SEND_MULTIPLE",
];

function isShareFilter(filter) {
  const actionName = filter.action?.[0]?.$?.["android:name"];
  return (
    actionName === "android.intent.action.SEND" ||
    actionName === "android.intent.action.SEND_MULTIPLE"
  );
}

function withShareIntentManifest(config) {
  return withAndroidManifest(config, (config) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(
      config.modResults,
    );

    const existing = mainActivity["intent-filter"] ?? [];
    mainActivity["intent-filter"] = existing.filter(
      (filter) => !isShareFilter(filter),
    );

    for (const action of ACTIONS) {
      for (const mimeType of MIME_TYPES) {
        mainActivity["intent-filter"].push({
          action: [{ $: { "android:name": action } }],
          category: [
            { $: { "android:name": "android.intent.category.DEFAULT" } },
          ],
          data: [{ $: { "android:mimeType": mimeType } }],
        });
      }
    }

    return config;
  });
}

function withShareIntoScheme(config) {
  const scheme = Array.isArray(config.scheme) ? config.scheme[0] : config.scheme;

  return withStringsXml(config, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [
        AndroidConfig.Resources.buildResourceItem({
          name: "share_into_scheme",
          value: scheme || "chatapp",
          translatable: false,
        }),
      ],
      config.modResults,
    );
    return config;
  });
}

module.exports = function withShareIntent(config) {
  config = withShareIntentManifest(config);
  config = withShareIntoScheme(config);
  return config;
};
