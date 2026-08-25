package expo.modules.incomingcall

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class IncomingCallActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val callId = intent.getStringExtra(IncomingCallModule.EXTRA_CALL_ID) ?: return
    val callerId = intent.getIntExtra(IncomingCallModule.EXTRA_CALLER_ID, 0)
    val callerName = intent.getStringExtra(IncomingCallModule.EXTRA_CALLER_NAME)
    val callerAvatar = intent.getStringExtra(IncomingCallModule.EXTRA_CALLER_AVATAR)

    when (intent.action) {
      IncomingCallModule.ACTION_DECLINE -> {
        Log.i(IncomingCallModule.TAG, "[CALL] decline action callId=$callId")
        val pendingResult = goAsync()
        IncomingCallModule.rememberLaunch(
          callId,
          "decline",
          callerId,
          callerName,
          callerAvatar,
          context = context,
        )
        IncomingCallModule.postCallAction(context, "/calls/decline", callId) { success ->
          if (success) {
            IncomingCallModule.dismiss(context, callId)
          } else {
            Log.e(
              IncomingCallModule.TAG,
              "[CALL] decline action not confirmed; notification kept callId=$callId",
            )
          }
          pendingResult.finish()
        }
      }
    }
  }
}
