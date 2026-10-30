import AppKit

enum MenuFavicon {
  static func apply(to entry: NSMenuItem, favicon: String?, symbol: String?, budget: inout Int) {
    entry.image = favicon.flatMap { image($0, budget: &budget) }
      ?? symbol.flatMap { NSImage(systemSymbolName: $0, accessibilityDescription: nil) }
  }

  static func image(_ source: String, budget: inout Int) -> NSImage? {
    guard let url = URL(string: source), url.isFileURL || url.scheme == "data", budget > 0 else { return nil }
    budget -= 1
    guard let data = try? Data(contentsOf: url), let image = NSImage(data: data) else { return nil }
    image.size = NSSize(width: 16, height: 16)
    return image
  }
}
