// IMPORTANT NOTE:
// This file is a helper for integrating Bright SDK with your website.
// It is injected into your application by the Bright SDK Integration tool during the update process.
// It should NOT be modified because your changes will be overwritten during the next SDK update.

(function(){
    var debug = false;
    var verbose = false;
    var status_key = "bright_sdk.status";
    var status;
    var print = function(...args){
        if (debug)
            console.log(...args);
    };
    var print_err = function(...args){
        if (verbose)
            console.error(...args);
    };
    window.BrightSDK = {
        init: function(settings){
            debug = settings.debug;
            verbose = settings.debug || settings.verbose;
            print('init with settings: %o', settings);
            var on_status_change = settings.on_status_change;
            status = localStorage.getItem(status_key);
            settings.on_status_change = function(){
                try {
                    var status = brd_api.get_status();
                    var value = status && status.consent;
                    window.BrightSDK.onStatusChangeFn(value);
                    window.BrightSDK.onceStatusChangeFn(value);
                    if (on_status_change)
                        on_status_change();
                } catch(e){ print_err(e); }
            };    
            try {
                brd_api.init(settings, {
                    on_failure: function(message){
                        print_err('init failure. Error: ', message);
                    },
                    on_success: function(){
                        print('init success');
                    },
                });
            } catch(e){
                print_err(e);
            }
        },
        enable: function(){
            window.BrightSDK.showConsent();
        },
        disable: function(){
            brd_api.opt_out({
                on_failure: function(){ print_err('opt_out failure'); },
                on_success: function(){ print('opt_out success'); },
            });
        },     
        showConsent: function(){
            if (!brd_api.show_consent)
            {
                print_err("show_consent not available, retry in 1 sec...");
                return setTimeout(window.BrightSDK.showConsent, 1000);
            }
            brd_api.show_consent({
                on_failure: function(){ print_err('show_consent failure'); },
                on_success: function(){ print('show_consent success'); },
            });
        },
        onceStatusChange: function(fn){
            window.BrightSDK.onceStatusChangeFn = function(value){
                window.BrightSDK.onceStatusChangeFn = ()=>{};
                fn(value);
            };
        },
        onStatusChangeFn: function(value){
            print("BRD status changed ----- ", value);
            status = value ? "enabled" : "disabled";
            localStorage.setItem(status_key, status);
        },
        onceStatusChangeFn: function(){},
        getStatus: function(){ return status; },
        isEnabled: function(){ return status == 'enabled'; },
    };
})();