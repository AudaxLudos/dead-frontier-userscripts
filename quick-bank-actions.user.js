// ==UserScript==
// @name        DF - Quick Bank Actions
// @icon        https://www.google.com/s2/favicons?sz=64&domain=deadfrontier.com
// @namespace   https://github.com/AudaxLudos/
// @author      AudaxLudos
// @license     MIT
// @version     1.0.1
// @description Adds buttons for quickly depositing or withdrawing cash
// @match       https://fairview.deadfrontier.com/onlinezombiemmo/*
// @homepageURL https://github.com/AudaxLudos/dead-frontier-userscripts
// @supportURL  https://github.com/AudaxLudos/dead-frontier-userscripts/issues
// @downloadURL https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/main/quick-bank-actions.user.js
// @updateURL   https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/main/quick-bank-actions.user.js
// @run-at      document-end
// ==/UserScript==

(function () {
    "use strict";

    const origin = window.location.origin;
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const returnPage = urlParams.get('originPage');
    const currentPage = urlParams.get('page') || '';
    const bankActions = [
        { name: "Deposit All", action: "deposit", amount: 9999999999999 },
        { name: "Withdraw 100k", action: "withdraw", amount: 100000 },
        { name: "Withdraw 500k", action: "withdraw", amount: 500000 },
        { name: "Withdraw All", action: "withdraw", amount: 9999999999999 },
    ];

    function addBankActionButtons() {
        // Runs when bank action request is outside inventory
        if (currentPage === '15' && urlParams.has('scripts')) {
            const action = urlParams.get('scripts');
            const amount = urlParams.get('amount');
            makeBankRequest(action, amount, data => {
                unsafeWindow.updateIntoArr(flshToArr(data, ""), pData);
                window.location.replace(`${origin}${path}?page=${returnPage}`);
            });
            return;
        } else if (currentPage === '15' && !urlParams.has('scripts')) {
            // Do not display withdraw quick links
            return;
        }
        if (unsafeWindow.jQuery == null) {
            return;
        }
        let mainScreenEdge = $("td[background*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/right_edge.jpg']").offset();
        if (!mainScreenEdge) {
            return;
        }
        let quickLinksContainer = getQuickLinksContainer(mainScreenEdge);
        let container = document.createElement("div");
        container.style.width = "120px";
        container.style.display = "grid";
        container.style.rowGap = "5px";
        container.style.padding = "5px";
        container.style.border = "1px solid #990000";
        container.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        container.style.marginBottom = "20px";
        for (let i in bankActions) {
            let action = bankActions[i].action;
            let amount = bankActions[i].amount
            let button = document.createElement("button");
            button.setAttribute("data-action", action);
            button.setAttribute("data-amount", amount);
            button.innerHTML = bankActions[i].name;
            container.appendChild(button);

            button.addEventListener("click", event => {
                unsafeWindow.playSound("bank");
                if (unsafeWindow.inventoryHolder == null) {
                    let url = `${origin}${path}?page=15&scripts=${action}`;
                    if (amount) url += `&amount=${amount}`;
                    if (currentPage) url += `&originPage=${currentPage}`;
                    window.location.replace(url);
                    return;
                }
                makeBankRequest(action, amount, data => {
                    unsafeWindow.updateIntoArr(flshToArr(data, ""), data);
                    let cashFields = data.split("&");
                    let newBankCash = cashFields[1].split("=")[1];
                    let newHeldCash = cashFields[2].split("=")[1];
                    userVars["DFSTATS_df_cash"] = newHeldCash;
                    userVars["DFSTATS_df_bankcash"] = newBankCash;
                    unsafeWindow.updateAllFields();
                })
            });
        }

        quickLinksContainer.appendChild(container);
    }

    function makeBankRequest(action, amount, callback) {
        let params = {};
        params[action] = amount;
        params['sc'] = userVars["sc"];
        params['userID'] = userVars["userID"];
        params['password'] = userVars["password"];
        webCall("bank", params, callback);
    }

    function getQuickLinksContainer(mainScreenEdge) {
        let quickLinksContainer = document.getElementById("audaxQuickLinksContainer")
        if (!quickLinksContainer) {
            quickLinksContainer = document.createElement("div");
            quickLinksContainer.id = "audaxQuickLinksContainer";
            quickLinksContainer.style.position = "absolute";
            quickLinksContainer.style.top = `${mainScreenEdge.top}px`;
            quickLinksContainer.style.right = `${mainScreenEdge.left + 50}px`;

            window.addEventListener(
                "resize",
                function () {
                    let mainScreenEdge = $("td[background*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/right_edge.jpg']").offset();
                    quickLinksContainer.style.top = `${mainScreenEdge.top}px`;
                    quickLinksContainer.style.right = `${mainScreenEdge.left + 50}px`;
                },
                true
            );

            document.body.appendChild(quickLinksContainer);
        }
        return quickLinksContainer;
    }

    // Inject script when page fully loads
    window.addEventListener("load", event => {
        setTimeout(() => {
            console.log("Audax Scripts: starting quick bank actions userscript");
            addBankActionButtons();
        }, 500);
    })
})();
