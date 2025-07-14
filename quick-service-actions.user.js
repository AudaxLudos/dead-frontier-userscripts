// ==UserScript==
// @name        DF - Quick Service Actions
// @icon        https://www.google.com/s2/favicons?sz=64&domain=deadfrontier.com
// @namespace   https://github.com/AudaxLudos/
// @author      AudaxLudos
// @license     MIT
// @version     1.0.11
// @description Adds buttons to quickly fill hunger, repair armour and heal health
// @match       https://fairview.deadfrontier.com/onlinezombiemmo/*
// @homepageURL https://github.com/AudaxLudos/dead-frontier-userscripts
// @supportURL  https://github.com/AudaxLudos/dead-frontier-userscripts/issues
// @downloadURL https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/quick-service-actions.user.js
// @updateURL   https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/quick-service-actions.user.js
// @run-at      document-end
// @require     https://cdn.jsdelivr.net/gh/AudaxLudos/dead-frontier-userscripts@7.0.1/utils.js
// ==/UserScript==

(function () {
    "use strict";

    const globalData = unsafeWindow.globalData;
    let userVars = unsafeWindow.userVars;

    ///////////////////////
    // Utility functions
    ///////////////////////
    function enableServiceButtons(enable = true) {
        let feedServiceButton = document.getElementById("audaxFeedServiceButton");
        if (feedServiceButton) {
            feedServiceButton.disabled = !enable;
        }
        let healServiceButton = document.getElementById("audaxHealServiceButton");
        if (healServiceButton) {
            healServiceButton.disabled = !enable;
        }
        let repairServiceButton = document.getElementById("audaxRepairServiceButton");
        if (repairServiceButton) {
            repairServiceButton.disabled = !enable;
        }
    }

    function findCheapestAndOptimalFoodTrades(trades, target) {
        let minCost = Infinity;
        let bestCombo = [];

        function backtrack(index, currentRestore, currentCost, selectedTrades) {
            if (currentRestore >= target) {
                if (currentCost < minCost) {
                    minCost = currentCost;
                    bestCombo = [...selectedTrades];
                }
                return;
            }

            if (index >= trades.length || currentCost >= minCost) return;

            // Option 1: skip current trade
            backtrack(index + 1, currentRestore, currentCost, selectedTrades);

            // Option 2: include current trade
            const trade = trades[index];
            const trueItemId = trade["itemId"].split("_")[0];
            const isFoodCooked = trade["itemId"].includes("cooked");
            const itemData = globalData[trueItemId];
            const foodRestoreValue = isFoodCooked ? itemData["foodrestore"] * 3 : itemData["foodrestore"]
            selectedTrades.push(trade);
            backtrack(index + 1, currentRestore + foodRestoreValue, currentCost + trade["price"], selectedTrades);
            selectedTrades.pop();
        }

        backtrack(0, 0, 0, []);
        return bestCombo;
    }

    function findCheapestAndOptimalMeds(meds, healthNeeded, doctorFee) {
        meds = meds.map((med, index) => ({ ...med, uid: index }));

        let bestCost = Infinity;
        let bestCombo = null;

        function backtrack(index, used, healTotal, costTotal, useDoctor) {
            if (healTotal >= healthNeeded) {
                if (costTotal < bestCost) {
                    bestCost = costTotal;
                    bestCombo = [...used];
                }
                return;
            }
            if (index >= meds.length || costTotal >= bestCost) return;

            const med = meds[index];
            const medData = globalData[med["itemId"]];
            const medRawHealthRestore = medData["healthrestore"];

            // Option 1: Self-use
            used.push({
                ...med,
                useDoctor: false
            });
            backtrack(index + 1, used, healTotal + medRawHealthRestore, costTotal + med["price"], useDoctor);
            used.pop();

            // Option 2: Use with doctor if allowed
            if (medData["needdoctor"]) {
                const docFee = useDoctor ? doctorFee : 0;
                used.push({
                    ...med,
                    useDoctor: true
                });
                backtrack(index + 1, used, healTotal + medRawHealthRestore * 3, costTotal + med["price"] + docFee, true);
                used.pop();
            }

            // Option 3: Skip
            backtrack(index + 1, used, healTotal, costTotal, useDoctor);
        }

        backtrack(0, [], 0, 0, false);
        return bestCombo;
    }

    ///////////////////////
    // Main functions
    ///////////////////////
    function addFeedServiceButton() {
        let hungerElement = document.getElementsByClassName("playerNourishment")[0];
        hungerElement.style.top = "";
        let feedServiceButton = document.createElement("button");
        feedServiceButton.id = "audaxFeedServiceButton";
        feedServiceButton.classList.add("opElem");
        feedServiceButton.style.left = "37px";
        feedServiceButton.style.top = "25px";
        feedServiceButton.innerHTML = "Replenish";
        hungerElement.parentElement.appendChild(feedServiceButton);

        feedServiceButton.addEventListener("click", async event => {
            try {
                let inventorySlotNumber = unsafeWindow.findLastEmptyGenericSlot("inv");
                enableServiceButtons(false);
                unsafeWindow.promptLoading("Getting optimal foods and cooking services...");

                if (parseInt(userVars["DFSTATS_df_hungerhp"]) >= 100) {
                    throw "Nourishment is full";
                }
                if (inventorySlotNumber === false) {
                    throw "Inventory is full";
                }

                // get food trades
                let foodTrades = await makeMarketSearchRequest("", "", "food", "trades", "buyinglistcategory", filterItemTradeResponseText);
                let eligibleFoodTrades = foodTrades.filter(value => {
                    let trueItemId = value["itemId"].split("_")[0];
                    let itemData = globalData[trueItemId];
                    let itemLevel = itemData["level"];
                    let playerLevel = parseInt(userVars["DFSTATS_df_level"])
                    return itemData
                        // do not include foods that give buffs
                        && !itemData["boostdamagehours"] && !itemData["boostdamagehours_ex"]
                        && !itemData["boostexphours"] && !itemData["boostexphours_ex"]
                        && !itemData["boostspeedhours"] && !itemData["boostspeedhours_ex"]
                        // do not include low tier foods
                        && !((playerLevel > itemLevel && itemLevel < 50) || (playerLevel > 70 && itemLevel === 50))
                        && !((playerLevel > itemLevel + 10 && itemLevel < 40) || (playerLevel > 70 && itemLevel === 40))
                });

                let optimalFoodTrades = findCheapestAndOptimalFoodTrades(eligibleFoodTrades, 100 - parseInt(userVars["DFSTATS_df_hungerhp"]));
                let optimalFood = optimalFoodTrades[0];
                let trueItemId = optimalFood["itemId"].split("_")[0];
                let isFoodCooked = optimalFood["itemId"].includes("cooked");
                let itemData = globalData[trueItemId];

                if (optimalFoodTrades === undefined || optimalFoodTrades.length == 0) {
                    throw `No ${itemData["name"]} trades available`;
                }
                if (userVars["DFSTATS_df_cash"] < optimalFood["price"]) {
                    throw "You do not have enough cash";
                }

                let confirmed = await promptYesOrNoAsync(`Buy and use <span style="color: red;">${isFoodCooked ? "Cooked " : " "}${itemData["name"]}</span> for <span style="color: #FFCC00;">$${nf.format(optimalFood["price"])}</span>?`);
                if (confirmed) {
                    unsafeWindow.promptLoading("Satiating hunger...");
                    // buy food
                    await makeInventoryRequest("undefined", optimalFood["tradeId"], "undefined`undefined", optimalFood["price"], "", "", "0", "0", "0", "newbuy");
                    unsafeWindow.playSound("buysell");
                    // consume food
                    await makeInventoryRequest("0", "0", "undefined`undefined", "-1", optimalFood["itemId"], "", inventorySlotNumber, "0", "0", "newconsume");
                    unsafeWindow.playSound("eat");
                }

                unsafeWindow.updateAllFields();
                unsafeWindow.promptEnd();
                enableServiceButtons(true);
            } catch (error) {
                promptWithButton(error, "Close", event => {
                    unsafeWindow.updateAllFields();
                    enableServiceButtons(true);
                });
            }
        });
    }

    function addHealServiceButton() {
        let healthElement = document.getElementsByClassName("playerHealth")[0];
        healthElement.style.top = "";
        let healServiceButton = document.createElement("button");
        healServiceButton.id = "audaxHealServiceButton";
        healServiceButton.classList.add("opElem");
        healServiceButton.style.left = "43px";
        healServiceButton.style.top = "25px";
        healServiceButton.innerHTML = "Restore";
        healthElement.parentElement.appendChild(healServiceButton);

        healServiceButton.addEventListener("click", async event => {
            try {
                let inventorySlotNumber = unsafeWindow.findLastEmptyGenericSlot("inv");
                enableServiceButtons(false);
                unsafeWindow.promptLoading("Getting optimal meds and healing services...");

                if (parseInt(userVars["DFSTATS_df_hpcurrent"]) >= parseInt(userVars["DFSTATS_df_hpmax"])) {
                    throw "Health is full";
                }
                if (inventorySlotNumber === false) {
                    throw "Inventory is full";
                }

                let medTrades = await makeMarketSearchRequest("", "", "medical", "trades", "buyinglistcategory", filterItemTradeResponseText);
                let eligibleMedTrades = medTrades.filter(value => {
                    let trueItemId = value["itemId"].split("_")[0];
                    let itemData = globalData[trueItemId];
                    let itemLevel = itemData["level"];
                    let playerLevel = parseInt(userVars["DFSTATS_df_level"])
                    return itemData
                        // do not include meds that give buffs
                        && !itemData["boostdamagehours"] && !itemData["boostdamagehours_ex"]
                        && !itemData["boostexphours"] && !itemData["boostexphours_ex"]
                        && !itemData["boostspeedhours"] && !itemData["boostspeedhours_ex"]
                        // do not include low tier meds
                        && !((playerLevel > itemLevel && itemLevel < 50) || (playerLevel > 70 && itemLevel === 50))
                        && !((playerLevel > itemLevel + 10 && itemLevel < 40) || (playerLevel > 70 && itemLevel === 40))
                });

                let allDocServices = await makeMarketSearchRequest("", "Doctor", "", "services", "buyinglist", filterServiceResponseText);
                let sampleMedData = globalData[eligibleMedTrades[0]["itemId"]];
                let medAdministerLevel = sampleMedData["level"] - 5;
                let docService = allDocServices[medAdministerLevel][0];
                let healthPercent = userVars["DFSTATS_df_hpcurrent"] / userVars["DFSTATS_df_hpmax"];
                let optimalMedTrades = findCheapestAndOptimalMeds(eligibleMedTrades, 100 - healthPercent * 100, docService["price"]);

                if (optimalMedTrades === undefined || optimalMedTrades.length == 0) {
                    throw `No med trades available`;
                }

                let optimalMed = optimalMedTrades[0];
                let itemData = globalData[optimalMed["itemId"]];
                let totalCost = optimalMed["price"];

                if (userVars["DFSTATS_df_cash"] < totalCost) {
                    throw "Not enough cash to buy med";
                }

                if (optimalMed["useDoctor"]) {
                    totalCost += docService["price"];
                    if (allDocServices[medAdministerLevel] == null) {
                        throw `No level ${medAdministerLevel} doctor services available`;
                    }
                    if (userVars["DFSTATS_df_cash"] < totalCost) {
                        throw "Not enough cash to buy and administer med";
                    }
                }

                let confirmed = await promptYesOrNoAsync(`Buy <span style="color: red;">${itemData["name"]}</span> for <span style="color: #FFCC00;">$${nf.format(optimalMed["price"])}</span> and ${optimalMed["useDoctor"] ? `administer it for <span style="color: #FFCC00;">$${nf.format(docService["price"])}</span>. Totaling <span style="color: #FFCC00;">$${nf.format(totalCost)}</span>` : "use it"}?`);
                if (confirmed) {
                    unsafeWindow.promptLoading("Replenishing health...");
                    // buy med
                    await makeInventoryRequest("undefined", optimalMed["tradeId"], "undefined`undefined", `${optimalMed["price"]}`, "", "", "0", "0", "0", "newbuy");
                    if (optimalMed["useDoctor"]) {
                        // administer med
                        await makeInventoryRequest("0", docService["userId"], "undefined`undefined", docService["price"], "", "", inventorySlotNumber, "0", unsafeWindow.getUpgradePrice(), "buyadminister");
                    } else {
                        // use med
                        await makeInventoryRequest("0", "0", "undefined`undefined", "-1", optimalMed["itemId"], "", inventorySlotNumber, "0", "0", "newuse");
                    }
                    unsafeWindow.playSound("heal");
                }

                unsafeWindow.updateAllFields();
                unsafeWindow.promptEnd();
                enableServiceButtons(true);
            } catch (error) {
                promptWithButton(error, "Close", event => {
                    unsafeWindow.updateAllFields();
                    enableServiceButtons(true);
                });
            }
        });
    }

    function addRepairServiceButton() {
        if (!userVars["DFSTATS_df_armourtype"]) {
            return;
        }
        let armourElement = document.getElementById("sidebarArmour");
        let repairServiceButton = document.createElement("button");
        repairServiceButton.id = "audaxRepairServiceButton";
        repairServiceButton.classList.add("opElem");
        repairServiceButton.style.left = "46px";
        repairServiceButton.style.top = "29px";
        repairServiceButton.textContent = "Repair";
        armourElement.appendChild(repairServiceButton);

        repairServiceButton.addEventListener("click", async event => {
            try {
                enableServiceButtons(false);
                unsafeWindow.promptLoading("Getting optimal repairing services...");

                if (parseInt(userVars["DFSTATS_df_armourhp"]) >= parseInt(userVars["DFSTATS_df_armourhpmax"])) {
                    throw "Armour durability is full";
                }

                let armourData = globalData[userVars["DFSTATS_df_armourtype"].split("_")[0]];
                let armourRepairLevel = armourData["shop_level"] - 5;
                let repairServices = await makeMarketSearchRequest("", "Engineer", "", "services", "buyinglist", filterServiceResponseText);

                if (repairServices[armourRepairLevel] == null) {
                    throw `No level ${armourRepairLevel} repair services available`;
                }

                let repairService = repairServices[armourRepairLevel][0];

                if (userVars["DFSTATS_df_cash"] < repairService["price"]) {
                    throw "You do not have enough cash";
                }

                let confirmed = await promptYesOrNoAsync(`Repair your <span style="color: red;">${userVars["DFSTATS_df_armourname"]}</span> for <span style="color: #FFCC00;">$${nf.format(repairService["price"])}</span>?`);
                if (confirmed) {
                    unsafeWindow.promptLoading("Repairing armour...");
                    await makeInventoryRequest("0", repairService["userId"], "undefined`undefined", repairService["price"], userVars["DFSTATS_df_armourtype"], "", "34", "0", unsafeWindow.getUpgradePrice(), "buyrepair");
                    unsafeWindow.playSound("repair");
                }

                unsafeWindow.updateAllFields();
                unsafeWindow.promptEnd();
                enableServiceButtons(true);
            } catch (error) {
                promptWithButton(error, "Close", event => {
                    unsafeWindow.updateAllFields();
                    enableServiceButtons(true);
                });
            }
        });
    }

    // Inject script when page fully loads
    window.addEventListener("load", event => {
        setTimeout(() => {
            if (window.location.href.indexOf("index.php?page=35") > -1) {
                console.log("Audax Scripts: starting quick service actions userscript");
                addFeedServiceButton();
                addHealServiceButton();
                addRepairServiceButton();
            }
        }, 500);
    });
})();
