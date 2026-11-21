const { withMainActivity } = require("expo/config-plugins");

module.exports = function withVideoVolumeButtons(config) {
  return withMainActivity(config, (config) => {
    if (config.modResults.language !== "kt") return config;

    let src = config.modResults.contents;

    if (!src.includes("import android.view.KeyEvent")) {
      src = src.replace(
        "import android.os.Bundle",
        "import android.os.Bundle\nimport android.view.KeyEvent",
      );
    }

    if (!src.includes("expo.modules.videovolumebuttons.VideoVolumeButtonsModule")) {
      src = src.replace(
        "import expo.modules.ReactActivityDelegateWrapper",
        "import expo.modules.ReactActivityDelegateWrapper\nimport expo.modules.videovolumebuttons.VideoVolumeButtonsModule",
      );
    }

    if (!src.includes("override fun dispatchKeyEvent(event: KeyEvent)")) {
      src = src.replace(
        "  override fun invokeDefaultOnBackPressed()",
        `  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if (VideoVolumeButtonsModule.handleKeyEvent(event)) return true
    return super.dispatchKeyEvent(event)
  }

  override fun invokeDefaultOnBackPressed()`,
      );
    }

    config.modResults.contents = src;
    return config;
  });
};
