package expo.modules.incomingcall

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

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
        postCallAction(context, "/calls/accept", callId)
        context.startActivity(
          IncomingCallModule.launchIntent(
            context,
            callId,
            "accept",
            callerId,
            callerName,
            callerAvatar,
          )
        )
      }

      IncomingCallModule.ACTION_DECLINE -> {
        Log.i(IncomingCallModule.TAG, "[CALL] decline action callId=$callId")
        IncomingCallModule.rememberLaunch(
          callId,
          "decline",
          callerId,
          callerName,
          callerAvatar,
          context = context,
        )
        IncomingCallModule.dismiss(context, callId)
        postCallAction(context, "/calls/decline", callId)
      }
    }
  }

  private fun postCallAction(context: Context, path: String, callId: String) {
    val pendingResult = goAsync()
    val prefs = context.getSharedPreferences(IncomingCallModule.PREFS, Context.MODE_PRIVATE)
    val token = prefs.getString(IncomingCallModule.KEY_TOKEN, null)
    val socketUrl = prefs.getString(IncomingCallModule.KEY_SOCKET_URL, null)

    thread {
      try {
        if (!token.isNullOrBlank() && !socketUrl.isNullOrBlank()) {
          val connection = URL("$socketUrl$path").openConnection() as HttpURLConnection
          connection.requestMethod = "POST"
          connection.connectTimeout = 8_000
          connection.readTimeout = 8_000
          connection.doOutput = true
          connection.setRequestProperty("Authorization", "Bearer $token")
          connection.setRequestProperty("Content-Type", "application/json")
          connection.setRequestProperty("Accept", "application/json")

          OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
            writer.write("""{"call_id":"${callId.replace("\"", "")}"}""")
          }

          val status = connection.responseCode
          Log.i(
            IncomingCallModule.TAG,
            "[CALL] native $path status=$status callId=$callId",
          )
          connection.disconnect()
        } else {
          Log.w(
            IncomingCallModule.TAG,
            "[CALL] native $path skipped, missing session callId=$callId",
          )
        }
      } catch (error: Exception) {
        Log.e(
          IncomingCallModule.TAG,
          "[CALL] native $path failed callId=$callId: ${error.message}",
        )
      } finally {
        pendingResult.finish()
      }
    }
  }
}
