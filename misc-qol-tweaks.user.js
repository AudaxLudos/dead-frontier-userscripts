// ==UserScript==
// @name        DF - Misc QOL Tweaks
// @icon        https://www.google.com/s2/favicons?sz=64&domain=deadfrontier.com
// @namespace   https://github.com/AudaxLudos/
// @author      AudaxLudos
// @license     MIT
// @version     1.1.3
// @description Adds trade prices to item tooltip on hover
// @match       https://fairview.deadfrontier.com/onlinezombiemmo/*
// @homepageURL https://github.com/AudaxLudos/dead-frontier-userscripts
// @supportURL  https://github.com/AudaxLudos/dead-frontier-userscripts/issues
// @downloadURL https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/misc-qol-tweaks.user.js
// @updateURL   https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/misc-qol-tweaks.user.js
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

    function expandInventoryToSidebar() {
        function overrideDisplayPlacementMessage(msg, x, y, type) {
            let gameWindow = document.getElementById("gameWindow");
            let oldInventoryHolder = unsafeWindow.inventoryHolder;
            unsafeWindow.inventoryHolder = gameWindow;
            unsafeWindow.vanillaDisplayPlacementMessage(msg, x, y, type);
            unsafeWindow.inventoryHolder = oldInventoryHolder;
        }

        function overrideFakeItemDrag(e) {
            let gameWindow = document.getElementById("gameWindow");
            let oldInventoryHolder = unsafeWindow.inventoryHolder;
            unsafeWindow.inventoryHolder = gameWindow;
            unsafeWindow.drag(e);
            unsafeWindow.inventoryHolder = oldInventoryHolder;
        }

        if (unsafeWindow.inventoryHolder == null) {
            return;
        }

        let tooltip = document.getElementById("textAddon");
        let newParent = tooltip.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode;
        tooltip.style.position = "absolute";
        tooltip.style.fontFamily = "Courier New,Arial";
        tooltip.style.fontWeight = 600;
        tooltip.style.textAlign = "center";
        tooltip.style.zIndex = 20;
        newParent.id = "gameWindow";
        newParent.style.position = "relative";
        newParent.appendChild(tooltip);

        unsafeWindow.vanillaDisplayPlacementMessage = unsafeWindow.displayPlacementMessage;
        unsafeWindow.displayPlacementMessage = overrideDisplayPlacementMessage;

        unsafeWindow.inventoryHolder.removeEventListener("mousemove", unsafeWindow.drag);
        newParent.addEventListener("mousemove", overrideFakeItemDrag);

        let fakeGrabbedItem = document.getElementById("fakeGrabbedItem");
        fakeGrabbedItem.style.position = "absolute";
        fakeGrabbedItem.style.display = "none";
        fakeGrabbedItem.style.width = "40px";
        fakeGrabbedItem.style.height = "40px";
        fakeGrabbedItem.style.opacity = 0.6;
        newParent.appendChild(fakeGrabbedItem);

        let interactionWindow = document.createElement("div");
        interactionWindow.style.position = "absolute";
        interactionWindow.style.width = "85px";
        interactionWindow.style.height = "270px";
        interactionWindow.style.left = "0px";
        interactionWindow.style.top = "80px";
        interactionWindow.style.backgroundImage = "none";
        interactionWindow.dataset.action = "giveToChar";
        interactionWindow.className = "fakeSlot";
        document.getElementById("sidebar").appendChild(interactionWindow);
    }

    function registerQuickItemSearchListener() {
        inventoryHolder.addEventListener("dblclick", (event) => {
            const searchField = document.getElementById("searchField");
            const searchButton = document.getElementById("makeSearch");
            const searchCategory = document.getElementById("categoryChoice");

            if (searchField == null || searchButton == null || searchCategory == null) {
                return;
            }

            if (event.target.classList.contains("item")) {
                document.getElementById("cat").innerHTML = "Everything";
                searchCategory.setAttribute("data-catname", "");
                searchCategory.setAttribute("data-cattype", "");
                searchField.value = "";
                let itemName = globalData[event.target.getAttribute("data-type").replace(/_.*/, "")].name;
                searchField.value = itemName;
                searchButton.disabled = false;
                searchButton.click();
            }
        });
    }

    function modifyUserInterface() {
        if (unsafeWindow.jQuery == null) {
            return;
        }
        // Runs only when in inner city page
        if (window.location.href.indexOf("index.php?page=21") > -1) {
            // Hide flash/unity web player custom browser link
            $("body > table:nth-child(1)").hide();
            // Modify back to outpost button
            if ($("form[action*='hotrods/hotfunctions.php']").parent()[0] != null) {
                let mainElem = $("form[action*='hotrods/hotfunctions.php']").parent();
                mainElem.removeAttr('style');
                mainElem[0].style.textAlign = "center";
                $(mainElem[0]).prependTo(mainElem.parent()[0]);
            }
            // Hide open chat button
            $("a[href='https://discordapp.com/invite/deadfrontier2']").parent().hide();
            // Hide main footer
            $("body > table:nth-child(2) > tbody > tr > td > table").hide();
            return;
        }
        // Fit everything to current window
        if ($("td[background*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/header.jpg']") != null) {
            $("td[background*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/header.jpg']").css("background-position", "0px -160px");
            $("td[background*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/header.jpg']").parent().height(68);
            $("td[style*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/right_margin.jpg']").css("background-position", "left -160px");
            $("td[style*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/left_margin.jpg']").css("background-position", "right -160px");
        }
        // Hide facebook like button
        $("iframe[src*='https://www.facebook.com/plugins/like.php?href=https://www.facebook.com/OfficialDeadFrontier/&width&layout=button_count&action=like&show_faces=false&share=true&height=35&appId=']").hide();
        // Hide social links
        $("body > table:nth-child(2)").hide();
        // Hide main footer
        $("body > table:nth-child(3)").hide();
    }

    // Inject script when page fully loads
    setTimeout(() => {
        modifyUserInterface();
        if (unsafeWindow.inventoryHolder !== undefined) {
            console.log("Audax Scripts: starting misc qol tweaks userscript");
            expandInventoryToSidebar();
            if (window.location.href.indexOf("index.php?page=35") > -1) {
                registerMarketListingsObserver();
                registerQuickItemSearchListener();
            }
        }
    }, 1000);
})();
