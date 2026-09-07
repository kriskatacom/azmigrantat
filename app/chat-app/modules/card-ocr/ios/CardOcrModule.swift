import ExpoModulesCore
import UIKit
import Vision

public class CardOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CardOcr")

    AsyncFunction("recognizeText") { (imageUri: String) -> String in
      let url: URL
      if imageUri.hasPrefix("file://") || imageUri.hasPrefix("content://") {
        guard let parsed = URL(string: imageUri) else {
          return ""
        }
        url = parsed
      } else {
        url = URL(fileURLWithPath: imageUri)
      }

      guard
        let data = try? Data(contentsOf: url),
        let image = UIImage(data: data),
        let cgImage = image.cgImage
      else {
        return ""
      }

      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = false

      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      try handler.perform([request])

      return (request.results ?? [])
        .compactMap { $0.topCandidates(1).first?.string }
        .joined(separator: "\n")
    }
  }
}
