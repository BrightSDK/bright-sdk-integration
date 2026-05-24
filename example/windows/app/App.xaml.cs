// BrightSDK Windows integration example
// See README.md for setup instructions
using System;
using System.IO;
using System.Windows;
using lum_sdk;

namespace example
{
    public partial class App : Application
    {
        private readonly BrightData.Api _sdk = new BrightData.Api();

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            // Create window first so it subscribes to SDK events before Init.
            // This way returning users' stored consent state is delivered to the UI.
            var window = new MainWindow(_sdk);

            // AppId, AppName, AppLogo: replace with your own values
            // from the BrightData dashboard
            var logoPath = Path.Combine(
                AppDomain.CurrentDomain.BaseDirectory, "icon.png");
            _sdk.Init(new BrightData.Api.Settings
            {
                AppId = "win_myapp.example.com",
                AppName = "Sample App",
                AppLogo = new Uri(logoPath).AbsoluteUri,
            });

            window.Show();
        }

        protected override void OnExit(ExitEventArgs e)
        {
            _sdk.Close();
            base.OnExit(e);
        }
    }
}
