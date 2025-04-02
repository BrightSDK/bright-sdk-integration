// IMPORTANT NOTE:
// This file is a helper for integrating Bright SDK with your website.
// It is injected into your application by the Bright SDK Integration tool during the update process.
// It should NOT be modified because your changes will be overwritten during the next SDK update.

(function(){
    var debug = false;
    var verbose = false;
    var status_key = "bright_sdk.status";
    var status = localStorage.getItem(status_key);
    var sleep = function(ms) {
        return new Promise(function(resolve) {
            setTimeout(resolve, ms);
        });
    };
    var print = function() {
        if (debug) {
            console.log.apply(console, arguments);
        }
    };
    var print_err = function() {
        if (verbose) {
            console.error.apply(console, arguments);
        }
    };
    var onceStatusChangeCallbacks = [];
    var tizenServiceName = 'Service';
    var start_tizen_service = function() {
        return new Promise(function(resolve, reject) {
            var PICK = 'http://tizen.org/appcontrol/operation/pick';
            var pkg_id = tizen.application.getCurrentApplication().appInfo.packageId;
            var service_id = pkg_id + '.' + tizenServiceName;
            var app_control_data = new tizen.ApplicationControlData('caller', ['ForegroundApp']);
            var app_control = new tizen.ApplicationControl(PICK, null, null, null, [app_control_data]);
            return window.BrightSDK.getBrightApi().then(function(brd_api) {
                if (brd_api.set_alarm) {
                    brd_api.set_alarm(service_id);
                }
                tizen.application.launchAppControl(app_control, service_id, resolve, reject);
            });
        });
    };
    var inited = false;
    var dialog;
    var simpleOptOut = false;
    window.BrightSDK = {
        init: function(settings) {
            return window.BrightSDK.startService().then(function() {
                debug = settings.debug;
                verbose = settings.debug || settings.verbose;
                simpleOptOut = settings.simple_opt_out;
                tizenServiceName = settings.tizen_service_name || tizenServiceName;
                return new Promise(function(resolve, reject) {
                    BrightSDK.getBrightApi(false).then(function(brd_api) {
                        print('init with settings: %o', settings);
                        var on_status_change = settings.on_status_change;
                        var skip_consent = settings.skip_consent;
                        if (settings.external_consent_options)
                        {
                            window.BrightSDK.createDialog(settings);
                            settings.external_consent_options = undefined;
                            settings.skip_consent = true; // initial display is handled by helper
                            settings.simple_opt_out = undefined; // handled by dialog
                        }
                        settings.on_status_change = function() {
                            try {
                                var status = brd_api.get_status();
                                var value = status
                                    ? status.value
                                        ? status.value.consent : status.consent
                                    : null;
                                window.BrightSDK.onStatusChangeFn(value);
                                for (var i = 0; i < onceStatusChangeCallbacks.length; i++) {
                                    onceStatusChangeCallbacks[i](value);
                                }
                                onceStatusChangeCallbacks = [];
                                if (on_status_change) {
                                    on_status_change(value);
                                }
                            } catch (e) {
                                print_err(e);
                            }
                        };
                        try {
                            brd_api.init(settings, {
                                on_failure: function(message) {
                                    print_err('init failure. Error: ', message);
                                    reject(new Error(message));
                                },
                                on_success: function() {
                                    print('init success');
                                    inited = true;
                                    resolve();
                                    if (!skip_consent && !status)
                                        window.BrightSDK.showConsent();
                                    window.BrightSDK.showNotification(10000);
                                },
                            });
                        } catch (e) {
                            print_err(e);
                            reject();
                        }
                    });
                });
            });
        },
        isInited: function() {
            return inited;
        },
        enable: function(skipConsent) {
            return new Promise(function(resolve, reject) {
                return window.BrightSDK.getBrightApi().then(function(brd_api) {
                    if (skipConsent)
                    {
                        brd_api.external_opt_in({
                            on_failure: function(e) {
                                print_err('external_opt_in failure', e);
                                reject();
                            },
                            on_success: function() {
                                print('external_opt_in success');
                                resolve();
                            },
                        });
                        return;
                    }
                    BrightSDK.onceStatusChange(resolve, 'enableResolve', true);
                    return window.BrightSDK.showConsent().catch(reject);
                });
            });
        },
        disable: function() {
            status = 'disabled';
            return new Promise(function(resolve, reject) {
                BrightSDK.onceStatusChange(resolve, 'disableResolve', true);
                window.BrightSDK.getBrightApi().then(function(brd_api) {
                    brd_api.opt_out({
                        on_failure: function(e) {
                            print_err('opt_out failure', e);
                            status = 'enabled';
                            reject();
                        },
                        on_success: function() {
                            print('opt_out success');
                        },
                    });
                });
            });
        },
        showConsent: function() {
            if (dialog)
                return dialog.show(status);

            if (simpleOptOut)
            {
                // let sdk handle the call, otherwise the status won't be populated
                // emulate keyboard event 53
                var keyboardEvent = new KeyboardEvent('keydown', {
                    bubbles: true,
                    cancelable: true,
                    keyCode: 53,
                    which: 53,
                    key: '5',
                    code: 'Digit5',
                });
                document.dispatchEvent(keyboardEvent);
                return Promise.resolve();
            }

            return new Promise(function(resolve, reject) {
                getBrightApi().then(function(brd_api) {
                    brd_api.show_consent({
                        on_failure: function(message) {
                            print_err('show_consent failure: ', message);
                            reject(message);
                        },
                        on_success: function() {
                            print('show_consent success');
                            resolve();
                        },
                    });
                });
            });
        },
        createDialog: function(settings) {
            if (!window.ConsentModule)
            {
                print_err("ConsentModule not found, have you included it?");
                return;
            }
            if (dialog) // avoid creating multiple dialogs
                return;
            var [targetId, options] = settings.external_consent_options;
            if (simpleOptOut)
                options.Out = true;
            var onShow = options.onShow;
            var onAccept = options.onAccept;
            var onDecline = options.onDecline;
            var onClose = options.onClose;
            var simpleOptOutKeyboardHandler;
            function registerSimpleOptOutKeyboardHandler() {
                if (!options.simpleOptOut)
                    return;
                simpleOptOutKeyboardHandler = function (e) {
                    if (e.keyCode == 53)
                    {
                        e.preventDefault();
                        e.stopPropagation();
                        window.BrightSDK.showConsent();
                    }
                };
                document.addEventListener(
                    'keydown',
                    simpleOptOutKeyboardHandler,
                    {capture: true, once: true}
                );
            }
            options.onAccept = function () {
                window.BrightSDK.enable(true);
                if (onAccept)
                    onAccept();
            };
            options.onDecline = function() {
                window.BrightSDK.disable();
                if (onDecline)
                    onDecline();
            };
            options.onShow = function() {
                window.BrightSDK.reportConsentShown();
                if (onShow)
                    onShow();
            };
            options.onClose = function() {
                registerSimpleOptOutKeyboardHandler();
                if (onClose)
                    onClose();
            };
            dialog = ConsentModule.create(targetId, options);
            registerSimpleOptOutKeyboardHandler();
        },
        onceStatusChange: function(fn, label, append) {
            if (!append) {
                onceStatusChangeCallbacks = [];
            }
            var index = onceStatusChangeCallbacks.length;
            onceStatusChangeCallbacks.push(function(value) {
                print('calling once hook %d: %s', index, label);
                fn(value);
            });
        },
        onStatusChangeFn: function(value) {
            print("BRD status changed ----- ", value);
            if (value == null)
                return;
            status = value ? "enabled" : "disabled";
            localStorage.setItem(status_key, status);
        },
        getStatus: function() {
            return status;
        },
        getStatusObject: function() {
            return window.BrightSDK.getBrightApi().then(function(brd_api) {
                return brd_api.get_status();
            });
        },
        isEnabled: function() {
            return status == 'enabled';
        },
        startService: function() {
            if (window.tizen) {
                print('detected OS: Tizen');
                return start_tizen_service();
            }
            return Promise.resolve();
        },
        showNotification: function(ms) {
            if (dialog)
                dialog.showNotification(ms);
        },
        reportConsentShown: function() {
            return window.BrightSDK.getBrightApi().then(function(brd_api) {
                brd_api.consent_shown();
            });
        },
        getBrightApi: function(requireInit = true, intervalMs = 1000) {
            return Promise.resolve()
            .then(function() {
                if (requireInit && !inited || !window.brd_api) {
                    print_err("BRD API not available, retry in 1 sec...");
                    return sleep(intervalMs).then(window.BrightSDK.getBrightApi);
                }
                return window.brd_api;
            });
        },
    };
})();