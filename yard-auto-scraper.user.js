// ==UserScript==
// @name        DF - Yard Auto Scraper
// @icon        https://www.google.com/s2/favicons?sz=64&domain=deadfrontier.com
// @namespace   https://github.com/AudaxLudos/
// @author      AudaxLudos
// @license     MIT
// @version     1.0.6
// @description Adds buttons to quickly fill hunger, repair armour and heal health
// @match       https://fairview.deadfrontier.com/onlinezombiemmo/*
// @homepageURL https://github.com/AudaxLudos/dead-frontier-userscripts
// @supportURL  https://github.com/AudaxLudos/dead-frontier-userscripts/issues
// @downloadURL https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/yard-auto-scraper.user.js
// @updateURL   https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/yard-auto-scraper.user.js
// @run-at      document-end
// @require     https://cdn.jsdelivr.net/gh/AudaxLudos/dead-frontier-userscripts@7.0.3/utils.js
// ==/UserScript==

(function () {
    "use strict";

    ///////////////////////
    // Utility functions
    ///////////////////////
    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function getInventorySlotsWithItem() {
        let validItems = [];
        [...unsafeWindow.inventory.getElementsByClassName("validSlot")]
            .filter((node) => node.hasChildNodes() && !node.classList.contains("locked"))
            .forEach((slotWithItem) => {
                let itemElement = slotWithItem.firstChild;
                let id = itemElement.getAttribute("data-type");
                let quantity = itemElement.getAttribute("data-quantity") ? itemElement.getAttribute("data-quantity") : 1;
                let scrapValue = unsafeWindow.scrapValue(id, quantity);
                validItems.push({
                    slot: slotWithItem.getAttribute("data-slot"),
                    id: id,
                    scrapValue: scrapValue,
                });
            });
        return validItems;
    }

    ///////////////////////
    // Main functions
    ///////////////////////
    function addAutoScrapInventoryButton() {
        if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=24") == -1) {
            return;
        }
        let scrapAllButton = document.createElement("button");
        scrapAllButton.id = "customScrapAllButton";
        scrapAllButton.innerHTML = "Scrap Inventory";
        scrapAllButton.classList.add("opElem");
        scrapAllButton.style.top = "418px";
        scrapAllButton.style.left = "410px";
        unsafeWindow.inventoryHolder.appendChild(scrapAllButton);

        scrapAllButton.addEventListener("click", async event => {
            try {
                scrapAllButton.disabled = true;
                let validItems = getInventorySlotsWithItem();
                let totalCost = 0;

                if (!Array.isArray(validItems) || !validItems.length) {
                    throw "No items to scrap found";
                }

                validItems.forEach((value) => (totalCost += value["scrapValue"]));

                let confirmed = await promptYesOrNoAsync(`Are you sure you want to scrap your <span style="color: red;">Inventory</span> for <span style="color: #FFCC00;">$${unsafeWindow.nf.format(totalCost)}</span>?`)
                if (confirmed) {
                    const controller = new AbortController();
                    if (validItems.length > 0) {
                        promptWithButton("Scrapping inventory...", "Cancel", (e) => controller.abort());
                    }

                    for (const [index, value] of validItems.entries()) {
                        await sleep(Math.random() * 60);
                        await makeInventoryRequestV2("0", "0", "", "", value.id, "", value.slot, "", value.scrapValue, "scrap", controller);
                        if (index === validItems.length - 1) {
                            break;
                        }
                    }
                }
                unsafeWindow.updateAllFields();
                scrapAllButton.disabled = false;
            } catch (error) {
                if (error !== "NoErrorPrompt") {
                    promptWithButton(error, "Close", event => {
                        unsafeWindow.updateAllFields();
                        scrapAllButton.disabled = false;
                    });
                }
                unsafeWindow.updateAllFields();
                scrapAllButton.disabled = false;
            }
        });
    }

    function makeInventoryRequestV2(creditsNum, buyNum, renameTo, itemPrice, itemType1, itemType2, slot1, slot2, itemScrapValue, action, controller) {
        return new Promise((resolve, reject) => {
            const onAbort = (e) => {
                reject("NoErrorPrompt");
            };

            if (controller) {
                controller.signal.addEventListener("abort", onAbort, { once: true });
            }

            let params = {};
            params["pagetime"] = userVars["pagetime"];
            params["templateID"] = "0";
            params["sc"] = userVars["sc"];
            params["creditsnum"] = creditsNum;
            params["buynum"] = buyNum;
            params["renameto"] = renameTo;
            params["expected_itemprice"] = itemPrice;
            params["expected_itemtype2"] = itemType2;
            params["expected_itemtype"] = itemType1;
            params["itemnum2"] = slot2;
            params["itemnum"] = slot1;
            params["price"] = itemScrapValue;
            params["action"] = action;
            params["gv"] = "21";
            params["userID"] = userVars["userID"];
            params["password"] = userVars["password"];

            webCall("inventory_new", params, (data) => {
                resolve(true);
                controller.signal.removeEventListener("abort", onAbort);
                unsafeWindow.playSound("shop_buysell");
                unsafeWindow.updateIntoArr(flshToArr(data, "DFSTATS_"), userVars);
                unsafeWindow.populateInventory();
                unsafeWindow.populateCharacterInventory();
                unsafeWindow.renderAvatarUpdate();
                unsafeWindow.updateAllFieldsBase();
            }, true);
        });
    }

    // Inject script when page fully loads
    setTimeout(() => {
        if (window.location.href.indexOf("index.php?page=24") > -1 && unsafeWindow.inventoryHolder != null) {
            console.log("Audax Scripts: starting yard auto scraper userscript");
            addAutoScrapInventoryButton();
        }
    }, 500);
})();
