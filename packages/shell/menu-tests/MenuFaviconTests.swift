import AppKit
import XCTest
@testable import ArdiaMenuCore

final class MenuFaviconTests: XCTestCase {
  let png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9ioAAAAASUVORK5CYII="

  func testUnsupportedSourcesDoNotSpendTheBudgetBeforeAValidImage() {
    var budget = 1
    let entry = NSMenuItem()
    for source in Array(repeating: "", count: 20) + ["https://example.com/icon.png", "http://localhost/icon.png"] {
      MenuFavicon.apply(to: entry, favicon: source, symbol: "globe", budget: &budget)
      XCTAssertTrue(entry.image?.isTemplate == true)
    }
    XCTAssertEqual(budget, 1)
    MenuFavicon.apply(to: entry, favicon: "data:image/png;base64,\(png)", symbol: "globe", budget: &budget)
    XCTAssertEqual(entry.image?.size, NSSize(width: 16, height: 16))
    XCTAssertFalse(entry.image!.isTemplate)
    XCTAssertEqual(budget, 0)
  }

  func testNestedMenusShareTheLimitAndKeepFallbackImages() {
    var budget = 16
    let menu = NSMenu()
    for _ in 0..<2 {
      let group = NSMenuItem()
      group.submenu = NSMenu()
      menu.addItem(group)
      for _ in 0..<10 {
        let entry = NSMenuItem()
        MenuFavicon.apply(to: entry, favicon: "data:image/png;base64,\(png)", symbol: "globe", budget: &budget)
        group.submenu!.addItem(entry)
      }
    }
    let images = menu.items.flatMap { $0.submenu!.items }.compactMap(\.image)
    XCTAssertEqual(images.count, 20)
    XCTAssertTrue(images.prefix(16).allSatisfy { !$0.isTemplate && $0.size == NSSize(width: 16, height: 16) })
    XCTAssertTrue(images.suffix(4).allSatisfy(\.isTemplate))
    XCTAssertEqual(budget, 0)
  }

  func testFileImageAndInvalidLocalImageAssignment() throws {
    let file = FileManager.default.temporaryDirectory.appendingPathComponent("menu-favicon-\(UUID()).png")
    defer { try? FileManager.default.removeItem(at: file) }
    try Data(base64Encoded: png)!.write(to: file)
    var budget = 2
    let entry = NSMenuItem()
    MenuFavicon.apply(to: entry, favicon: file.absoluteString, symbol: "globe", budget: &budget)
    XCTAssertEqual(entry.image?.size, NSSize(width: 16, height: 16))
    XCTAssertFalse(entry.image!.isTemplate)
    MenuFavicon.apply(to: entry, favicon: "data:image/png;base64,broken", symbol: "globe", budget: &budget)
    XCTAssertTrue(entry.image!.isTemplate)
    XCTAssertEqual(budget, 0)
  }
}
