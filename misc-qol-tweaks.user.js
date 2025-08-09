// ==UserScript==
// @name        DF - Misc QOL Tweaks
// @icon        https://www.google.com/s2/favicons?sz=64&domain=deadfrontier.com
// @namespace   https://github.com/AudaxLudos/
// @author      AudaxLudos
// @license     MIT
// @version     1.2.0
// @description Adds trade prices to item tooltip on hover
// @match       https://fairview.deadfrontier.com/onlinezombiemmo/*
// @homepageURL https://github.com/AudaxLudos/dead-frontier-userscripts
// @supportURL  https://github.com/AudaxLudos/dead-frontier-userscripts/issues
// @downloadURL https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/misc-qol-tweaks.user.js
// @updateURL   https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/misc-qol-tweaks.user.js
// @run-at      document-end
// @require     https://cdn.jsdelivr.net/gh/AudaxLudos/dead-frontier-userscripts@7.0.3/utils.js
// ==/UserScript==

(function () {
    "use strict";

    unsafeWindow.tooltipDisplaying = false;

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

        unsafeWindow.vanillaCleanPlacementMessage = unsafeWindow.cleanPlacementMessage;
        unsafeWindow.cleanPlacementMessage = overrideCleanPlacementMessage;

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

    function overrideFakeItemDrag(e) {
        let gameWindow = document.getElementById("gameWindow");
        let oldInventoryHolder = unsafeWindow.inventoryHolder;
        unsafeWindow.inventoryHolder = gameWindow;
        unsafeWindow.drag(e);
        unsafeWindow.inventoryHolder = oldInventoryHolder;
    }

    function overrideDisplayPlacementMessage(msg, x, y, type) {
        let gameWindow = document.getElementById("gameWindow");
        let oldInventoryHolder = unsafeWindow.inventoryHolder;
        unsafeWindow.inventoryHolder = gameWindow;
        unsafeWindow.vanillaDisplayPlacementMessage(msg, x, y, type);
        unsafeWindow.inventoryHolder = oldInventoryHolder;
    }

    function overrideCleanPlacementMessage() {
        if (!unsafeWindow.tooltipDisplaying) {
            unsafeWindow.vanillaCleanPlacementMessage();
        }
    }

    function cleanTooltipIfNeeded() {
        if (unsafeWindow.tooltipDisplaying) {
            unsafeWindow.tooltipDisplaying = false;
            unsafeWindow.cleanPlacementMessage();
        }
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

    function addFillInventoryButton() {
        if (window.location.href.indexOf("index.php?page=31") > -1 || window.location.href.indexOf("index.php?page=50") > -1) {
            return;
        }
        let fillInventoryButton = document.createElement("button");
        fillInventoryButton.classList.add("opElem");
        fillInventoryButton.style.left = "280px";
        fillInventoryButton.style.bottom = "88px";

        let fillInventoryImage = document.createElement("img");
        fillInventoryImage.src = "/onlinezombiemmo/hotrods/hotrods_v9_0_11/HTML5/images/movein.png";
        fillInventoryImage.style.height = "22px";
        fillInventoryButton.appendChild(fillInventoryImage);

        fillInventoryButton.addEventListener("click", async event => {
            try {
                fillInventoryButton.disabled = true;
                promptLoading();
                await makeStorageRequest("fromstorage");
                throw "NoErrorPrompt"
            } catch (error) {
                if (error !== "NoErrorPrompt") {
                    promptWithButton(error, "Close", event => {
                        unsafeWindow.updateAllFields();
                        fillInventoryButton.disabled = false;
                    });
                }
                unsafeWindow.updateAllFields();
                fillInventoryButton.disabled = false;
            }
        });
        fillInventoryButton.addEventListener("mousemove", event => {
            unsafeWindow.tooltipDisplaying = true;
            unsafeWindow.displayPlacementMessage('Transfer items from storage to inventory', fillInventoryButton.getBoundingClientRect().left, fillInventoryButton.getBoundingClientRect().bottom, 'ACTION');
        });
        fillInventoryButton.addEventListener("mouseleave", event => {
            cleanTooltipIfNeeded();
        });

        unsafeWindow.inventoryHolder.appendChild(fillInventoryButton);
    }

    function addStoreInventoryButton() {
        if (window.location.href.indexOf("index.php?page=31") > -1 || window.location.href.indexOf("index.php?page=50") > -1) {
            return;
        }
        let storeInventoryButton = document.createElement("button");
        storeInventoryButton.classList.add("opElem");
        storeInventoryButton.style.right = "280px";
        storeInventoryButton.style.bottom = "88px";

        let storeInventoryImage = document.createElement("img");
        storeInventoryImage.src = "/onlinezombiemmo/hotrods/hotrods_v9_0_11/HTML5/images/moveout.png";
        storeInventoryImage.style.height = "22px";
        storeInventoryButton.appendChild(storeInventoryImage);

        storeInventoryButton.addEventListener("click", async event => {
            try {
                storeInventoryButton.disabled = true;
                promptLoading();
                await makeStorageRequest("tostorage");
                throw "NoErrorPrompt"
            } catch (error) {
                if (error !== "NoErrorPrompt") {
                    promptWithButton(error, "Close", event => {
                        unsafeWindow.updateAllFields();
                        storeInventoryButton.disabled = false;
                    });
                }
                unsafeWindow.updateAllFields();
                storeInventoryButton.disabled = false;
            }
        });
        storeInventoryButton.addEventListener('mousemove', function (evt) {
            unsafeWindow.tooltipDisplaying = true;
            unsafeWindow.displayPlacementMessage('Transfer items from inventory to storage', storeInventoryButton.getBoundingClientRect().left, storeInventoryButton.getBoundingClientRect().bottom, 'ACTION');
        });
        storeInventoryButton.addEventListener('mouseleave', function (evt) {
            cleanTooltipIfNeeded();
        });

        unsafeWindow.inventoryHolder.appendChild(storeInventoryButton);
    }

    function makeStorageRequest(action) {
        return new Promise((resolve, reject) => {
            let params = {};
            params["pagetime"] = userVars["pagetime"];
            params["templateID"] = "0";
            params["sc"] = userVars["sc"];
            params["gv"] = "21";
            params["userID"] = userVars["userID"];
            params["password"] = userVars["password"];
            params["action"] = action;
            params["slotnum"] = (0 * 40) + 1;
            unsafeWindow.playSound("swap");
            webCall("hotrods/inventory_actions", params, (data) => {
                resolve(true);
                unsafeWindow.updateIntoArr(flshToArr(data, "DFSTATS_"), userVars);
                unsafeWindow.populateInventory();
                unsafeWindow.populateCharacterInventory();
                unsafeWindow.renderAvatarUpdate();
                unsafeWindow.updateAllFieldsBase();
            }, true);
        })
    }

    function addBackpackMenu() {
        if (window.location.href.indexOf("index.php?page=50") <= -1 && window.location.href.indexOf("index.php?page=35") <= -1 && window.location.href.indexOf("index.php?page=59") <= -1) {
            return;
        }
        createBackpackMenuItems();
        let backpackMenu = document.getElementById('backpackMenu');

        let openBackpackMenuBtn = document.createElement('button');
        openBackpackMenuBtn.textContent = 'Backpack';
        openBackpackMenuBtn.style = 'padding: 3px 5px !important;';
        openBackpackMenuBtn.dataset.pmoverride = '';
        openBackpackMenuBtn.addEventListener('click', function (e) {
            if (typeof backpackMenu.dataset.opened === 'undefined') {
                backpackMenu.style.top = '50px';
                backpackMenu.dataset.opened = 'open';
            } else {
                backpackMenu.style.top = (openBackpackMenuBtn.offsetHeight - backpackMenu.offsetHeight - 1) + 'px';
                delete backpackMenu.dataset.opened;
            }
        });
        openBackpackMenuBtn.addEventListener('mousemove', function () {
            if (typeof backpackMenu.dataset.opened !== 'undefined') {
                unsafeWindow.displayPlacementMessage('You can move an item over button to close menu', backpackMenu.getBoundingClientRect().left, backpackMenu.getBoundingClientRect().bottom + 12, 'INFO');
            } else {
                unsafeWindow.displayPlacementMessage('You can move an item over button to open menu', backpackMenu.getBoundingClientRect().left, backpackMenu.getBoundingClientRect().bottom + 12, 'INFO');
            }
        });
        backpackMenu.appendChild(openBackpackMenuBtn);

        let inOpenMenu = false;
        inventoryHolder.addEventListener('mousemove', function () {
            if (inOpenMenu) {
                return;
            }
            let insideOfBPBoundingBox = false;
            let backpackMenuBB = openBackpackMenuBtn.getBoundingClientRect();
            if (mousePos[0] > backpackMenuBB.left && mousePos[0] < backpackMenuBB.right && mousePos[1] > backpackMenuBB.top && mousePos[1] < backpackMenuBB.bottom) {
                insideOfBPBoundingBox = true;
            }
            if (active && insideOfBPBoundingBox) {
                inOpenMenu = true;
                setTimeout(() => {
                    if (active && mousePos[0] > backpackMenuBB.left && mousePos[0] < backpackMenuBB.right && mousePos[1] > backpackMenuBB.top && mousePos[1] < backpackMenuBB.bottom) {
                        if (typeof backpackMenu.dataset.opened === 'undefined') {
                            backpackMenu.style.top = '50px';
                            backpackMenu.dataset.opened = 'open';
                        } else {
                            backpackMenu.style.top = (openBackpackMenuBtn.offsetHeight - backpackMenu.offsetHeight - 1) + 'px';
                            delete backpackMenu.dataset.opened;
                        }
                    }
                    setTimeout(() => {
                        inOpenMenu = false;
                    }, 50);
                }, 500);
            }
        });

        backpackMenu.style.border = '1px solid #990000';
        backpackMenu.style.backgroundColor = 'rgba(0,0,0,0.8)';
        backpackMenu.style.top = (openBackpackMenuBtn.offsetHeight - backpackMenu.offsetHeight - 1) + 'px';

        setTimeout(() => {
            backpackMenu.style.transition = 'top 0.2s ease-in-out';
        }, 10);
    }

    function createBackpackMenuItems() {
        let backpackMenu = document.createElement('div');
        backpackMenu.id = 'backpackMenu';
        backpackMenu.style = 'position: absolute; right: 28px; top: 50px; max-width: 132px; z-index: 1;';

        var backpackLabel = document.createElement("div");
        backpackLabel.id = "backpackLabel";
        backpackMenu.appendChild(backpackLabel);

        var backpackWindow = document.createElement("table");
        backpackWindow.id = "backpackdisplay";
        backpackMenu.appendChild(backpackWindow);

        var backpackWithdraw = document.createElement('button');
        backpackWithdraw.id = 'backpackWithdraw';
        backpackWithdraw.textContent = 'Move All to Inventory';
        backpackWithdraw.dataset.pmoverride = '';
        backpackWithdraw.style.display = 'none';
        backpackWithdraw.disabled = true;
        backpackWithdraw.addEventListener('click', function (evt) {
            let iBackpack = new InventoryItem(userVars['DFSTATS_df_backpack']);
            let totalCurrentBackpackSlots = parseInt(globalData[iBackpack.type]['slots']);
            if (typeof iBackpack.stats !== 'undefined') {
                totalCurrentBackpackSlots += parseInt(iBackpack.stats);
            }
            let totalItemsInPack = 0;
            for (var i = 1; i <= totalCurrentBackpackSlots; i++) {
                if (typeof userVars["DFSTATS_df_backpack" + i + "_type"] !== "undefined" && userVars["DFSTATS_df_backpack" + i + "_type"].length > 0) {
                    totalItemsInPack++;
                }
            }

            let freeInventorySlots = 0;
            for (let i = 1; i <= userVars['DFSTATS_df_invslots']; i++) {
                if (typeof userVars['DFSTATS_df_inv' + i + '_type'] === 'undefined' || userVars['DFSTATS_df_inv' + i + '_type'].length === 0) {
                    freeInventorySlots++;
                }
            }

            if (freeInventorySlots >= totalItemsInPack) {
                var dataArr = {};
                dataArr["pagetime"] = userVars["pagetime"];
                dataArr["templateID"] = userVars["template_ID"];
                dataArr["sc"] = userVars["sc"];
                dataArr["creditsnum"] = userVars["DFSTATS_df_credits"];
                dataArr["buynum"] = "0";
                dataArr["renameto"] = "undefined`undefined";
                dataArr["expected_itemprice"] = "-1";
                dataArr["expected_itemtype2"] = '';
                dataArr["expected_itemtype"] = '';
                dataArr["itemnum2"] = '';
                dataArr["itemnum"] = '';
                dataArr["price"] = getUpgradePrice();
                dataArr["gv"] = 21;
                dataArr["userID"] = userVars["userID"];
                dataArr["password"] = userVars["password"];
                unsafeWindow.playSound("swap");
                dataArr["action"] = "empty";
                webCall("hotrods/backpack", dataArr, function (data) {
                    unsafeWindow.updateIntoArr(flshToArr(data, "DFSTATS_"), userVars);
                    unsafeWindow.populateInventory();
                    unsafeWindow.populateBackpack();
                    unsafeWindow.updateAllFields();
                }, true);
            }
        });
        backpackWithdraw.addEventListener('mousemove', function (evt) {
            if (backpackWithdraw.disabled) {
                switch (backpackWithdraw.dataset.pmoverride) {
                    case 'lock':
                        unsafeWindow.displayPlacementMessage('No movable items', backpackWithdraw.getBoundingClientRect().left, backpackWithdraw.getBoundingClientRect().bottom + 12, 'ERROR');
                        break;
                    default:
                        unsafeWindow.displayPlacementMessage('Too many items', backpackWithdraw.getBoundingClientRect().left, backpackWithdraw.getBoundingClientRect().bottom + 12, 'ERROR');
                        break;
                }
            }
        });
        if (typeof userVars['DFSTATS_df_backpack'] === 'undefined' || userVars['DFSTATS_df_backpack'].length === 0) {
            backpackMenu.style.display = 'none';
        }
        backpackMenu.appendChild(backpackWithdraw);

        document.getElementById('invController').appendChild(backpackMenu);

        // Sets up inventory ui
        unsafeWindow.populateBackpack();
        // Populates inventory ui
        unsafeWindow.reloadInventoryData(() => {
            unsafeWindow.populateBackpack();
        })
    }

    // Inject script when page fully loads
    setTimeout(async () => {
        modifyUserInterface();
        if (unsafeWindow.inventoryHolder !== undefined) {
            console.log("Audax Scripts: starting misc qol tweaks userscript");
            expandInventoryToSidebar();
            addFillInventoryButton();
            addStoreInventoryButton();
            addBackpackMenu();
            if (window.location.href.indexOf("index.php?page=35") > -1) {
                registerMarketListingsObserver();
                registerQuickItemSearchListener();
            }
        }
    }, 500);
})();
