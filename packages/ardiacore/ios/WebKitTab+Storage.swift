import WebKit

extension WebKitTab {
  func takeReusableWebView() -> WebKitWebView? {
    let expected = WebKitHub.shared.stores.dataStore(for: profile, containerId: containerId)
    if let key = transferKey {
      let transfers = WebKitHub.shared.transfers
      let handedOver = transfers.isPrepared(key) ? transfers.liveTab(key).flatMap { $0 === self ? nil : $0.relinquish() } : nil
      let parked = transfers.claimParked(key) as? WebKitWebView
      transfers.noteLive(self, key: key)
      if let candidate = handedOver ?? parked {
        if let parked, parked !== candidate { WebKitHub.close(parked) }
        if candidate.configuration.websiteDataStore === expected { return candidate }
        WebKitHub.close(candidate)
      }
    }
    if let id = adoptId, id.hasPrefix("webkit:"), let offered = WebKitHub.shared.transfers.claimOffered(id) as? WebKitWebView {
      if offered.configuration.websiteDataStore === expected { return offered }
      WebKitHub.close(offered)
    }
    return nil
  }
}
