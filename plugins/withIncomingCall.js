const {
  AndroidConfig,
  withAndroidManifest,
  withInfoPlist,
  withMainActivity,
} = require("expo/config-plugins");

function addPermission(androidManifest, permission) {
  AndroidConfig.Permissions.ensurePermission(androidManifest, permission);
}

function withIncomingCallManifest(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;

    addPermission(androidManifest, "android.permission.USE_FULL_SCREEN_INTENT");
    addPermission(androidManifest, "android.permission.WAKE_LOCK");
    addPermission(androidManifest, "android.permission.VIBRATE");
    addPermission(androidManifest, "android.permission.TURN_SCREEN_ON");
    addPermission(androidManifest, "android.permission.DISABLE_KEYGUARD");
    addPermission(androidManifest, "android.permission.POST_NOTIFICATIONS");

    const mainActivity =
      AndroidConfig.Manifest.getMainActivityOrThrow(androidManifest);

    mainActivity.$["android:showWhenLocked"] = "true";
    mainActivity.$["android:turnScreenOn"] = "true";
    mainActivity.$["android:excludeFromRecents"] = "false";
    mainActivity.$["android:launchMode"] = "singleTask";

    return config;
  });
}

function withIncomingCallMainActivity(config) {
  return withMainActivity(config, (config) => {
    if (config.modResults.language !== "kt") {
      return config;
    }

    let src = config.modResults.contents;

    if (!src.includes("import android.content.Intent")) {
      src = src.replace(
        "import android.os.Build",
        "import android.content.Intent\nimport android.os.Build",
      );
    }

    if (!src.includes("expo.modules.incomingcall.IncomingCallModule")) {
      src = src.replace(
        "import expo.modules.ReactActivityDelegateWrapper",
        "import expo.modules.ReactActivityDelegateWrapper\nimport expo.modules.incomingcall.IncomingCallModule",
      );
    }

    if (!src.includes("IncomingCallModule.onActivityLaunched(this, intent)")) {
      src = src.replace(
        "super.onCreate(null)",
        "super.onCreate(null)\n    IncomingCallModule.onActivityLaunched(this, intent)",
      );
    }

    if (!src.includes("override fun onNewIntent")) {
      src = src.replace(
        "  override fun invokeDefaultOnBackPressed()",
        `  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    IncomingCallModule.onActivityLaunched(this, intent)
  }

  override fun invokeDefaultOnBackPressed()`,
      );
    }

    config.modResults.contents = src;
    return config;
  });
}

function withIncomingCallIos(config) {
  return withInfoPlist(config, (config) => {
    const modes = new Set(config.modResults.UIBackgroundModes ?? []);
    modes.add("remote-notification");
    modes.add("voip");
    config.modResults.UIBackgroundModes = [...modes];
    config.modResults.NSUserNotificationsUsageDescription =
      config.modResults.NSUserNotificationsUsageDescription ??
      "Използваме известия, за да ви покажем входящи видео обаждания.";
    return config;
  });
}

module.exports = function withIncomingCall(config) {
  config = withIncomingCallManifest(config);
  config = withIncomingCallMainActivity(config);
  config = withIncomingCallIos(config);
  return config;
};
