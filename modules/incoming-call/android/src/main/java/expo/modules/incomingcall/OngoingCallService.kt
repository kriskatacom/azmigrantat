package expo.modules.incomingcall

import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class OngoingCallService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val title = intent?.getStringExtra(EXTRA_TITLE)?.ifBlank { null } ?: "Обаждане в ход"
    val text = intent?.getStringExtra(EXTRA_TEXT)?.ifBlank { null } ?: "Докоснете, за да се върнете"
    val isVideo = intent?.getBooleanExtra(EXTRA_VIDEO, true) == true
    val notification = buildNotification(title, text)

    if (Build.VERSION.SDK_INT >= 34) {
      var types =
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE or
          ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
      if (isVideo) {
        types = types or ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA
      }
      startForeground(NOTIFICATION_ID, notification, types)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }

    return START_STICKY
  }

  override fun onDestroy() {
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }

  private fun buildNotification(title: String, text: String): Notification {
    IncomingCallModule.ensureChannel(applicationContext)
    val launch = applicationContext.packageManager.getLaunchIntentForPackage(
      applicationContext.packageName,
    )?.apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }

    return NotificationCompat.Builder(applicationContext, IncomingCallModule.CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_menu_call)
      .setContentTitle(title)
      .setContentText(text)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setContentIntent(
        android.app.PendingIntent.getActivity(
          applicationContext,
          91,
          launch ?: Intent(),
          IncomingCallModule.pendingIntentFlags(),
        ),
      )
      .setColor(ContextCompat.getColor(applicationContext, android.R.color.holo_blue_dark))
      .build()
  }

  companion object {
    private const val NOTIFICATION_ID = 71021
    private const val EXTRA_TITLE = "ongoing_call_title"
    private const val EXTRA_TEXT = "ongoing_call_text"
    private const val EXTRA_VIDEO = "ongoing_call_video"

    fun start(context: Context, title: String, text: String, isVideo: Boolean) {
      val intent = Intent(context, OngoingCallService::class.java).apply {
        putExtra(EXTRA_TITLE, title)
        putExtra(EXTRA_TEXT, text)
        putExtra(EXTRA_VIDEO, isVideo)
      }
      ContextCompat.startForegroundService(context, intent)
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, OngoingCallService::class.java))
    }
  }
}
