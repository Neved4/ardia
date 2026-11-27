import ExpoModulesCore

public class ProfilesModule: Module {
  public func definition() -> ModuleDefinition {
    Name(Self.calls.moduleName)
    Events(Self.calls.domain)
    Self.calls.forwardEvents(to: self)

    Self.calls.function
  }

  static let calls = profilesCallTable(
    loaded: { _, reply in reply.ok(["profiles": ArdiaHost.loadedProfiles]) },
    release: { args, reply in
      ArdiaHost.releaseProfile(args.profile)
      reply.ok()
    },
    unloadIdle: { args, reply in reply.ok(ArdiaHost.unloadIdleProfile(args.profile)) },
    deleteData: { args, reply in PageEngines.deleteProfileData(profile: args.profile) { reply.ok(["remaining": $0]) } },
    clearBrowsingData: { args, reply in
      PageEngines.clearBrowsingData(profile: args.profile, types: try args.strings("types"), since: try args.optionalDouble("since") ?? 0) { reply.service(nil, $0) }
    },
    clearContainerStorage: { args, reply in
      WebKitHub.shared.clearContainerData(profile: args.profile, containerId: try args.text("containerId"), sinceMilliseconds: try args.optionalDouble("since") ?? 0) {
        guard $0 else { return reply.fail("ERR_ENGINE", "container storage could not be cleared") }
        reply.ok(["ok": true])
      }
    },
    deleteContainerStorage: { args, reply in
      WebKitHub.shared.deleteContainerData(profile: args.profile, containerId: try args.text("containerId")) {
        guard $0 else { return reply.fail("ERR_ENGINE", "container storage could not be removed") }
        reply.ok(["ok": true])
      }
    }
  )
}
