// Mock Luna service for webOS Simulator.
// Include this script only when running in the simulator.
// Do NOT include in production builds deployed to real TVs.
(function() {
    // Ensure PalmSystem.identifier is set (needed for fetchAppId)
    if (!window.PalmSystem)
        window.PalmSystem = {};
    if (!window.PalmSystem.identifier)
        window.PalmSystem.identifier = 'com.brightsdk.sample.app ';

    // Stateful mock — tracks consent across calls
    var state = {consent: null, ver: '1.0.0', init_cnt: 0};

    function getMockResponse(method, params) {
        switch (method) {
        case 'get_status':
            return {returnValue: true, status: {consent: state.consent,
                ver: state.ver}};
        case 'get_sdk_conf':
            return {returnValue: true, sdk_conf: {}};
        case 'update_consent':
            state.consent = params && params.consent;
            return {returnValue: true};
        case 'inc_init_cnt':
            state.init_cnt++;
            return {returnValue: true, init_cnt: state.init_cnt};
        case 'reset_init_cnt':
            state.init_cnt = 0;
            return {returnValue: true};
        default:
            return {returnValue: true};
        }
    }

    // Replace PalmServiceBridge — this is what webOSTVjs uses internally
    function MockBridge() {
        this.onservicecallback = null;
    }
    MockBridge.prototype.call = function(uri, paramsJson) {
        var method = uri.split('/').pop();
        var params = {};
        try { params = JSON.parse(paramsJson); } catch(e) {}
        var responseStr = JSON.stringify(getMockResponse(method, params));
        var self = this;
        setTimeout(function() {
            if (self.onservicecallback)
                self.onservicecallback(responseStr);
        }, 10);
    };
    MockBridge.prototype.cancel = function() {};
    window.PalmServiceBridge = MockBridge;

    // Also replace webOS.service.request as fallback
    if (window.webOS && window.webOS.service) {
        window.webOS.service.request = function(uri, params) {
            var resp = getMockResponse(params.method, params.parameters);
            setTimeout(function() {
                if (params.onSuccess) params.onSuccess(resp);
                if (params.onComplete) params.onComplete(resp);
            }, 10);
            return {cancel: function(){}};
        };
    }
})();
