import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

struct Arguments {
    let manifest: URL
    let outputDirectory: URL
    let report: URL
}

enum ProcessorError: LocalizedError {
    case invalidArguments
    case unreadableImage(String)
    case noForeground
    case outputFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidArguments:
            return "Usage: process-foreground-vision --manifest manifest.json --output-dir output --report report.json"
        case .unreadableImage(let path):
            return "unreadable-image:\(path)"
        case .noForeground:
            return "no-foreground-instances"
        case .outputFailed(let path):
            return "output-failed:\(path)"
        }
    }
}

func parseArguments() throws -> Arguments {
    let values = Array(CommandLine.arguments.dropFirst())
    func value(after key: String) -> String? {
        guard let index = values.firstIndex(of: key), index + 1 < values.count else { return nil }
        return values[index + 1]
    }
    guard
        let manifest = value(after: "--manifest"),
        let outputDirectory = value(after: "--output-dir"),
        let report = value(after: "--report")
    else { throw ProcessorError.invalidArguments }
    return Arguments(
        manifest: URL(fileURLWithPath: manifest),
        outputDirectory: URL(fileURLWithPath: outputDirectory, isDirectory: true),
        report: URL(fileURLWithPath: report)
    )
}

func loadCGImage(_ url: URL) throws -> CGImage {
    guard
        let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, [
            kCGImageSourceShouldCache: true,
            kCGImageSourceShouldAllowFloat: true,
        ] as CFDictionary)
    else { throw ProcessorError.unreadableImage(url.path) }
    return image
}

func writePNG(_ image: CIImage, to url: URL, context: CIContext) throws {
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
    guard let cgImage = context.createCGImage(image, from: image.extent, format: .RGBA8, colorSpace: colorSpace) else {
        throw ProcessorError.outputFailed(url.path)
    }
    guard let destination = CGImageDestinationCreateWithURL(
        url as CFURL,
        UTType.png.identifier as CFString,
        1,
        nil
    ) else { throw ProcessorError.outputFailed(url.path) }
    CGImageDestinationAddImage(destination, cgImage, [
        kCGImageDestinationLossyCompressionQuality: 1.0,
    ] as CFDictionary)
    guard CGImageDestinationFinalize(destination) else { throw ProcessorError.outputFailed(url.path) }
}

func processImage(input: URL, output: URL, context: CIContext) throws -> Int {
    let cgImage = try loadCGImage(input)
    let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
    let request = VNGenerateForegroundInstanceMaskRequest()
    try handler.perform([request])
    guard let observation = request.results?.first else { throw ProcessorError.noForeground }
    let instances = observation.allInstances
    guard !instances.isEmpty else { throw ProcessorError.noForeground }
    let maskBuffer = try observation.generateScaledMaskForImage(forInstances: instances, from: handler)
    let subject = CIImage(cgImage: cgImage)
    var mask = CIImage(cvPixelBuffer: maskBuffer)
    if mask.extent.width != subject.extent.width || mask.extent.height != subject.extent.height {
        mask = mask.transformed(by: CGAffineTransform(
            scaleX: subject.extent.width / mask.extent.width,
            y: subject.extent.height / mask.extent.height
        ))
    }
    let transparent = CIImage(color: CIColor(red: 0, green: 0, blue: 0, alpha: 0)).cropped(to: subject.extent)
    guard let filter = CIFilter(name: "CIBlendWithMask") else { throw ProcessorError.outputFailed(output.path) }
    filter.setValue(subject, forKey: kCIInputImageKey)
    filter.setValue(transparent, forKey: kCIInputBackgroundImageKey)
    filter.setValue(mask, forKey: kCIInputMaskImageKey)
    guard let result = filter.outputImage?.cropped(to: subject.extent) else { throw ProcessorError.outputFailed(output.path) }
    try writePNG(result, to: output, context: context)
    return instances.count
}

let arguments = try parseArguments()
let manifestData = try Data(contentsOf: arguments.manifest)
guard
    let manifest = try JSONSerialization.jsonObject(with: manifestData) as? [String: Any],
    let rows = manifest["rows"] as? [[String: Any]]
else { throw ProcessorError.invalidArguments }

try FileManager.default.createDirectory(at: arguments.outputDirectory, withIntermediateDirectories: true)
let context = CIContext(options: [
    .cacheIntermediates: false,
    .useSoftwareRenderer: false,
])
var results: [[String: Any]] = []

for (index, row) in rows.enumerated() {
    let source = row["source"] as? String ?? ""
    let inputPath = row["filePath"] as? String ?? ""
    var result: [String: Any] = [
        "source": source,
        "inputPath": inputPath,
        "status": "failed",
        "outputPath": "",
        "instances": 0,
        "error": "",
    ]
    if row["status"] as? String == "recovered", !inputPath.isEmpty {
        let input = URL(fileURLWithPath: inputPath)
        let stem = input.deletingPathExtension().lastPathComponent
        let output = arguments.outputDirectory.appendingPathComponent("\(String(format: "%03d", index + 1))-\(stem).png")
        do {
            let instanceCount = try processImage(input: input, output: output, context: context)
            result["status"] = "processed"
            result["outputPath"] = output.path
            result["instances"] = instanceCount
        } catch {
            result["error"] = error.localizedDescription
        }
    } else {
        result["error"] = "source-not-recovered"
    }
    results.append(result)
    if (index + 1) % 10 == 0 || index + 1 == rows.count {
        FileHandle.standardError.write(Data("vision \(index + 1)/\(rows.count)\n".utf8))
    }
}

let report: [String: Any] = [
    "generatedAt": ISO8601DateFormatter().string(from: Date()),
    "total": results.count,
    "processed": results.filter { $0["status"] as? String == "processed" }.count,
    "failed": results.filter { $0["status"] as? String != "processed" }.count,
    "rows": results,
]
let reportData = try JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys])
try reportData.write(to: arguments.report, options: .atomic)
