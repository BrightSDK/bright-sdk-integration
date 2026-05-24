using System.Windows;
using lum_sdk;

namespace example
{
    public partial class MainWindow : Window
    {
        private readonly BrightData.Api _sdk;
        private bool? _consent;

        public MainWindow(BrightData.Api sdk)
        {
            InitializeComponent();
            _sdk = sdk;
            // Subscribe before App calls sdk.Init() so returning users'
            // stored consent state is delivered here.
            _sdk.ConsentChoiceChanged += OnConsentChoiceChanged;
        }

        private void OnConsentChoiceChanged(
            object sender, BrightData.Api.ConsentChoiceChangedEventArgs e)
        {
            // null fires when the consent dialog opens (SDK clears state) —
            // keep current display until the user actually picks.
            if (e.Choice == null) return;
            Dispatcher.Invoke(() =>
            {
                _consent = e.Choice;
                StatusText.Text = e.Choice == true ? "Opt In" : "Opt Out";
                OptOutBtn.Content = e.Choice == true ? "Opt out" : "Opt in";
            });
        }

        private void DisplayConsent_Click(object sender, RoutedEventArgs e)
        {
            _sdk.ShowConsent();
        }

        private void OptToggle_Click(object sender, RoutedEventArgs e)
        {
            if (_consent == true)
                _sdk.OptOut();
            else
                _sdk.ShowConsent();
        }
    }
}
