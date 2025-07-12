// ==UserScript==
// @name        DF - Quick Service Actions
// @icon        https://www.google.com/s2/favicons?sz=64&domain=deadfrontier.com
// @namespace   https://github.com/AudaxLudos/
// @author      AudaxLudos
// @license     MIT
// @version     1.0.0
// @description Adds buttons to quickly use food, armour and health services
// @match       https://fairview.deadfrontier.com/onlinezombiemmo/*
// @homepageURL https://github.com/AudaxLudos/dead-frontier-userscripts
// @supportURL  https://github.com/AudaxLudos/dead-frontier-userscripts/issues
// @downloadURL https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/main/quick-service-actions.user.js
// @updateURL   https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/main/quick-service-actions.user.js
// @run-at      document-end
// @require     https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/main/utils.js
// ==/UserScript==

(function () {
    "use strict";

    const globalData = unsafeWindow.globalData;

    ///////////////////////
    // Utility functions
    ///////////////////////
    function filterServiceResponseText(response) {
        let services = {};
        let responseLength = [...response.matchAll(new RegExp("tradelist_[0-9]+_id_member=", "g"))].length;
        if (response != "") {
            for (let i = 0; i < responseLength; i++) {
                let serviceLevel = parseInt(
                    response
                        .match(new RegExp("tradelist_" + i + "_level=[0-9]+&"))[0]
                        .split("=")[1]
                        .match(/[0-9]+/)[0]
                );
                if (services[serviceLevel] == undefined) {
                    services[serviceLevel] = [];
                }
                let service = {};
                service["userId"] = parseInt(
                    response
                        .match(new RegExp("tradelist_" + i + "_id_member=[0-9]+&"))[0]
                        .split("=")[1]
                        .match(/[0-9]+/)[0]
                );
                service["price"] = parseInt(
                    response
                        .match(new RegExp("tradelist_" + i + "_price=[0-9]+&"))[0]
                        .split("=")[1]
                        .match(/[0-9]+/)[0]
                );
                services[serviceLevel].push(service);
            }
        }
        return services;
    }

    function filterItemTradeResponseText(response) {
        let trades = [];
        let responseLength = [...response.matchAll(new RegExp("tradelist_[0-9]+_id_member=", "g"))].length;
        if (response != "") {
            for (let i = 0; i < responseLength; i++) {
                let trade = {};
                trade["tradeId"] = parseInt(
                    response
                        .match(new RegExp("tradelist_" + i + "_trade_id=[0-9]+&"))[0]
                        .split("=")[1]
                        .match(/[0-9]+/)[0]
                );
                trade["itemId"] = response
                    .match(new RegExp("tradelist_" + i + "_item=[a-zA-Z0-9_ ]+&"))[0]
                    .split("=")[1]
                    .match(/[a-zA-Z0-9_]+/)[0];
                trade["price"] = parseInt(
                    response
                        .match(new RegExp("tradelist_" + i + "_price=[0-9]+&"))[0]
                        .split("=")[1]
                        .match(/[0-9]+/)[0]
                );
                trades.push(trade);
            }
        }
        return trades;
    }

    function resetPromptContent() {
        let gameContent = document.getElementById("gamecontent");
        if (gameContent) {
            gameContent.classList.remove("warning");
        }
    }

    function openLoadingPrompt(message) {
        let prompt = document.getElementById("prompt");
        let gameContent = document.getElementById("gamecontent");

        prompt.style.display = "block";
        gameContent.classList.remove("warning");
        gameContent.innerHTML = `<div style="text-align: center;">${message}</div>`;
    }

    function openPromptWithButton(message, buttonName, buttonCallback) {
        let prompt = document.getElementById("prompt");
        let gameContent = document.getElementById("gamecontent");

        prompt.style.display = "block";
        gameContent.classList.remove("warning");
        gameContent.innerHTML = `<div style="text-align: center;">${message}</div>`;

        let button = document.createElement("button");
        button.textContent = buttonName;
        button.style.position = "absolute";
        button.style.left = "111px";
        button.style.bottom = "8px";
        button.addEventListener("click", buttonCallback);

        gameContent.append(button);
    }

    function openYesOrNoPrompt(message, yesCallback, noCallback) {
        let prompt = document.getElementById("prompt");
        let gameContent = document.getElementById("gamecontent");

        prompt.style.display = "block";
        gameContent.classList.add("warning");
        gameContent.innerHTML = message;

        let yesButton = document.createElement("button");
        yesButton.style.position = "absolute";
        yesButton.style.left = "86px";
        yesButton.style.bottom = "8px";
        yesButton.innerHTML = "Yes";
        yesButton.addEventListener("click", yesCallback);
        gameContent.appendChild(yesButton);

        let noButton = document.createElement("button");
        noButton.style.position = "absolute";
        noButton.style.right = "86px";
        noButton.style.bottom = "8px";
        noButton.innerHTML = "No";
        noButton.addEventListener("click", noCallback);
        gameContent.appendChild(noButton);
    }

    ///////////////////////
    // Main functions
    ///////////////////////
    function addFeedServiceButton() {
        if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=35") == -1) {
            return;
        }
        let hungerElement = document.getElementsByClassName("playerNourishment")[0];
        hungerElement.style.top = "";
        let foodServiceButton = document.getElementById("audaxFoodServiceButton");
        if (foodServiceButton != null) {
            foodServiceButton.remove();
        }
        foodServiceButton = document.createElement("button");
        foodServiceButton.id = "audaxFoodServiceButton";
        foodServiceButton.classList.add("opElem");
        foodServiceButton.style.left = "37px";
        foodServiceButton.style.top = "25px";
        foodServiceButton.innerHTML = "Replenish";
        hungerElement.parentElement.appendChild(foodServiceButton);

        foodServiceButton.addEventListener("click", async event => {
            try {
                let inventorySlotNumber = unsafeWindow.findLastEmptyGenericSlot("inv");
                foodServiceButton.disabled = false;
                openLoadingPrompt("Getting optimal foods and cooking services...");

                if (parseInt(userVars["DFSTATS_df_hungerhp"]) >= 100) {
                    throw "Nourishment is full";
                }
                if (inventorySlotNumber === false) {
                    throw "Inventory is full";
                }

                // get food listings
                let foodListings = await makeMarketSearchRequest("", "", "food", "trades", "buyinglistcategory", filterItemTradeResponseText);
                let eligibleFoodListings = foodListings.filter(value => {
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

                let optimalFoodListings = findCheapestAndOptimalFoodListings(eligibleFoodListings, 100 - parseInt(userVars["DFSTATS_df_hungerhp"]));
                let optimalFood = optimalFoodListings[0];
                let trueItemId = optimalFood["itemId"].split("_")[0];
                let isFoodCooked = optimalFood["itemId"].includes("cooked");
                let itemData = globalData[trueItemId];

                if (optimalFoodListings === undefined || optimalFoodListings.length == 0) {
                    throw `No ${itemData["name"]} trades available`;
                }
                if (userVars["DFSTATS_df_cash"] < optimalFood["price"]) {
                    throw "You do not have enough cash";
                }

                openYesOrNoPrompt(
                    `Buy and use <span style="color: red;">${isFoodCooked ? "Cooked " : " "}${itemData["name"]}</span> for <span style="color: #FFCC00;">$${nf.format(optimalFood["price"])}</span>?`,
                    async event => {
                        try {
                            // buy food
                            await makeInventoryRequest("undefined", optimalFood["tradeId"], "undefined`undefined", optimalFood["price"], "", "", "0", "0", "0", "newbuy");
                            unsafeWindow.playSound("buysell");
                            // consume food
                            await makeInventoryRequest("0", "0", "undefined`undefined", "-1", optimalFood["itemId"], "", inventorySlotNumber, "0", "0", "newconsume");
                            unsafeWindow.playSound("eat");
                            unsafeWindow.updateAllFields();
                            foodServiceButton.disabled = false;
                        } catch (error) {
                            unsafeWindow.updateAllFields();
                            foodServiceButton.disabled = false;
                        }
                    },
                    event => {
                        unsafeWindow.updateAllFields();
                        foodServiceButton.disabled = false;
                        resetPromptContent();
                    }
                );
            } catch (error) {
                openPromptWithButton(error, "Close", event => {
                    unsafeWindow.updateAllFields();
                    foodServiceButton.disabled = false;
                });
            }
        });
    }

    function findCheapestAndOptimalFoodListings(listings, target) {
        let minCost = Infinity;
        let bestCombo = [];

        function backtrack(index, currentRestore, currentCost, selectedListings) {
            if (currentRestore >= target) {
                if (currentCost < minCost) {
                    minCost = currentCost;
                    bestCombo = [...selectedListings];
                }
                return;
            }

            if (index >= listings.length || currentCost >= minCost) return;

            // Option 1: skip current trade
            backtrack(index + 1, currentRestore, currentCost, selectedListings);

            // Option 2: include current trade
            const trade = listings[index];
            const trueItemId = trade["itemId"].split("_")[0];
            const isFoodCooked = trade["itemId"].includes("cooked");
            const itemData = globalData[trueItemId];
            const foodRestoreValue = isFoodCooked ? itemData["foodrestore"] * 3 : itemData["foodrestore"]
            selectedListings.push(trade);
            backtrack(index + 1, currentRestore + foodRestoreValue, currentCost + trade["price"], selectedListings);
            selectedListings.pop(); // backtrack
        }

        backtrack(0, 0, 0, []);
        return bestCombo;
    }

    function addHealServiceButton() {
        if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=35") == -1) {
            return;
        }
        let healthElement = document.getElementsByClassName("playerHealth")[0];
        healthElement.style.top = "";
        let healthServiceButton = document.getElementById("audaxHealthServiceButton");
        if (healthServiceButton != null) {
            healthServiceButton.remove();
        }
        healthServiceButton = document.createElement("button");
        healthServiceButton.id = "audaxHealthServiceButton";
        healthServiceButton.classList.add("opElem");
        healthServiceButton.style.left = "43px";
        healthServiceButton.style.top = "25px";
        healthServiceButton.innerHTML = "Restore";
        healthElement.parentElement.appendChild(healthServiceButton);

        healthServiceButton.addEventListener("click", async event => {
            try {
                let inventorySlotNumber = unsafeWindow.findLastEmptyGenericSlot("inv");
                healthServiceButton.disabled = true;
                openLoadingPrompt("Getting optimal meds and healing services...");

                if (parseInt(userVars["DFSTATS_df_hpcurrent"]) >= parseInt(userVars["DFSTATS_df_hpmax"])) {
                    throw "Health is full";
                }
                if (inventorySlotNumber === false) {
                    throw "Inventory is full";
                }

                let allMedListings = await makeMarketSearchRequest("", "", "medical", "trades", "buyinglistcategory", filterItemTradeResponseText);
                let eligibleMedListings = allMedListings.filter(value => {
                    let trueItemId = value["itemId"].split("_")[0];
                    let itemData = globalData[trueItemId];
                    let itemLevel = itemData["level"];
                    let playerLevel = parseInt(userVars["DFSTATS_df_level"])
                    return itemData
                        // do not include meds that give buffs
                        && !itemData["boostdamagehours"]
                        && !itemData["boostdamagehours_ex"]
                        && !itemData["boostexphours"]
                        && !itemData["boostexphours_ex"]
                        && !itemData["boostspeedhours"]
                        && !itemData["boostspeedhours_ex"]
                        // do not include low tier meds
                        && !((playerLevel > itemLevel && itemLevel < 50) || (playerLevel > 70 && itemLevel === 50))
                        && !((playerLevel > itemLevel + 10 && itemLevel < 40) || (playerLevel > 70 && itemLevel === 40))
                });

                let allDocServices = await makeMarketSearchRequest("", "Doctor", "", "services", "buyinglist", filterServiceResponseText);
                let sampleMedData = globalData[eligibleMedListings[0]["itemId"]];
                let medAdministerLevel = sampleMedData["level"] - 5;
                let docService = allDocServices[medAdministerLevel][0];
                let healthPercent = userVars["DFSTATS_df_hpcurrent"] / userVars["DFSTATS_df_hpmax"];
                let optimalMedListings = findCheapestAndOptimalMeds(eligibleMedListings, 100 - healthPercent * 100, docService["price"]);

                if (optimalMedListings === undefined || optimalMedListings.length == 0) {
                    throw `No med trades available`;
                }

                let optimalMed = optimalMedListings[0];
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

                openYesOrNoPrompt(
                    `Buy <span style="color: red;">${itemData["name"]}</span> for <span style="color: #FFCC00;">$${nf.format(optimalMed["price"])}</span> and ${optimalMed["useDoctor"] ? `administer it for <span style="color: #FFCC00;">$${nf.format(docService["price"])}</span>. Totaling <span style="color: #FFCC00;">$${nf.format(totalCost)}</span>` : "use it"}?`,
                    async (event) => {
                        openLoadingPrompt("Restoring health...");
                        try {
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
                            unsafeWindow.updateAllFields();
                            healthServiceButton.disabled = false;
                        } catch (error) {
                            unsafeWindow.updateAllFields();
                            healthServiceButton.disabled = false;
                        }
                    },
                    (event) => {
                        unsafeWindow.updateAllFields()
                        healthServiceButton.disabled = false;
                    }
                );
            } catch (error) {
                openPromptWithButton(error, "Close", event => {
                    unsafeWindow.updateAllFields();
                    healthServiceButton.disabled = false;
                });
            }
        });
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

    function addRepairServiceButton() {
        if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=35") == -1 || !userVars["DFSTATS_df_armourtype"]) {
            return;
        }
        let armourElement = document.getElementById("sidebarArmour");
        let repairServiceButton = document.getElementById("audaxRepairServiceButton");
        if (repairServiceButton != null) {
            repairServiceButton.remove();
        }
        repairServiceButton = document.createElement("button");
        repairServiceButton.id = "audaxRepairServiceButton";
        repairServiceButton.classList.add("opElem");
        repairServiceButton.style.left = "46px";
        repairServiceButton.style.top = "29px";
        repairServiceButton.textContent = "Repair";
        armourElement.appendChild(repairServiceButton);

        repairServiceButton.addEventListener("click", async event => {
            try {
                repairServiceButton.disabled = false;
                openLoadingPrompt("Getting optimal repairing services...");

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

                openYesOrNoPrompt(
                    `Repair your <span style="color: red;">${userVars["DFSTATS_df_armourname"]}</span> for <span style="color: #FFCC00;">$${nf.format(repairService["price"])}</span>?`,
                    async event => {
                        openLoadingPrompt("Repairing armour...");
                        // repair equipped armor
                        try {
                            await makeInventoryRequest("0", repairService["userId"], "undefined`undefined", repairService["price"], userVars["DFSTATS_df_armourtype"], "", "34", "0", unsafeWindow.getUpgradePrice(), "buyrepair");
                            unsafeWindow.playSound("repair");
                            unsafeWindow.updateAllFields();
                            repairServiceButton.disabled = false;
                        } catch (error) {
                            unsafeWindow.updateAllFields();
                            repairServiceButton.disabled = false;
                        }
                    },
                    event => {
                        unsafeWindow.updateAllFields();
                        repairServiceButton.disabled = false;
                        resetPromptContent();
                    }
                );
            } catch (error) {
                openPromptWithButton(error, "Close", event => {
                    unsafeWindow.updateAllFields();
                    repairServiceButton.disabled = false;
                });
            }
        });
    }

    // Inject script when page fully loads
    window.addEventListener("load", event => {
        setTimeout(() => {
            console.log("Audax Scripts: starting quick bank actions userscript");
            addFeedServiceButton();
            addHealServiceButton();
            addRepairServiceButton();
        }, 500);
    })
})();
