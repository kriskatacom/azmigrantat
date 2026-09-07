package expo.modules.devicelock

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.os.Build
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.Executors

private const val DEVICE_CREDENTIAL_REQUEST_CODE = 7193

class DeviceLockModule : Module() {
  private var activePromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("DeviceLock")

    AsyncFunction("authenticateDeviceCredential") { title: String, subtitle: String?, description: String?, promise: Promise ->
      val fragmentActivity = appContext.currentActivity as? FragmentActivity
      if (fragmentActivity == null) {
        promise.resolve(false)
        return@AsyncFunction
      }

      val keyguardManager =
        fragmentActivity.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
      if (!keyguardManager.isDeviceSecure) {
        promise.resolve(false)
        return@AsyncFunction
      }

      activePromise = promise

      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        val intent = keyguardManager.createConfirmDeviceCredentialIntent(title, description)
        if (intent == null) {
          activePromise = null
          promise.resolve(false)
          return@AsyncFunction
        }
        fragmentActivity.startActivityForResult(intent, DEVICE_CREDENTIAL_REQUEST_CODE)
        return@AsyncFunction
      }

      val executor = Executors.newSingleThreadExecutor()
      val prompt = BiometricPrompt(
        fragmentActivity,
        executor,
        object : BiometricPrompt.AuthenticationCallback() {
          override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
            resolve(true)
          }

          override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
            resolve(false)
          }
        },
      )

      val promptInfo = BiometricPrompt.PromptInfo.Builder()
        .setTitle(title)
        .setSubtitle(subtitle)
        .setDescription(description)
        .setAllowedAuthenticators(BiometricManager.Authenticators.DEVICE_CREDENTIAL)
        .setConfirmationRequired(false)
        .build()

      prompt.authenticate(promptInfo)
    }.runOnQueue(Queues.MAIN)

    OnActivityResult { _, (requestCode, resultCode, _) ->
      if (requestCode != DEVICE_CREDENTIAL_REQUEST_CODE) {
        return@OnActivityResult
      }

      resolve(resultCode == Activity.RESULT_OK)
    }
  }

  private fun resolve(success: Boolean) {
    val promise = activePromise ?: return
    activePromise = null
    promise.resolve(success)
  }
}
