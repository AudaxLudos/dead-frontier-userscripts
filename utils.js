
async function makeRequest(requestUrl, requestParams, controller, callback, callbackParams) {
    let params = unsafeWindow.objectJoin(requestParams);
    let dataHash = unsafeWindow.hash(params);
    const payload = `hash=${dataHash}&${params}`;
    const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: payload,
        signal: controller ? controller.signal : null,
    });
    const response_1 = await response.text();
    if (!response_1) {
        throw "Connection error";
    }
    return callback ? callback(response_1, callbackParams) : true;
}

function makeInventoryRequest(creditsNum, buyNum, renameTo, itemPrice, itemType1, itemType2, slot1, slot2, itemScrapValue, action, controller = null, callback = null) {
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

    if (callback == null) {
        callback = (data) => {
            unsafeWindow.updateIntoArr(flshToArr(data, "DFSTATS_"), userVars);
            unsafeWindow.populateInventory();
            unsafeWindow.populateCharacterInventory();
            unsafeWindow.renderAvatarUpdate();
            unsafeWindow.updateAllFieldsBase();
        }
    }

    return makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/inventory_new.php", params, controller, callback, null);
}

function makeMarketSearchRequest(searchName, profession, category, search, searchType, callback = null) {
    let params = {};
    params["pagetime"] = userVars["pagetime"];
    params["tradezone"] = userVars["DFSTATS_df_tradezone"];
    params["searchname"] = searchName;
    params["memID"] = "";
    params["profession"] = profession;
    params["category"] = category;
    params["search"] = search;
    params["searchtype"] = searchType;

    return makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/trade_search.php", params, null, callback, null);
}

function makeBankRequest(action, amount, callback = null) {
    let params = {};
    params[action] = amount;
    params['sc'] = userVars["sc"];
    params['userID'] = userVars["userID"];
    params['password'] = userVars["password"];

    return makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/bank.php", params, null, callback, null);
}

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

function getPromptElement() {
    if (!unsafeWindow.jQuery) {
        return;
    }
    let prompt = document.getElementById("prompt");
    if (prompt) {
        return prompt;
    }
    let mainWindowElement = $('td[background*="https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/menu_bottom.jpg"]')
        .parent().next().find('table > tbody > tr')[0].children[1];
    mainWindowElement.style.position = "relative";
    let promptContainer = document.createElement("div");
    promptContainer.id = "audaxPromptContainer";
    promptContainer.style.position = "absolute";
    promptContainer.style.top = "0px";
    promptContainer.style.bottom = "0px";
    promptContainer.style.left = "0px";
    promptContainer.style.right = "0px";
    promptContainer.style.zIndex = "100";
    promptContainer.style.fontFamily = '"Courier New", "Arial"';
    promptContainer.style.fontWeight = "600";
    prompt = document.createElement("div");
    prompt.id = "prompt";
    let gameContent = document.createElement("div");
    gameContent.id = "gamecontent";
    unsafeWindow.df_prompt = gameContent;
    prompt.append(gameContent);
    promptContainer.append(prompt);
    mainWindowElement.append(promptContainer);
    return prompt;
}

function promptWithButton(message, buttonName, buttonCallback) {
    let prompt = getPromptElement();
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

function promptYesOrNo(message, yesCallback, noCallback) {
    let prompt = getPromptElement()
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

function promptYesOrNoAsync(message) {
    return new Promise((resolve, reject) => {
        promptYesOrNo(
            message,
            (event) => {
                unsafeWindow.promptEnd();
                resolve(true)
            },
            (event) => {
                unsafeWindow.promptEnd();
                resolve(false)
            }
        );
    });
}

