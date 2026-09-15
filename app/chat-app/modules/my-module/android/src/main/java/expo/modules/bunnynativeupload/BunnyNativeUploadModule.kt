package expo.modules.bunnynativeupload

import android.net.Uri
import android.os.Bundle
import org.json.JSONObject
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.BufferedInputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class BunnyNativeUploadModule : Module() {
  private val executor = Executors.newCachedThreadPool()
  private val cancelledUploads = ConcurrentHashMap<String, AtomicBoolean>()

  override fun definition() = ModuleDefinition {
    Name("BunnyNativeUpload")
    Events("onProgress")

    Function("startUpload") {
        sourceUri: String,
        endpoint: String,
        libraryId: Int,
        videoId: String,
        signature: String,
        expires: Long,
        contentType: String,
        backgroundConfig: String,
      ->
      val uploadId = UUID.randomUUID().toString()
      cancelledUploads[uploadId] = AtomicBoolean(false)
      activeUploadId = uploadId
      activeCancellation = cancelledUploads[uploadId]
      val context = appContext.reactContext ?: error("React context is unavailable")
      val config = runCatching { JSONObject(backgroundConfig) }.getOrDefault(JSONObject())
      BunnyUploadForegroundService.start(
        context,
        config.optString("cancelUrl"),
        config.optString("authToken"),
      )
      executor.execute {
        try {
          upload(
            uploadId,
            sourceUri,
            endpoint,
            libraryId,
            videoId,
            signature,
            expires,
            contentType,
          )
        } catch (error: Throwable) {
          emit(uploadId, 0, "error", error.message ?: "Native upload failed")
        } finally {
          cancelledUploads.remove(uploadId)
          if (activeUploadId == uploadId) {
            activeUploadId = null
            activeCancellation = null
            appContext.reactContext?.let { BunnyUploadForegroundService.stop(it) }
          }
        }
      }
      uploadId
    }

    Function("cancelUpload") { uploadId: String ->
      cancelledUploads[uploadId]?.set(true)
    }
  }

  private fun upload(
    uploadId: String,
    sourceUri: String,
    endpoint: String,
    libraryId: Int,
    videoId: String,
    signature: String,
    expires: Long,
    contentType: String,
  ) {
    val context = appContext.reactContext ?: error("React context is unavailable")
    val resolver = context.contentResolver
    val source = resolver.openInputStream(Uri.parse(sourceUri)) ?: error("Video file cannot be opened")
    val fileSize = resolver.openAssetFileDescriptor(Uri.parse(sourceUri), "r")?.use { it.length }
      ?: error("Video file size cannot be determined")

    val uploadUrl = createUpload(endpoint, libraryId, videoId, signature, expires, contentType, fileSize)
    var offset = 0L
    val chunk = ByteArray(512 * 1024)
    BufferedInputStream(source).use { input ->
      while (offset < fileSize) {
        if (cancelledUploads[uploadId]?.get() == true) error("Upload cancelled")
        val wanted = minOf(chunk.size.toLong(), fileSize - offset).toInt()
        var read = 0
        while (read < wanted) {
          val count = input.read(chunk, read, wanted - read)
          if (count < 0) error("Video file ended before the expected size")
          read += count
        }

        var attempt = 0
        while (true) {
          if (cancelledUploads[uploadId]?.get() == true) error("Upload cancelled")
          try {
            val response = patchChunk(
              uploadUrl,
              chunk,
              read,
              offset,
              libraryId,
              videoId,
              signature,
              expires,
            )
            offset = response
            break
          } catch (error: Throwable) {
            attempt += 1
            if (attempt >= 4) throw error
            Thread.sleep((attempt * 1500L).coerceAtMost(6000L))
          }
        }

        emit(uploadId, ((offset * 100) / fileSize).toInt().coerceIn(0, 99), "uploading", null)
      }
    }
    emit(uploadId, 100, "success", null)
  }

  private fun createUpload(
    endpoint: String,
    libraryId: Int,
    videoId: String,
    signature: String,
    expires: Long,
    contentType: String,
    fileSize: Long,
  ): String {
    val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
      requestMethod = "POST"
      doOutput = true
      connectTimeout = 20_000
      readTimeout = 30_000
      setRequestProperty("Tus-Resumable", "1.0.0")
      setRequestProperty("Upload-Length", fileSize.toString())
      setRequestProperty("Content-Length", "0")
      setRequestProperty("AuthorizationSignature", signature)
      setRequestProperty("AuthorizationExpire", expires.toString())
      setRequestProperty("LibraryId", libraryId.toString())
      setRequestProperty("VideoId", videoId)
      setRequestProperty("Upload-Metadata", "filetype ${android.util.Base64.encodeToString(contentType.toByteArray(), android.util.Base64.NO_WRAP)}")
      setFixedLengthStreamingMode(0)
    }
    connection.outputStream.use { }
    val status = connection.responseCode
    val location = connection.getHeaderField("Location")
    val responseBody = readResponseBody(connection, status)
    connection.disconnect()
    if (status !in 200..299 || location.isNullOrBlank()) {
      error("Bunny upload session could not be created (HTTP $status): $responseBody")
    }
    return URL(URL(endpoint), location).toString()
  }

  private fun patchChunk(
    url: String,
    bytes: ByteArray,
    length: Int,
    offset: Long,
    libraryId: Int,
    videoId: String,
    signature: String,
    expires: Long,
  ): Long {
    val connection = (URL(url).openConnection() as HttpURLConnection).apply {
      requestMethod = "PATCH"
      doOutput = true
      connectTimeout = 20_000
      readTimeout = 60_000
      setRequestProperty("Tus-Resumable", "1.0.0")
      setRequestProperty("Upload-Offset", offset.toString())
      setRequestProperty("Content-Type", "application/offset+octet-stream")
      setRequestProperty("Content-Length", length.toString())
      setRequestProperty("AuthorizationSignature", signature)
      setRequestProperty("AuthorizationExpire", expires.toString())
      setRequestProperty("LibraryId", libraryId.toString())
      setRequestProperty("VideoId", videoId)
      setFixedLengthStreamingMode(length)
    }
    connection.outputStream.use { it.write(bytes, 0, length) }
    val status = connection.responseCode
    val nextOffset = connection.getHeaderField("Upload-Offset")?.toLongOrNull()
    val responseBody = readResponseBody(connection, status)
    connection.disconnect()
    if (status !in 200..299 || nextOffset == null) {
      error("Bunny chunk was not confirmed (HTTP $status): $responseBody")
    }
    return nextOffset
  }

  private fun readResponseBody(connection: HttpURLConnection, status: Int): String {
    val stream = if (status >= 400) connection.errorStream else connection.inputStream
    return stream?.bufferedReader()?.use { it.readText().take(500) }.orEmpty()
  }

  private fun emit(uploadId: String, percentage: Int, status: String, message: String?) {
    appContext.reactContext?.let { context ->
      if (status == "uploading") BunnyUploadForegroundService.update(context, percentage)
    }
    val payload = Bundle().apply {
      putString("uploadId", uploadId)
      putInt("percentage", percentage)
      putString("status", status)
      if (message != null) putString("message", message)
    }
    sendEvent("onProgress", payload)
  }

  companion object {
    @Volatile
    var activeUploadId: String? = null

    @Volatile
    var activeCancellation: AtomicBoolean? = null

    @JvmStatic
    fun cancelActiveUpload() {
      activeCancellation?.set(true)
    }
  }
}
