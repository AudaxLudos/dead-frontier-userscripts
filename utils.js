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