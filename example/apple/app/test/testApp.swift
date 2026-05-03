//
//  testApp.swift
//  test
//

import SwiftUI
import brdsdk

@main
struct testApp: App {
    init() {
        try! brd_api(
            skip_consent: false,
            app_name: "Sample App",
            benefit: "to provide you with the best experience"
        )
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
