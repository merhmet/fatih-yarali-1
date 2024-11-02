(function (global) {

    function b64DecodeUnicode(str) {
        // Convert base64 to a string
        const binaryString = atob(str);

        // Convert binary string to a byte array
        const byteArray = new Uint8Array(binaryString.length);
        for (var i = 0; i < binaryString.length; i++) {
            byteArray[i] = binaryString.charCodeAt(i);
        }
        // Convert byte array to a string
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(byteArray);
    }

    global.insiteScripts = global.insiteScripts || {};
    global.insiteScripts.popup =
        global.insiteScripts.popup ||
        function message(scriptOptions) {
            const dmSmartScriptDuration = scriptOptions.duration,
                dmSmartScriptSettings = scriptOptions.settings,
                dmSmartScriptRuleId = scriptOptions.ruleId,
                dmSmartScriptRuleType = scriptOptions.ruleType,
                isForced = scriptOptions.isForced;

            //popupName and settings are coming from BE
            const shouldShowPopup = function (popupName, settings) {
                const {
                    shouldCheckUserVisitsCondition,
                    shouldCheckDateTimeRangeCondition,
                } = shouldShowActionRule(settings);

                const cookieName = getSmartRuleCookieName(
                    popupName,
                    ActionType.POPUP
                );

                if (shouldCheckUserVisitsCondition) {
                    return (
                        isForced ||
                        shouldShowRuleObjectForUserVisit(
                            popupName,
                            settings,
                            ActionType.POPUP
                        )
                    );
                }
                if (shouldCheckDateTimeRangeCondition) {
                    return (
                        isForced ||
                        shouldShowRuleObjectForDateTimeRange(
                            popupName,
                            settings,
                            ActionType.POPUP
                        )
                    );
                }
                return isForced || getCookie(cookieName) === null;
            };

            // If insite configured to show a popup then we don't want to show it everytime, once every "popup.insite.cookie.ttl" hours.
            const onOpenPopup = function (popupName, event) {
                if (isForced || window.Parameters?.disableTracking) {
                    return;
                }
                setSmartRuleCookie(popupName, ActionType.POPUP);
            };

            const applyPopUp = () => {
                const settings = JSON.parse(
                    b64DecodeUnicode(dmSmartScriptSettings)
                );
                const popupName = settings.popupName;
                const delay = settings.delay;

                const options = {
                    onOpen: onOpenPopup.bind(null, popupName),
                    additionalAttributes: [
                        {
                            name: 'data-rule',
                            value: dmSmartScriptRuleId,
                        },
                        {
                            name: 'data-rule-type',
                            value: dmSmartScriptRuleType,
                        },
                    ],
                };

                const canShowPopup = shouldShowPopup(popupName, settings);

                if (popupName && canShowPopup) {
                    setTimeout(function () {
                        window?.waitForDeferred?.('dmAjax', () => {
                            $.dmrt.onLoad(
                                $.dmrt.components.popupService.displayPopup.bind(
                                    null,
                                    popupName,
                                    options
                                )
                            );
                            if (window.dmsnowplow) {
                                dmsnowplow(
                                    'trackStructEvent',
                                    'insite',
                                    'impression',
                                    scriptOptions.ruleType,
                                    scriptOptions.ruleId
                                );
                            }
                        });

                    }, (delay + dmSmartScriptDuration) * 1000);
                }
            };

            (function () {
                applyPopUp();
            })();
        };
})(this);
