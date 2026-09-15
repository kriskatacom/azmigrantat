package expo.modules.bunnynativeupload

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import java.net.HttpURLConnection
import java.net.URL

class BunnyUploadForegroundService : Service() {
  private var cancelUrl: String = ""
  private var authToken: String = ""

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_CANCEL) {
      BunnyNativeUploadModule.cancelActiveUpload()
      deleteRemoteVideo()
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf()
      return START_NOT_STICKY
    }

    cancelUrl = intent?.getStringExtra(EXTRA_CANCEL_URL).orEmpty()
    authToken = intent?.getStringExtra(EXTRA_AUTH_TOKEN).orEmpty()

    createChannel()
    startForeground(NOTIFICATION_ID, notification(0))
    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun createChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Качване на видео",
        NotificationManager.IMPORTANCE_LOW,
      )
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
  }

  private fun notification(progress: Int): Notification {
    val cancelIntent = PendingIntent.getService(
      this,
      1001,
      Intent(this, BunnyUploadForegroundService::class.java).setAction(ACTION_CANCEL),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.stat_sys_upload)
      .setContentTitle("Качване на видео")
      .setContentText("Видеото се качва във фонов режим")
      .setProgress(100, progress.coerceIn(0, 100), false)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Прекрати качването", cancelIntent)
      .build()
  }

  companion object {
    private const val CHANNEL_ID = "video-upload"
    private const val NOTIFICATION_ID = 4101
    private const val ACTION_CANCEL = "expo.modules.bunnynativeupload.CANCEL"

    fun start(context: Context, cancelUrl: String, authToken: String) {
      val intent = Intent(context, BunnyUploadForegroundService::class.java)
        .putExtra(EXTRA_CANCEL_URL, cancelUrl)
        .putExtra(EXTRA_AUTH_TOKEN, authToken)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
      else context.startService(intent)
    }

    private const val EXTRA_CANCEL_URL = "cancel_url"
    private const val EXTRA_AUTH_TOKEN = "auth_token"

    fun update(context: Context, progress: Int) {
      val manager = context.getSystemService(NotificationManager::class.java)
      manager.notify(NOTIFICATION_ID, BunnyUploadForegroundService().notificationFor(context, progress))
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, BunnyUploadForegroundService::class.java))
    }
  }

  private fun notificationFor(context: Context, progress: Int): Notification {
    val cancelIntent = PendingIntent.getService(
      context,
      1001,
      Intent(context, BunnyUploadForegroundService::class.java).setAction(ACTION_CANCEL),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    return NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.stat_sys_upload)
      .setContentTitle("Качване на видео")
      .setContentText("Видеото се качва във фонов режим")
      .setProgress(100, progress.coerceIn(0, 100), false)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Прекрати качването", cancelIntent)
      .build()
  }

  private fun deleteRemoteVideo() {
    if (cancelUrl.isBlank() || authToken.isBlank()) return
    Thread {
      try {
        val connection = (URL(cancelUrl).openConnection() as HttpURLConnection).apply {
          requestMethod = "DELETE"
          connectTimeout = 20_000
          readTimeout = 20_000
          setRequestProperty("Authorization", "Bearer $authToken")
          setRequestProperty("Accept", "application/json")
        }
        connection.responseCode
        connection.disconnect()
      } catch (_: Throwable) {
        // The app can retry cleanup when it is opened again.
      }
    }.start()
  }
}
