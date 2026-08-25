package expo.modules.incomingcall

import android.Manifest
import android.app.Activity
import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class IncomingCallDisplayOptions : Record {
  @Field
  var callId: String = ""

  @Field
  var callerId: Int = 0

  @Field
  var callerName: String = "Потребител"

  @Field
  var callerAvatar: String? = null

  @Field
  var callType: String = "video"

  @Field
  var timestamp: Double = 0.0
}

class IncomingCallConfigureOptions : Record {
  @Field
  var token: String? = null

  @Field
  var socketUrl: String? = null
}

object IncomingCallAppState {
  @Volatile
  var isForeground: Boolean = false
}

class IncomingCallModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("IncomingCall")

    Events("onLaunchAction")

    OnCreate {
      val activity = appContext.currentActivity
      if (activity != null) {
        val launch = captureIntent(activity.intent, activity.applicationContext)
        IncomingCallAppState.isForeground = true
        if (launch != null && isAcceptAction(launch["action"] as? String)) {
          sendEvent("onLaunchAction", launch)
        }
      }
    }

    OnNewIntent { intent ->
      val launch = captureIntent(intent, appContext.currentActivity?.applicationContext)
      if (launch != null && isAcceptAction(launch["action"] as? String)) {
        Log.i(
          TAG,
          "[CALL] launch action received action=${launch["action"]} callId=${launch["callId"]}",
        )
        sendEvent("onLaunchAction", launch)
      }
    }

    OnActivityEntersForeground {
      IncomingCallAppState.isForeground = true
      val launch = pendingLaunch
      if (launch != null && isAcceptAction(launch["action"] as? String)) {
        Log.i(
          TAG,
          "[CALL] launch action received action=${launch["action"]} callId=${launch["callId"]}",
        )
        sendEvent("onLaunchAction", launch)
      }
    }

    OnActivityEntersBackground {
      IncomingCallAppState.isForeground = false
    }

    AsyncFunction("configure") { options: IncomingCallConfigureOptions ->
      val context = context()
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      prefs.edit()
        .putString(KEY_TOKEN, options.token)
        .putString(KEY_SOCKET_URL, options.socketUrl?.trimEnd('/'))
        .apply()
    }

    AsyncFunction("setForeground") { isForeground: Boolean ->
      IncomingCallAppState.isForeground = isForeground
    }

    AsyncFunction("display") { options: IncomingCallDisplayOptions ->
      if (options.callId.isNotBlank()) {
        display(context(), options, launchApp = false)
      }
      null
    }

    AsyncFunction("dismiss") { callId: String ->
      dismiss(context(), callId)
    }

    AsyncFunction("dismissAll") {
      dismissAll(context())
    }

    AsyncFunction("canUseFullScreenIntent") {
      canUseFullScreenIntent(context())
    }

    AsyncFunction("consumeLaunchAction") {
      Log.i(TAG, "[IncomingCall] React Native ready")
      val appContext = try {
        context()
      } catch (_: Exception) {
        null
      }
      val launch = consumeLaunchAction(appContext)
      if (launch != null) {
        Log.i(
          TAG,
          "[CALL] launch action received action=${launch["action"]} callId=${launch["callId"]}",
        )
      }
      launch
    }

    AsyncFunction("startOngoingCall") { options: IncomingCallDisplayOptions ->
      try {
        OngoingCallService.start(
          context(),
          options.callerName.ifBlank { "Обаждане в ход" },
          if (options.callType == "audio") "Аудио обаждане" else "Видео обаждане",
          options.callType != "audio",
        )
      } catch (error: Exception) {
        Log.e(TAG, "[CALL] ongoing service failed: ${error.message}")
      }
    }

    AsyncFunction("stopOngoingCall") {
      OngoingCallService.stop(context())
    }

    AsyncFunction("openFullScreenIntentSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        val context = context()
        val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
          data = Uri.parse("package:${context.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
      }
      null
    }
  }

  private fun context(): Context {
    return appContext.reactContext?.applicationContext
      ?: appContext.currentActivity?.applicationContext
      ?: throw IllegalStateException("Android context не е наличен.")
  }

  companion object {
    const val TAG = "IncomingCall"
    const val CHANNEL_ID = "incoming_video_calls"
    const val PREFS = "incoming_call_prefs"
    const val KEY_TOKEN = "auth_token"
    const val KEY_SOCKET_URL = "socket_url"
    private const val KEY_PENDING_CALL_ID = "pending_call_id"
    private const val KEY_PENDING_ACTION = "pending_action"
    private const val KEY_PENDING_CALLER_ID = "pending_caller_id"
    private const val KEY_PENDING_CALLER_NAME = "pending_caller_name"
    private const val KEY_PENDING_CALLER_AVATAR = "pending_caller_avatar"
    private const val KEY_PENDING_CALL_TYPE = "pending_call_type"
    private const val KEY_PENDING_TIMESTAMP = "pending_timestamp"
    private const val KEY_CANCELLED_CALLS = "cancelled_call_ids"
    const val EXTRA_CALL_ID = "incoming_call_id"
    const val EXTRA_ACTION = "incoming_call_action"
    const val EXTRA_CALLER_ID = "incoming_call_caller_id"
    const val EXTRA_CALLER_NAME = "incoming_call_caller_name"
    const val EXTRA_CALLER_AVATAR = "incoming_call_caller_avatar"
    const val EXTRA_CALL_TYPE = "incoming_call_type"
    const val EXTRA_TIMESTAMP = "incoming_call_timestamp"
    const val ACTION_ACCEPT = "expo.modules.incomingcall.ACTION_ACCEPT"
    const val ACTION_DECLINE = "expo.modules.incomingcall.ACTION_DECLINE"
    private const val NATIVE_RING_TIMEOUT_MS = 35_000L
    val activeCallIds = mutableSetOf<String>()

    @Volatile
    private var pendingLaunch: Map<String, Any?>? = null
    private val cancelledCallIds = linkedSetOf<String>()
    private val acceptedCallIds = linkedSetOf<String>()
    private val launchedCallIds = mutableSetOf<String>()
    private var lastLoggedLaunch: String? = null
    private val timeoutHandler = Handler(Looper.getMainLooper())
    private val timeoutRunnables = mutableMapOf<String, Runnable>()

    fun notificationId(callId: String): Int {
      return callId.hashCode() and 0x7fffffff
    }

    fun onActivityLaunched(activity: Activity, intent: Intent?, source: String = "launched") {
      captureIntent(intent, activity.applicationContext)
      val applyFlags = {
        applyDisplayFlags(activity, intent)
        val callId = intentCallId(intent)
        val action = intent?.getStringExtra(EXTRA_ACTION)
          ?: intent?.data?.getQueryParameter("action")
          ?: "open"
        Log.i(
          TAG,
          "[CALL] MainActivity $source action=$action callId=$callId extrasCallId=${intent?.getStringExtra(EXTRA_CALL_ID)}",
        )
        val launchKey = "$callId:$action"
        if (!callId.isNullOrBlank() && lastLoggedLaunch != launchKey) {
          lastLoggedLaunch = launchKey
          Log.i(TAG, "[CALL] MainActivity received call payload callId=$callId")
        }
      }

      if (Looper.myLooper() == Looper.getMainLooper()) {
        applyFlags()
      } else {
        activity.runOnUiThread(applyFlags)
      }
    }

    fun consumeLaunchAction(context: Context? = null): Map<String, Any?>? {
      val current = pendingLaunch ?: context?.let { readPersistedLaunch(it) }
      pendingLaunch = null
      if (context != null) {
        clearPersistedLaunch(context)
      }
      return current
    }

    fun rememberLaunch(
      callId: String,
      action: String,
      callerId: Int,
      callerName: String?,
      callerAvatar: String?,
      callType: String = "video",
      timestamp: Long = 0L,
      context: Context? = null,
    ): Map<String, Any?>? {
      if (callId.isBlank()) {
        return null
      }

      if (isCancelled(callId, context) && !isAcceptAction(action)) {
        Log.i(TAG, "[CALL] stale call ignored callId=$callId")
        return null
      }

      val normalizedAction = normalizeLaunchAction(action)
      val existing = pendingLaunch ?: context?.let { readPersistedLaunch(it) }
      if (
        !isAcceptAction(normalizedAction) &&
        isAcceptAction(existing?.get("action") as? String) &&
        existing?.get("callId") == callId
      ) {
        Log.i(TAG, "[IncomingCall] pending answer stored callId=$callId")
        return existing
      }

      if (isAcceptAction(normalizedAction)) {
        val isFirstAccept = acceptedCallIds.add(callId)
        Log.i(TAG, "[CALL] native answer pressed callId=$callId")
        if (context != null) {
          dismiss(context, callId)
          if (isFirstAccept) {
            postCallAction(context.applicationContext, "/calls/accept", callId)
          }
        }
      }

      pendingLaunch = mapOf(
        "callId" to callId,
        "action" to normalizedAction,
        "callerId" to callerId,
        "callerName" to callerName,
        "callerAvatar" to callerAvatar,
        "callType" to callType,
        "timestamp" to timestamp,
      )

      if (context != null) {
        persistLaunch(context, pendingLaunch!!)
      }

      return pendingLaunch
    }

    fun captureIntent(intent: Intent?, context: Context? = null): Map<String, Any?>? {
      if (intent == null) {
        return null
      }

      val data = intent.data
      val callId = intentCallId(intent) ?: return null
      val action = normalizeLaunchAction(
        intent.getStringExtra(EXTRA_ACTION)
          ?: data?.getQueryParameter("action")
          ?: when (intent.action) {
            ACTION_ACCEPT -> "accept"
            ACTION_DECLINE -> "decline"
            else -> null
          }
          ?: "open",
      )
      val callerId = intent.getIntExtra(EXTRA_CALLER_ID, 0).takeIf { it > 0 }
        ?: data?.getQueryParameter("callerId")?.toIntOrNull()
        ?: 0
      val callerName = intent.getStringExtra(EXTRA_CALLER_NAME)
        ?: data?.getQueryParameter("callerName")
      val callerAvatar = intent.getStringExtra(EXTRA_CALLER_AVATAR)
        ?: data?.getQueryParameter("callerAvatar")
      val callType = intent.getStringExtra(EXTRA_CALL_TYPE)
        ?: data?.getQueryParameter("callType")
        ?: "video"
      val timestamp = intent.getLongExtra(EXTRA_TIMESTAMP, 0L).takeIf { it > 0 }
        ?: data?.getQueryParameter("timestamp")?.toLongOrNull()
        ?: 0L

      return rememberLaunch(
        callId,
        action,
        callerId,
        callerName,
        callerAvatar,
        callType,
        timestamp,
        context,
      )
    }

    fun handleRemoteMessage(context: Context, data: Map<String, String>): Boolean {
      val type = data["type"] ?: return false
      val callId = data["call_id"]?.trim().orEmpty()

      if (callId.isEmpty()) {
        return false
      }

      val isIncoming = type == "incoming_call" || type == "incoming_video_call"
      val isEnded = type == "incoming_call_ended" || type == "call_cancelled" || type == "call_ended"

      if (!isIncoming && !isEnded) {
        return false
      }

        if (isEnded) {
          if (
            acceptedCallIds.contains(callId) ||
            (
              pendingLaunch?.get("action") == "accept" &&
                pendingLaunch?.get("callId") == callId
              )
          ) {
            Log.i(TAG, "[CALL] ignore ended after native accept callId=$callId")
            dismiss(context, callId)
            return true
          }
          handleCallEnded(context, callId)
          return true
        }

      if (IncomingCallAppState.isForeground) {
        Log.i(TAG, "[CALL] skip native launch, app already foreground callId=$callId")
        return true
      }

      Log.i(
        TAG,
        "[CALL] background/killed branch callId=$callId foreground=false API=${Build.VERSION.SDK_INT}",
      )

      val options = IncomingCallDisplayOptions().apply {
        this.callId = callId
        this.callerId = data["caller_id"]?.toIntOrNull() ?: 0
        this.callerName = data["caller_name"]?.ifBlank { null } ?: "Потребител"
        this.callerAvatar = data["caller_avatar"]
        this.callType = data["call_type"] ?: "video"
        this.timestamp = data["timestamp"]?.toDoubleOrNull() ?: 0.0
      }

      rememberLaunch(
        options.callId,
        "open",
        options.callerId,
        options.callerName,
        options.callerAvatar,
        options.callType,
        options.timestamp.toLong(),
        context,
      )
      display(context, options, launchApp = true)
      return true
    }

    fun display(
      context: Context,
      options: IncomingCallDisplayOptions,
      launchApp: Boolean = false,
    ) {
      if (options.callId.isBlank()) {
        return
      }

      if (isCancelled(options.callId, context)) {
        Log.i(TAG, "[CALL] stale call ignored callId=${options.callId}")
        return
      }

      activeCallIds.add(options.callId)
      scheduleTimeout(context.applicationContext, options.callId)

      val canNotify =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
          ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
      val canUseFsi = canNotify && canUseFullScreenIntent(context)
      val notifyId = notificationId(options.callId)

      Log.i(TAG, "[CALL] API=${Build.VERSION.SDK_INT}")
      Log.i(TAG, "[CALL] channelId=$CHANNEL_ID")
      Log.i(TAG, "[CALL] canNotify=$canNotify canUseFsi=$canUseFsi launchApp=$launchApp")

      if (canNotify) {
        ensureChannel(context)
        val importance = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.getSystemService(NotificationManager::class.java)
            ?.getNotificationChannel(CHANNEL_ID)
            ?.importance
        } else {
          null
        }
        Log.i(TAG, "[CALL] channelImportance=$importance")
        val notification = buildNotification(context, options)
        Log.i(TAG, "[CALL] posting notification id=$notifyId")
        NotificationManagerCompat.from(context).notify(notifyId, notification)
        Log.i(
          TAG,
          "[IncomingCall] full-screen intent posted callId=${options.callId} fsi=$canUseFsi sdk=${Build.VERSION.SDK_INT} launchApp=$launchApp",
        )
      } else {
        Log.w(TAG, "[IncomingCall] notification permission missing callId=${options.callId}")
      }
    }

    fun dismiss(context: Context, callId: String) {
      activeCallIds.remove(callId)
      launchedCallIds.remove(callId)
      cancelTimeout(callId)
      NotificationManagerCompat.from(context).cancel(notificationId(callId))
    }

    fun dismissAll(context: Context) {
      val manager = NotificationManagerCompat.from(context)
      activeCallIds.forEach { manager.cancel(notificationId(it)) }
      activeCallIds.clear()
      launchedCallIds.clear()
      timeoutRunnables.keys.toList().forEach { cancelTimeout(it) }
    }

    fun canUseFullScreenIntent(context: Context): Boolean {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        return true
      }

      val manager = context.getSystemService(NotificationManager::class.java)
      return manager?.canUseFullScreenIntent() ?: false
    }

    fun ensureChannel(context: Context) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        return
      }

      val manager = context.getSystemService(NotificationManager::class.java) ?: return
      val existing = manager.getNotificationChannel(CHANNEL_ID)

      if (existing != null && existing.importance < NotificationManager.IMPORTANCE_HIGH) {
        manager.deleteNotificationChannel(CHANNEL_ID)
      } else if (existing != null) {
        return
      }

      val channel = NotificationChannel(
        CHANNEL_ID,
        "Входящи обаждания",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Сигнал за входящо видео обаждане"
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        setBypassDnd(true)
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 400, 200, 400, 200, 400)
        setSound(
          ringtoneUri(context),
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        )
      }

      manager.createNotificationChannel(channel)
    }

    fun ringtoneUri(context: Context): Uri {
      val resourceId = context.resources.getIdentifier("incoming_call", "raw", context.packageName)

      if (resourceId != 0) {
        return Uri.parse("android.resource://${context.packageName}/$resourceId")
      }

      return RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
    }

    fun launchIntent(
      context: Context,
      callId: String,
      action: String,
      callerId: Int = 0,
      callerName: String? = null,
      callerAvatar: String? = null,
      callType: String = "video",
      timestamp: Long = 0L,
    ): Intent {
      val deepLink = Uri.Builder()
        .scheme("chatapp")
        .authority("incoming-call")
        .appendQueryParameter("callId", callId)
        .appendQueryParameter("action", action)
        .appendQueryParameter("callerId", callerId.toString())
        .appendQueryParameter("callType", callType)
        .apply {
          if (timestamp > 0L) {
            appendQueryParameter("timestamp", timestamp.toString())
          }
          if (!callerName.isNullOrBlank()) {
            appendQueryParameter("callerName", callerName)
          }
          if (!callerAvatar.isNullOrBlank()) {
            appendQueryParameter("callerAvatar", callerAvatar)
          }
        }
        .build()

      return Intent().apply {
        component = resolveMainActivity(context)
        this.action = if (isAcceptAction(action)) ACTION_ACCEPT else Intent.ACTION_VIEW
        data = deepLink
        putExtra(EXTRA_CALL_ID, callId)
        putExtra(EXTRA_ACTION, action)
        putExtra(EXTRA_CALLER_ID, callerId)
        putExtra(EXTRA_CALLER_NAME, callerName)
        putExtra(EXTRA_CALLER_AVATAR, callerAvatar)
        putExtra(EXTRA_CALL_TYPE, callType)
        putExtra(EXTRA_TIMESTAMP, timestamp)
        addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_SINGLE_TOP or
            Intent.FLAG_ACTIVITY_CLEAR_TOP or
            Intent.FLAG_ACTIVITY_NO_USER_ACTION
        )
      }
    }

    fun buildNotification(context: Context, options: IncomingCallDisplayOptions): Notification {
      // Accept must open MainActivity directly. Android 12+ blocks notification
      // trampolines that try to start an Activity from a BroadcastReceiver.
      val acceptIntent = activityPendingIntent(context, "accept", options, "accept")
      val declineIntent = actionIntent(context, ACTION_DECLINE, options)
      val contentIntent = activityPendingIntent(context, "open", options)
      val fullScreenIntent = activityPendingIntent(context, "full", options)
      Log.i(TAG, "[CALL] fullScreenPendingIntentNull=false")
      val caller = Person.Builder()
        .setName(options.callerName.ifBlank { "Потребител" })
        .setImportant(true)
        .build()

      val extras = Bundle().apply {
        putString("type", "incoming_call")
        putString("call_id", options.callId)
        putInt("caller_id", options.callerId)
        putString("caller_name", options.callerName)
        putString("caller_avatar", options.callerAvatar)
        putString("call_type", options.callType)
        putString("timestamp", options.timestamp.toLong().toString())
      }

      val builder = NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(android.R.drawable.ic_menu_call)
        .setContentTitle(options.callerName.ifBlank { "Потребител" })
        .setContentText(
          if (options.callType == "audio") "Входящо аудио обаждане"
          else "Входящо видео обаждане",
        )
        .setCategory(NotificationCompat.CATEGORY_CALL)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setPriority(NotificationCompat.PRIORITY_MAX)
        .setOngoing(true)
        .setAutoCancel(false)
        .setTimeoutAfter(NATIVE_RING_TIMEOUT_MS)
        .setSound(ringtoneUri(context))
        .setVibrate(longArrayOf(0, 400, 200, 400, 200, 400))
        .setContentIntent(contentIntent)
        .setFullScreenIntent(fullScreenIntent, true)
        .setColor(ContextCompat.getColor(context, android.R.color.holo_blue_dark))
        .setExtras(extras)
        .addPerson(caller)
      Log.i(TAG, "[CALL] fullScreenIntentConfigured=true")

      builder
        .addAction(0, "Откажи", declineIntent)
        .addAction(0, "Приеми", acceptIntent)

      return builder.build()
    }

    private fun handleCallEnded(context: Context, callId: String) {
      if (
        acceptedCallIds.contains(callId) ||
        (
          pendingLaunch?.get("action") == "accept" &&
            pendingLaunch?.get("callId") == callId
          )
      ) {
        Log.i(TAG, "[IncomingCall] keep pending answer after ended push callId=$callId")
        dismiss(context, callId)
        return
      }

      Log.i(TAG, "[CALL] call ended callId=$callId")
      markCancelled(context, callId)
      if (pendingLaunch?.get("callId") == callId) {
        pendingLaunch = null
      }
      clearPersistedLaunch(context, callId)
      dismiss(context, callId)
    }

    private fun applyDisplayFlags(activity: Activity, intent: Intent?) {
      if (intentCallId(intent).isNullOrBlank()) {
        return
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        activity.setShowWhenLocked(true)
        activity.setTurnScreenOn(true)
      } else {
        @Suppress("DEPRECATION")
        activity.window.addFlags(
          WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )
      }

      activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

      val action = intent?.getStringExtra(EXTRA_ACTION)
        ?: intent?.data?.getQueryParameter("action")
        ?: "open"
      if (isAcceptAction(action) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        activity.getSystemService(KeyguardManager::class.java)
          ?.requestDismissKeyguard(activity, null)
      }
    }

    private fun resolveMainActivity(context: Context): ComponentName {
      val launcher = context.packageManager.getLaunchIntentForPackage(context.packageName)
      val component = launcher?.component
      if (component != null) {
        return component
      }

      return ComponentName(context.packageName, "${context.packageName}.MainActivity")
    }

    private fun intentCallId(intent: Intent?): String? {
      if (intent == null) {
        return null
      }

      return intent.getStringExtra(EXTRA_CALL_ID)
        ?: intent.data?.getQueryParameter("callId")
    }

    fun pendingIntentFlags(): Int {
      var flags = PendingIntent.FLAG_UPDATE_CURRENT

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        flags = flags or PendingIntent.FLAG_IMMUTABLE
      }

      return flags
    }

    private fun isAcceptAction(action: String?): Boolean {
      return action == "accept" || action == "answer"
    }

    private fun normalizeLaunchAction(action: String?): String {
      return when {
        isAcceptAction(action) -> "accept"
        action == "decline" -> "decline"
        else -> "open"
      }
    }

    private fun activityPendingIntent(
      context: Context,
      kind: String,
      options: IncomingCallDisplayOptions,
      action: String = "open",
    ): PendingIntent {
      val launch = launchIntent(
        context,
        options.callId,
        action,
        options.callerId,
        options.callerName,
        options.callerAvatar,
        options.callType,
        options.timestamp.toLong(),
      )
      val requestCode = notificationId("$kind:${options.callId}")
      if (kind == "full") {
        Log.i(
          TAG,
          "[CALL] fullScreenActivity=${launch.component} intentFlags=${launch.flags} pendingFlags=${pendingIntentFlags()}",
        )
      }

      return PendingIntent.getActivity(context, requestCode, launch, pendingIntentFlags())
    }

    private fun actionIntent(
      context: Context,
      action: String,
      options: IncomingCallDisplayOptions,
    ): PendingIntent {
      val intent = Intent(context, IncomingCallActionReceiver::class.java).apply {
        this.action = action
        putExtra(EXTRA_CALL_ID, options.callId)
        putExtra(EXTRA_CALLER_ID, options.callerId)
        putExtra(EXTRA_CALLER_NAME, options.callerName)
        putExtra(EXTRA_CALLER_AVATAR, options.callerAvatar)
        putExtra(EXTRA_CALL_TYPE, options.callType)
        putExtra(EXTRA_TIMESTAMP, options.timestamp.toLong())
      }

      val requestCode = notificationId("$action:${options.callId}")
      return PendingIntent.getBroadcast(context, requestCode, intent, pendingIntentFlags())
    }

    fun postCallAction(
      context: Context,
      path: String,
      callId: String,
      onComplete: ((Boolean) -> Unit)? = null,
    ) {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val token = prefs.getString(KEY_TOKEN, null)
      val socketUrl = prefs.getString(KEY_SOCKET_URL, null)

      Thread {
        var success = false
        try {
          if (!token.isNullOrBlank() && !socketUrl.isNullOrBlank()) {
            for (attempt in 1..2) {
              val connection =
                java.net.URL("$socketUrl$path").openConnection() as java.net.HttpURLConnection
              try {
                connection.requestMethod = "POST"
                connection.connectTimeout = 2_000
                connection.readTimeout = 2_000
                connection.doOutput = true
                connection.setRequestProperty("Authorization", "Bearer $token")
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("Accept", "application/json")

                java.io.OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                  writer.write("""{"call_id":"${callId.replace("\"", "")}"}""")
                }

                val status = connection.responseCode
                success = status in 200..299
                Log.i(TAG, "[CALL] native $path status=$status callId=$callId attempt=$attempt")
                if (success || status < 500) {
                  break
                }
              } catch (error: Exception) {
                Log.e(
                  TAG,
                  "[CALL] native $path attempt=$attempt failed callId=$callId: ${error.message}",
                )
              } finally {
                connection.disconnect()
              }
            }
          } else {
            Log.w(TAG, "[CALL] native $path skipped, missing session callId=$callId")
          }
        } catch (error: Exception) {
          Log.e(TAG, "[CALL] native $path failed callId=$callId: ${error.message}")
        } finally {
          onComplete?.invoke(success)
        }
      }.start()
    }

    private fun scheduleTimeout(context: Context, callId: String) {
      cancelTimeout(callId)
      val runnable = Runnable {
        Log.i(TAG, "[CALL] timeout callId=$callId")
        handleCallEnded(context, callId)
      }
      timeoutRunnables[callId] = runnable
      timeoutHandler.postDelayed(runnable, NATIVE_RING_TIMEOUT_MS)
    }

    private fun cancelTimeout(callId: String) {
      timeoutRunnables.remove(callId)?.let { timeoutHandler.removeCallbacks(it) }
    }

    private fun isCancelled(callId: String, context: Context?): Boolean {
      if (cancelledCallIds.contains(callId)) {
        return true
      }

      val persisted = context
        ?.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        ?.getString(KEY_CANCELLED_CALLS, null)
        ?.split(",")
        ?.filter { it.isNotBlank() }
        .orEmpty()

      if (persisted.contains(callId)) {
        cancelledCallIds.add(callId)
        return true
      }

      return false
    }

    private fun markCancelled(context: Context, callId: String) {
      cancelledCallIds.add(callId)
      while (cancelledCallIds.size > 20) {
        cancelledCallIds.remove(cancelledCallIds.first())
      }

      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_CANCELLED_CALLS, cancelledCallIds.joinToString(","))
        .apply()
    }

    private fun persistLaunch(context: Context, launch: Map<String, Any?>) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_PENDING_CALL_ID, launch["callId"] as? String)
        .putString(KEY_PENDING_ACTION, launch["action"] as? String)
        .putInt(KEY_PENDING_CALLER_ID, launch["callerId"] as? Int ?: 0)
        .putString(KEY_PENDING_CALLER_NAME, launch["callerName"] as? String)
        .putString(KEY_PENDING_CALLER_AVATAR, launch["callerAvatar"] as? String)
        .putString(KEY_PENDING_CALL_TYPE, launch["callType"] as? String ?: "video")
        .putLong(KEY_PENDING_TIMESTAMP, launch["timestamp"] as? Long ?: 0L)
        .apply()
    }

    private fun readPersistedLaunch(context: Context): Map<String, Any?>? {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val callId = prefs.getString(KEY_PENDING_CALL_ID, null)?.trim().orEmpty()

      if (callId.isEmpty() || isCancelled(callId, context)) {
        return null
      }

      return mapOf(
        "callId" to callId,
        "action" to (prefs.getString(KEY_PENDING_ACTION, "open") ?: "open"),
        "callerId" to prefs.getInt(KEY_PENDING_CALLER_ID, 0),
        "callerName" to prefs.getString(KEY_PENDING_CALLER_NAME, null),
        "callerAvatar" to prefs.getString(KEY_PENDING_CALLER_AVATAR, null),
        "callType" to (prefs.getString(KEY_PENDING_CALL_TYPE, "video") ?: "video"),
        "timestamp" to prefs.getLong(KEY_PENDING_TIMESTAMP, 0L),
      )
    }

    private fun clearPersistedLaunch(context: Context, callId: String? = null) {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val storedId = prefs.getString(KEY_PENDING_CALL_ID, null)

      if (callId != null && storedId != null && storedId != callId) {
        return
      }

      prefs.edit()
        .remove(KEY_PENDING_CALL_ID)
        .remove(KEY_PENDING_ACTION)
        .remove(KEY_PENDING_CALLER_ID)
        .remove(KEY_PENDING_CALLER_NAME)
        .remove(KEY_PENDING_CALLER_AVATAR)
        .remove(KEY_PENDING_CALL_TYPE)
        .remove(KEY_PENDING_TIMESTAMP)
        .apply()
    }
  }
}
