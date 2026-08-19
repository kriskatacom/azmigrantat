package expo.modules.incomingcall

import android.content.Context
import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class IncomingCallFirebaseMessagingService : FirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    Log.i(
      IncomingCallModule.TAG,
      "[CALL] FCM received type=${remoteMessage.data["type"]} callId=${remoteMessage.data["call_id"]}",
    )

    if (IncomingCallModule.handleRemoteMessage(applicationContext, remoteMessage.data)) {
      return
    }

    forwardToExpo("onMessageReceived", remoteMessage)
  }

  override fun onNewToken(token: String) {
    forwardToExpo("onNewToken", token)
  }

  override fun onDeletedMessages() {
    forwardToExpo("onDeletedMessages", null)
  }

  private fun forwardToExpo(methodName: String, argument: Any?) {
    try {
      val clazz = Class.forName(
        "expo.modules.notifications.service.delegates.FirebaseMessagingDelegate"
      )
      val delegate = clazz.getConstructor(Context::class.java).newInstance(this)

      when (methodName) {
        "onMessageReceived" ->
          clazz.getMethod("onMessageReceived", RemoteMessage::class.java)
            .invoke(delegate, argument)
        "onNewToken" ->
          clazz.getMethod("onNewToken", String::class.java).invoke(delegate, argument)
        "onDeletedMessages" ->
          clazz.getMethod("onDeletedMessages").invoke(delegate)
      }
    } catch (_: Exception) {
      // Chat notifications still work through Expo's lower-priority service when forwarding fails.
    }
  }
}
