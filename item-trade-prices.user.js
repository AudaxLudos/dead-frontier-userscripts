// ==UserScript==
// @name        DF - Item Trade Prices
// @icon        https://www.google.com/s2/favicons?sz=64&domain=deadfrontier.com
// @namespace   https://github.com/AudaxLudos/
// @author      AudaxLudos
// @license     MIT
// @version     1.0.10
// @description Adds trade prices to item tooltip on hover
// @match       https://fairview.deadfrontier.com/onlinezombiemmo/*
// @homepageURL https://github.com/AudaxLudos/dead-frontier-userscripts
// @supportURL  https://github.com/AudaxLudos/dead-frontier-userscripts/issues
// @downloadURL https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/item-trade-prices.user.js
// @updateURL   https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/item-trade-prices.user.js
// @run-at      document-end
// @require     https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/utils.js
// ==/UserScript==

(function () {
    "use strict";

    let globalData = unsafeWindow.globalData;
    let userVars = unsafeWindow.userVars;
    let itemsTradeData = {};
    let pendingItemRequests = [];
    let hoveredItem;

    function loadItemsTradeData() {
        const data = localStorage.getItem("audax_itemsTradeData") || JSON.stringify(itemsTradeData);

        try {
            itemsTradeData = JSON.parse(data);
        } catch (error) {
            console.error("Failed to parse items trade data:", error);
            localStorage.setItem("audax_itemsTradeData", JSON.stringify(itemsTradeData));
        }
    }

    function registerItemSlotListener() {
        const slots = document.getElementsByClassName('validSlot');
        for (let i = 0; i < slots.length; i++) {
            slots[i].addEventListener('mouseover', function (event) {
                if (!event.target.classList.contains("item")) {
                    return;
                }
                const itemId = event.target.dataset.type?.split("_")[0] || null;
                if (!itemId) {
                    hoveredItem = null;
                    return;
                }
                hoveredItem = itemId;
            });
        }
    }

    function registerInfoBoxObserver() {
        let target = unsafeWindow.infoBox;
        let config = { childList: true, subtree: true };

        let infoBoxObserver = new MutationObserver((mutationList) => {
            for (let mutation of mutationList) {
                if (mutation.type === 'childList') {
                    let isVanillaMutation = Object.values(mutation.addedNodes).some(node => node.className === "itemName");
                    let scrapPriceDivIndex = Object.values(mutation.addedNodes).findIndex(node => node.className === "itemData" && node.textContent.includes("Scrap Price"));
                    let scrapPriceDiv = Object.values(mutation.addedNodes).at(scrapPriceDivIndex);
                    if (isVanillaMutation && hoveredItem) {
                        getItemTradeData(hoveredItem, scrapPriceDiv);
                        break;
                    }
                }
            }
        });

        infoBoxObserver.observe(target, config);
    }

    function getItemTradeData(itemId, appendTo) {
        let itemData = globalData[itemId];
        if (itemData && itemData["no_transfer"]) {
            return;
        }
        // Only make a new request if 30 seconds has passed
        if (itemId in itemsTradeData && Date.now() < itemsTradeData[itemId]["timestamp"] + 30000) {
            displayTradePrices(hoveredItem, appendTo);
            return;
        }
        if (pendingItemRequests.includes(itemId)) {
            return;
        }

        pendingItemRequests.push(itemId);

        let params = {};
        params["pagetime"] = userVars["pagetime"];
        params["tradezone"] = userVars["DFSTATS_df_tradezone"];
        params["searchname"] = encodeURI(globalData[itemId]["name"].substring(0, 15));
        params["memID"] = "";
        params["searchtype"] = "buyinglistitemname";
        params["profession"] = "";
        params["category"] = "";
        params["search"] = "trades";
        webCall("trade_search", params, function (data) {
            let itemTrades = filterItemTradeResponseText(data);
            itemTrades = itemTrades.filter((value) => value["itemId"].split("_")[0] == itemId);
            itemTrades = itemTrades.slice(0, 5);
            itemsTradeData[itemId] = {};
            itemsTradeData[itemId]["timestamp"] = Date.now();
            itemsTradeData[itemId]["trades"] = itemTrades;
            pendingItemRequests = pendingItemRequests.filter(item => item !== itemId);
            localStorage.setItem("audax_itemsTradeData", JSON.stringify(itemsTradeData));
            displayTradePrices(hoveredItem, appendTo);
        });
    }

    function displayTradePrices(itemId, appendTo) {
        if (!itemsTradeData[itemId]) {
            return;
        }
        let tradeList = itemsTradeData[itemId]["trades"];
        let tradePrices = document.getElementById("audaxTradePrices")
        if (tradePrices) {
            // remove previous if any is found/regenerated
            tradePrices.remove();
        }
        tradePrices = document.createElement("div");
        tradePrices.id = "audaxTradePrices";
        tradePrices.style.color = "#22d2c9";
        tradePrices.classList.add("itemData");
        tradePrices.innerHTML += "Trade Prices:"
        if (tradeList && tradeList.length > 0) {
            tradePrices.innerHTML += "<br>";
            let length = tradeList.length <= 4 ? tradeList.length : 4;
            for (let i = 0; i < length; i++) {
                const tradeData = tradeList[i];
                tradePrices.innerHTML += `&emsp;${formatOrdinalNum(i + 1)}: $${unsafeWindow.nf.format(tradeData["price"])}`;
                if (i < length - 1) {
                    tradePrices.innerHTML += `<br>`;
                }
            }
        } else {
            tradePrices.innerHTML += " Non found";
        }
        document.getElementById("infoBox").style.pointerEvents = "none";
        if (appendTo && appendTo.parentNode) {
            appendTo.parentNode.insertBefore(tradePrices, appendTo.nextSibling);
        } else {
            document.getElementById("infoBox").appendChild(tradePrices);
        }
    }

    function formatOrdinalNum(i) {
        let j = i % 10,
            k = i % 100;
        if (j === 1 && k !== 11) {
            return i + "st";
        }
        if (j === 2 && k !== 12) {
            return i + "nd";
        }
        if (j === 3 && k !== 13) {
            return i + "rd";
        }
        return i + "th";
    }

    // Inject script when page fully loads
    window.addEventListener("load", event => {
        setTimeout(() => {
            if (unsafeWindow.inventoryHolder) {
                console.log("Audax Scripts: starting item trade price display userscript");
                loadItemsTradeData();
                registerItemSlotListener();
                registerInfoBoxObserver();
            }
        }, 500);
    });
})();
