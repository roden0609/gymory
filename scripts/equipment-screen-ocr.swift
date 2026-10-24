import Foundation
import Vision
import ImageIO

// Local-only OCR of ADB screenshots. Bounding boxes use image pixels, top-left origin.
func recognize(_ path: String) throws -> [[String: Any]] {
    let url = URL(fileURLWithPath: path)
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        throw NSError(domain: "equipment-ocr", code: 1)
    }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["zh-Hant", "en-US"]
    request.automaticallyDetectsLanguage = true
    request.usesLanguageCorrection = false
    try VNImageRequestHandler(cgImage: image).perform([request])
    return (request.results ?? []).compactMap { observation in
        guard let candidate = observation.topCandidates(1).first else { return nil }
        let box = observation.boundingBox
        return ["text": candidate.string, "confidence": candidate.confidence,
                "x": box.minX * Double(image.width),
                "y": (1 - box.maxY) * Double(image.height),
                "width": box.width * Double(image.width),
                "height": box.height * Double(image.height)]
    }.sorted { ($0["y"] as! Double) < ($1["y"] as! Double) }
}

func cardBands(_ path: String) -> [[String: Int]] {
    guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { return [] }
    let w = image.width, h = image.height
    var pixels = [UInt8](repeating: 0, count: w * h * 4)
    let space = CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(data: &pixels, width: w, height: h, bitsPerComponent: 8,
        bytesPerRow: w * 4, space: space,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return [] }
    context.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
    var bands: [[String: Int]] = []
    var start: Int? = nil
    for y in 445..<2055 {
        // Narrow left padding is clear of both photos and long equipment names.
        let i = (y * w + 250) * 4
        let r = Int(pixels[i]), g = Int(pixels[i + 1]), b = Int(pixels[i + 2])
        let isLocal = b - r >= 5 && b - g >= 4 && r >= 20 && r < 65
        if isLocal && start == nil { start = y }
        if !isLocal, let first = start {
            if y - first > 35 { bands.append(["top": first, "bottom": y]) }
            start = nil
        }
    }
    if let first = start { bands.append(["top": first, "bottom": 2055]) }
    return bands
}

for path in CommandLine.arguments.dropFirst() {
    do {
        let result: [String: Any] = ["path": path, "lines": try recognize(path), "local_card_bands": cardBands(path)]
        let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
        print(String(data: data, encoding: .utf8)!)
    } catch {
        fputs("OCR failed for \(path): \(error)\n", stderr)
        exit(1)
    }
}
