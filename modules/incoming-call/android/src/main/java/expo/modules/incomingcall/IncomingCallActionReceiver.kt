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
      IncomingCallModule.ACTION_ACCEPT -> {
        Log.i(IncomingCallModule.TAG, "[CALL] accept action callId=$callId")
        IncomingCallModule.rememberLaunch(
          callId,
          "accept",
          callerId,
          callerName,
          callerAvatar,
          context = context,
        )
        IncomingCallModule.dismiss(context, callId)
      }

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
        IncomingCallModule.dismiss(context, callId)
        IncomingCallModule.postCallAction(context, "/calls/decline", callId) {
          pendingResult.finish()
        }
      }
    }
  }
}
