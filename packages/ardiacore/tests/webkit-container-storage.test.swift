import AppKit
import Foundation
import WebKit

struct LaunchConfig {
  static let shared = LaunchConfig()
  let dataDirectory: String? = "/tmp/ardia-webkit-container-storage-test"
}

enum ArdiaHost {
  static func isPrivateProfile(_ profile: String) -> Bool { profile.hasPrefix("incognito:") }
  static func baseProfile(of profile: String) -> String { profile.replacingOccurrences(of: "incognito:", with: "") }
}

final class WebKitHub {
  static let shared = WebKitHub()
  let notifications = Notifications()

  final class Notifications {
    func attachWorkers(to store: WKWebsiteDataStore, profile: String) {}
  }
}

final class PageWaiter: NSObject, WKNavigationDelegate {
  var finished = false
  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { finished = true }
}

@main
struct WebKitContainerStorageTest {
  static func wait(_ condition: () -> Bool, file: StaticString = #file, line: UInt = #line) {
    let deadline = Date().addingTimeInterval(15)
    while !condition() && Date() < deadline {
      RunLoop.main.run(mode: .default, before: Date().addingTimeInterval(0.02))
    }
    precondition(condition(), "timed out waiting for WebKit", file: file, line: line)
  }

  static func value(_ webView: WKWebView, script: String) -> Any? {
    var value: Any?
    var done = false
    webView.evaluateJavaScript(script) { result, error in
      precondition(error == nil, "JavaScript failed: \(error?.localizedDescription ?? "unknown error")")
      value = result
      done = true
    }
    wait { done }
    return value
  }

  static func makePage(store: WKWebsiteDataStore, window: NSWindow) -> (WKWebView, PageWaiter) {
    let configuration = WKWebViewConfiguration()
    configuration.websiteDataStore = store
    let webView = WKWebView(frame: window.contentView?.bounds ?? .zero, configuration: configuration)
    let waiter = PageWaiter()
    webView.navigationDelegate = waiter
    window.contentView = webView
    webView.loadHTMLString("<!doctype html><meta charset=utf-8><title>Storage isolation test</title>", baseURL: URL(string: "https://ardia-container-test.example/")!)
    wait { waiter.finished }
    return (webView, waiter)
  }

  static func main() {
    NSApplication.shared.setActivationPolicy(.accessory)
    let stores = WebKitStores()
    let work = stores.dataStore(for: "default", containerId: "container-work")
    let personal = stores.dataStore(for: "default", containerId: "container-personal")
    precondition(work.isPersistent && personal.isPersistent, "regular containers must persist")
    precondition(work.identifier != personal.identifier, "different containers must have different persistent store identifiers")
    precondition(stores.dataStore(for: "default", containerId: "container-work").identifier == work.identifier,
                 "reopening a container must recover its persistent store")
    precondition(stores.dataStore(for: "other-profile", containerId: "container-work").identifier != work.identifier,
                 "the same container in another profile must not share storage")

    let privateWork = stores.dataStore(for: "incognito:window@default", containerId: "container-work")
    let privatePersonal = stores.dataStore(for: "incognito:window@default", containerId: "container-personal")
    precondition(!privateWork.isPersistent && !privatePersonal.isPersistent && privateWork !== privatePersonal,
                 "private containers must be separate and ephemeral")

    let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 420, height: 280), styleMask: [], backing: .buffered, defer: false)
    window.orderOut(nil)

    let (workPage, workWaiter) = makePage(store: work, window: window)
    _ = workWaiter
    _ = value(workPage, script: "localStorage.setItem('owner', 'work'); document.cookie = 'owner=work; path=/; SameSite=Lax'; 'saved'")

    let (personalPage, personalWaiter) = makePage(store: personal, window: window)
    _ = personalWaiter
    let personalData = value(personalPage, script: "JSON.stringify([localStorage.getItem('owner'), document.cookie])") as? String
    precondition(personalData == "[null,\"\"]", "another container must not see the first container's local storage or cookies; got \(personalData ?? "nil")")

    workPage.stopLoading()
    workPage.navigationDelegate = nil
    workPage.removeFromSuperview()
    let restoredStores = WebKitStores()
    let (reopenedWork, reopenedWaiter) = makePage(store: restoredStores.dataStore(for: "default", containerId: "container-work"), window: window)
    _ = reopenedWaiter
    let persistedData = value(reopenedWork, script: "JSON.stringify([localStorage.getItem('owner'), document.cookie])") as? String
    precondition(persistedData == "[\"work\",\"owner=work\"]", "the same container must recover its persisted storage; got \(persistedData ?? "nil")")

    reopenedWork.stopLoading()
    reopenedWork.navigationDelegate = nil
    reopenedWork.removeFromSuperview()
    personalPage.stopLoading()
    personalPage.navigationDelegate = nil
    personalPage.removeFromSuperview()
    window.close()
    print("webkit-container-storage: isolation, persistence, profile scope and private scope passed")
  }
}
