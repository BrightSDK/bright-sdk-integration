//
//  ContentView.swift
//  example
//

import SwiftUI
import brdsdk

private func choiceLabel(_ choice: Choice) -> String {
    switch choice {
    case .peer: return "Opt In"
    case .notPeer: return "Opt Out"
    default: return "N/A"
    }
}

struct ContentView: View {
    @State private var status: String = "N/A"
    @State private var isOptedIn: Bool = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 24) {
                Text("Welcome to BrightSDK Sample App")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                Text("BrightSDK status is: \(status)")
                    .foregroundColor(.white)
                #if !os(macOS)
                Text("SDK version: \(brd_api.sdkVersion)")
                    .font(.footnote)
                    .foregroundColor(.gray)
                #endif
                Button("Display Consent") {
                    #if os(macOS)
                    sdk?.show_consent(force: true) { choice in
                        DispatchQueue.main.async { self.updateChoice(choice) }
                    }
                    #else
                    brd_api.show_consent(
                        nil,
                        benefit: "to provide you with the best experience",
                        agree_btn: "Accept",
                        disagree_btn: "Decline",
                        language: "en"
                    )
                    #endif
                }
                .buttonStyle(.borderedProminent)
                Button(isOptedIn ? "Opt out" : "Opt in") {
                    #if os(macOS)
                    if isOptedIn {
                        sdk?.opt_out()
                        if let s = sdk { updateChoice(s.choice) }
                    } else {
                        sdk?.show_consent(force: true) { choice in
                            DispatchQueue.main.async { self.updateChoice(choice) }
                        }
                    }
                    #else
                    if isOptedIn {
                        brd_api.optOut(from: .manual)
                    } else {
                        brd_api.show_consent(
                            nil,
                            benefit: "to provide you with the best experience",
                            agree_btn: "Accept",
                            disagree_btn: "Decline",
                            language: "en"
                        )
                    }
                    #endif
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
        }
        .onAppear {
            #if os(macOS)
            if let s = sdk {
                updateChoice(s.choice)
                if s.choice == .none {
                    s.show_consent { choice in
                        DispatchQueue.main.async { self.updateChoice(choice) }
                    }
                }
            }
            #else
            updateChoice(brd_api.currentChoice)
            brd_api.onChoiceChange = { choice in
                DispatchQueue.main.async { self.updateChoice(choice) }
            }
            #endif
        }
    }

    private func updateChoice(_ choice: Choice) {
        status = choiceLabel(choice)
        isOptedIn = choice == .peer
    }
}
