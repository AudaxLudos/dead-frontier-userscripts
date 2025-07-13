// ==UserScript==
// @name        DF - Misc QOL Tweaks
// @icon        https://www.google.com/s2/favicons?sz=64&domain=deadfrontier.com
// @namespace   https://github.com/AudaxLudos/
// @author      AudaxLudos
// @license     MIT
// @version     1.0.0
// @description Adds trade prices to item tooltip on hover
// @match       https://fairview.deadfrontier.com/onlinezombiemmo/*
// @homepageURL https://github.com/AudaxLudos/dead-frontier-userscripts
// @supportURL  https://github.com/AudaxLudos/dead-frontier-userscripts/issues
// @downloadURL https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/misc-qol-tweaks.user.user.js
// @updateURL   https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/misc-qol-tweaks.user.user.js
// @run-at      document-end
// ==/UserScript==

(function () {
    "use strict";

    function injectWithdrawButton(marketRow) {
        let itemPrice = marketRow.dataset.price;
        if (itemPrice <= parseInt(userVars["DFSTATS_df_cash"])) {
            return;
        }
        let buyButton = marketRow.getElementsByTagName("button")[0] || false;
        if (!buyButton) {
            return;
        }
        let withdrawButton = buyButton.cloneNode(true);
        marketRow.replaceChild(withdrawButton, buyButton);
        withdrawButton.innerHTML = "withdraw";
        withdrawButton.style.left = "576px";
        withdrawButton.disabled = true;
        if (parseInt(userVars["DFSTATS_df_bankcash"]) + parseInt(userVars["DFSTATS_df_cash"]) > itemPrice) {
            withdrawButton.disabled = false;
        }
        withdrawButton.addEventListener("click", event => {
            unsafeWindow.promptLoading("Loading, please wait...");
            unsafeWindow.playSound("bank");
            let itemDisplayElement = document.getElementById("itemDisplay");
            let buttons = itemDisplayElement.querySelectorAll("button");
            for (const button of buttons) {
                button.disabled = true;
            }
            let params = {};
            params["withdraw"] = itemPrice;
            params['sc'] = userVars["sc"];
            params['userID'] = userVars["userID"];
            params['password'] = userVars["password"];
            webCall("bank", params, data => {
                let cashFields = data.split("&");
                let newBankCash = cashFields[1].split("=")[1];
                let newHeldCash = cashFields[2].split("=")[1];
                userVars["DFSTATS_df_cash"] = newHeldCash;
                userVars["DFSTATS_df_bankcash"] = newBankCash;
                unsafeWindow.updateAllFields();
                unsafeWindow.search();
            }, true);
        });
    }

    function registerMarketListingsObserver() {
        let target = document.getElementById("itemDisplay");
        let config = { childList: true, subtree: true };

        let marketListObserver = new MutationObserver((mutationList) => {
            if (unsafeWindow.marketScreen == "buy") {
                for (let mutation of mutationList) {
                    if (mutation.addedNodes.length > 0) {
                        if (mutation.addedNodes[0].tagName != "BUTTON" && mutation.target.tagName != "BUTTON") {
                            injectWithdrawButton(mutation.addedNodes[0]);
                        }
                    }
                }
            }
        });

        marketListObserver.observe(target, config);
    }

    // Inject script when page fully loads
    setTimeout(() => {
        if (unsafeWindow.inventoryHolder !== undefined || window.location.href.indexOf("index.php?page=35") > -1) {
            console.log("Audax Scripts: starting misc qol tweaks userscript");
            registerMarketListingsObserver();
        }
    }, 1000);
})();
