//
//  exampleApp.swift
//  example
//

import SwiftUI
import brdsdk

#if os(macOS)
let sdk: brd_api? = {
    do {
        return try brd_api(app_name: "example")
    } catch {
        print("SDK init error: \(error.localizedDescription)")
        return nil
    }
}()
#endif

@main
struct exampleApp: App {
    init() {
        #if !os(macOS)
        do {
            try brd_api(
                benefit: "to provide you with the best experience",
                skip_consent: false
            )
        } catch {
            print("SDK init error: \(error.localizedDescription)")
        }
        #endif
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
