import CryptoKit
import WebKit

final class WebKitStores {
  enum StoreID: Hashable {
    case profile(String)
    case container(profile: String, id: String)
    case privateSession(name: String, token: String, containerId: String?)

    var wireKey: String {
      switch self {
      case .profile(let name): name
      case .container(let profile, let id): "container@\(profile)#\(id)"
      case .privateSession(let name, let token, let containerId):
        "private@\(name)#\(token)\(containerId.map { ":\($0)" } ?? "")"
      }
    }
  }

  typealias SiteKey = WebKitSiteChoices.Key
  typealias ExternalGrant = WebKitSiteChoices.ExternalGrant
  typealias StoreState = WebKitSiteChoices

  private struct PrivateSession {
    let store: WKWebsiteDataStore
    let token: String
  }

  private var persistent: [String: WKWebsiteDataStore] = [:]
  private var containers: [UUID: WKWebsiteDataStore] = [:]
  private var privateSessions: [String: [String: PrivateSession]] = [:]
  private var deletedProfiles: [String: WKWebsiteDataStore] = [:]
  private var heldForTest: [String: WKWebsiteDataStore] = [:]
  private var resumeHosts: [StoreID: WKWebView] = [:]
  private var states: [StoreID: StoreState] = [:]

  static func isPrivate(_ profile: String) -> Bool { ArdiaHost.isPrivateProfile(profile) }

  private func session(_ name: String, containerId: String? = nil) -> PrivateSession {
    let scope = containerId ?? ""
    if let live = privateSessions[name]?[scope] { return live }
    let made = PrivateSession(store: .nonPersistent(), token: UUID().uuidString)
    privateSessions[name, default: [:]][scope] = made
    return made
  }

  func id(of profile: String) -> StoreID {
    guard Self.isPrivate(profile) else { return .profile(profile) }
    let name = ArdiaHost.baseProfile(of: profile)
    return .privateSession(name: name, token: session(name).token, containerId: nil)
  }

  func id(of profile: String, containerId: String?) -> StoreID {
    guard let containerId, !containerId.isEmpty else { return id(of: profile) }
    guard Self.isPrivate(profile) else { return .container(profile: profile, id: containerId) }
    let name = ArdiaHost.baseProfile(of: profile)
    return .privateSession(name: name, token: session(name, containerId: containerId).token, containerId: containerId)
  }

  func isLive(_ id: StoreID) -> Bool {
    switch id {
    case .profile, .container: true
    case .privateSession(let name, let token, let containerId):
      privateSessions[name]?[containerId ?? ""]?.token == token
    }
  }

  static func storeIdentifier(_ profile: String) -> UUID {
    let scope = LaunchConfig.shared.dataDirectory ?? ""
    var bytes = Array(SHA256.hash(data: Data("ardia.webkit|\(scope)|\(profile)".utf8)).prefix(16))
    bytes[6] = (bytes[6] & 0x0F) | 0x50
    bytes[8] = (bytes[8] & 0x3F) | 0x80
    return bytes.withUnsafeBufferPointer { NSUUID(uuidBytes: $0.baseAddress!) as UUID }
  }

  static func containerStoreIdentifier(_ profile: String, _ containerId: String) -> UUID {
    let scope = LaunchConfig.shared.dataDirectory ?? ""
    let input = Data("ardia.webkit.container|\(scope)|\(profile)|\(containerId)".utf8)
    var bytes = Array(SHA256.hash(data: input).prefix(16))
    bytes[6] = (bytes[6] & 0x0F) | 0x50
    bytes[8] = (bytes[8] & 0x3F) | 0x80
    return bytes.withUnsafeBufferPointer { NSUUID(uuidBytes: $0.baseAddress!) as UUID }
  }

  func dataStore(for profile: String, containerId: String? = nil) -> WKWebsiteDataStore {
    if let containerId, !containerId.isEmpty {
      if Self.isPrivate(profile) {
        return session(ArdiaHost.baseProfile(of: profile), containerId: containerId).store
      }
      let identifier = Self.containerStoreIdentifier(profile, containerId)
      if let store = containers[identifier] { return store }
      let store = WKWebsiteDataStore(forIdentifier: identifier)
      containers[identifier] = store
      return store
    }
    if Self.isPrivate(profile) { return session(ArdiaHost.baseProfile(of: profile)).store }
    if let store = persistent[profile] ?? deletedProfiles[profile] { return store }
    let identifier = Self.storeIdentifier(profile)
    let store = WKWebsiteDataStore(forIdentifier: identifier)
    persistent[profile] = store
    UserDefaults.standard.set(true, forKey: Self.storeMadeKey(identifier))
    WebKitHub.shared.notifications.attachWorkers(to: store, profile: profile)
    return store
  }

  func hasStore(for profile: String) -> Bool {
    if Self.isPrivate(profile) { return privateSessions[ArdiaHost.baseProfile(of: profile)] != nil }
    let identifier = Self.storeIdentifier(profile)
    return persistent[profile] != nil || deletedProfiles[profile] != nil || UserDefaults.standard.bool(forKey: Self.storeMadeKey(identifier)) || Self.storeOnDisk(identifier)
  }

  static func storeMadeKey(_ identifier: UUID) -> String { "ardia.webkit.storeMade.\(identifier.uuidString)" }

  static func storeOnDisk(_ identifier: UUID) -> Bool {
    guard let library = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first else { return true }
    let webKit = library.appendingPathComponent("WebKit", isDirectory: true)
    let roots = [Bundle.main.bundleIdentifier.map { webKit.appendingPathComponent($0, isDirectory: true) }, webKit].compactMap { $0 }
    let names = [identifier.uuidString, identifier.uuidString.lowercased()]
    return roots.contains { root in
      names.contains { FileManager.default.fileExists(atPath: root.appendingPathComponent("WebsiteDataStore", isDirectory: true).appendingPathComponent($0).path) }
    }
  }

  func liveDataStore(for profile: String, wireKey: String) -> WKWebsiteDataStore? {
    guard !Self.isPrivate(profile) else { return wireKey == profile ? dataStore(for: profile) : nil }
    let name = ArdiaHost.baseProfile(of: profile)
    guard let live = privateSessions[name]?[""],
      wireKey == StoreID.privateSession(name: name, token: live.token, containerId: nil).wireKey
    else { return nil }
    return live.store
  }

  func state(_ id: StoreID) -> StoreState { states[id] ?? StoreState() }

  func update(_ id: StoreID, _ change: (inout StoreState) -> Void) {
    guard isLive(id) else { return }
    var state = states[id] ?? StoreState()
    change(&state)
    states[id] = state
  }

  func zoom(profile: String, host: String) -> Double { state(id(of: profile)).zoom[host] ?? 1 }

  func setZoom(_ zoom: Double, profile: String, host: String) {
    update(id(of: profile)) { state in
      if zoom == 1 { state.zoom.removeValue(forKey: host) } else { state.zoom[host] = zoom }
    }
  }

  func forgetSitePermissions(of profile: String, since: Date?) {
    update(id(of: profile)) { $0.forgetSiteChoices(since: since) }
  }

  func endPrivateSession(_ name: String) -> [(id: StoreID, store: WKWebsiteDataStore)] {
    guard let ended = privateSessions.removeValue(forKey: name) else { return [] }
    return ended.map { scope, session in
      let containerId = scope.isEmpty ? nil : scope
      let id = StoreID.privateSession(name: name, token: session.token, containerId: containerId)
      states.removeValue(forKey: id)
      return (id, session.store)
    }
  }

  func resumeHost(for profile: String, containerId: String? = nil, configuration: () -> WKWebViewConfiguration) -> WKWebView {
    let id = resumeStoreID(profile, containerId: containerId)
    if let host = resumeHosts[id] { return host }
    let host = WKWebView(frame: .zero, configuration: configuration())
    resumeHosts[id] = host
    return host
  }

  func takeResumeHosts(using store: WKWebsiteDataStore) -> [WKWebView] {
    let using = resumeHosts.filter { $0.value.configuration.websiteDataStore === store }
    for id in using.keys { resumeHosts.removeValue(forKey: id) }
    return Array(using.values)
  }

  func takeResumeHost(of profile: String, containerId: String? = nil) -> WKWebView? {
    resumeHosts.removeValue(forKey: resumeStoreID(profile, containerId: containerId))
  }

  private func resumeStoreID(_ profile: String, containerId: String?) -> StoreID {
    if let containerId, !containerId.isEmpty {
      if Self.isPrivate(profile) {
        let name = ArdiaHost.baseProfile(of: profile)
        return .privateSession(name: name, token: session(name, containerId: containerId).token, containerId: containerId)
      }
      return .container(profile: profile, id: containerId)
    }
    return id(of: profile)
  }

  func forgetProfile(_ profile: String) -> WKWebsiteDataStore? {
    deletedProfiles[profile] = .nonPersistent()
    return persistent.removeValue(forKey: profile)
  }

  func forgetContainer(_ profile: String, containerId: String) -> WKWebsiteDataStore? {
    if Self.isPrivate(profile) {
      let name = ArdiaHost.baseProfile(of: profile)
      let removed = privateSessions[name]?.removeValue(forKey: containerId)
      guard let removed else { return nil }
      states.removeValue(forKey: .privateSession(name: name, token: removed.token, containerId: containerId))
      return removed.store
    }
    return containers.removeValue(forKey: Self.containerStoreIdentifier(profile, containerId))
  }

  func holdForTest(_ profile: String) { heldForTest[profile] = dataStore(for: profile) }
}
