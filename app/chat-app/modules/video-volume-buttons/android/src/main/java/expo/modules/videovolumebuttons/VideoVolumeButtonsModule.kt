package expo.modules.videovolumebuttons

import android.view.KeyEvent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VideoVolumeButtonsModule : Module() {
  companion object {
    @Volatile
    private var active = false

    @Volatile
    private var currentModule: VideoVolumeButtonsModule? = null

    /**
     * Called from MainActivity before Android changes the system media volume.
     * Both key-down and key-up are consumed while video control is active.
     */
    fun handleKeyEvent(event: KeyEvent): Boolean {
      val direction = when (event.keyCode) {
        KeyEvent.KEYCODE_VOLUME_UP -> "up"
        KeyEvent.KEYCODE_VOLUME_DOWN -> "down"
        else -> return false
      }

      if (!active) return false

      if (event.action == KeyEvent.ACTION_DOWN) {
        currentModule?.emitVolumeButton(direction)
      }
      return true
    }
  }

  private fun emitVolumeButton(direction: String) {
    sendEvent("onHardwareVolumeButton", mapOf("direction" to direction))
  }

  override fun definition() = ModuleDefinition {
    Name("VideoVolumeButtons")

    Events("onHardwareVolumeButton")

    OnCreate {
      currentModule = this@VideoVolumeButtonsModule
    }

    OnDestroy {
      if (currentModule === this@VideoVolumeButtonsModule) {
        active = false
        currentModule = null
      }
    }

    Function("setActive") { isActive: Boolean ->
      active = isActive
    }
  }
}
