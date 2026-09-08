package expo.modules.cardocr

import android.net.Uri
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class CardOcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CardOcr")

    AsyncFunction("recognizeText") { imageUri: String ->
      val context = appContext.reactContext
        ?: throw Exception("Камерата не е налична.")

      val uri = when {
        imageUri.startsWith("file://") || imageUri.startsWith("content://") -> Uri.parse(imageUri)
        else -> Uri.fromFile(File(imageUri))
      }

      val image = InputImage.fromFilePath(context, uri)
      val result = Tasks.await(
        TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS).process(image)
      )

      result.text
    }
  }
}
