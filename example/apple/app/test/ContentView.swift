//
//  ContentView.swift
//  test
//

import SwiftUI
import brdsdk

struct ContentView: View {
    @State private var status: String = "N/A"

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
                Button("Display Consent") {
                    brd_api.show_consent(
                        nil,
                        benefit: "to provide you with the best experience",
                        agree_btn: "Accept",
                        disagree_btn: "Decline",
                        language: "en"
                    )
                }
                .buttonStyle(.bordered)
                Button("Opt out") {
                    brd_api.optOut(from: .manual)
                }
                .buttonStyle(.bordered)
            }
            .padding()
        }
        .onAppear {
            status = brd_api.currentChoice.rawValue
            brd_api.onChoiceChange = { choice in
                status = choice.rawValue
            }
        }
    }
}

#Preview {
    ContentView()
}
