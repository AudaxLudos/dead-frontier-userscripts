// ==UserScript==
// @name        DF - Account Quick Switcher
// @icon        https://www.google.com/s2/favicons?sz=64&domain=deadfrontier.com
// @namespace   https://github.com/AudaxLudos/
// @author      AudaxLudos
// @license     MIT
// @version     1.0.0
// @description Adds trade prices to item tooltip on hover
// @match       https://fairview.deadfrontier.com/onlinezombiemmo/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @homepageURL https://github.com/AudaxLudos/dead-frontier-userscripts
// @supportURL  https://github.com/AudaxLudos/dead-frontier-userscripts/issues
// @downloadURL https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/account-quick-switcher.user.js
// @updateURL   https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/account-quick-switcher.user.js
// @run-at      document-end
// @require     https://cdn.jsdelivr.net/gh/AudaxLudos/dead-frontier-userscripts@1.0.1/utils.js
// ==/UserScript==

(function () {
    "use strict";

    let lastActiveUserID;
    let accountCookies = {};

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function loadStoredCharacterCookieData() {
        //Load stored cookie data
        accountCookies = JSON.parse(await GM.getValue("characterCookieData", JSON.stringify(accountCookies)));
        //Fix character cookie if loading from previous versions
        for (let userID in accountCookies) {
            if (accountCookies[userID]['userID'] == undefined) {
                accountCookies[userID]['userID'] = userID;
            }
        }
        //Stop here if outside the home page due to the fact that userVars may not be available
        if (!unsafeWindow.userVars) {
            return;
        }
        //Update current character cookie
        let characterName = "";
        if (accountCookies[unsafeWindow.userVars['userID']] != undefined) {
            characterName = accountCookies[unsafeWindow.userVars['userID']].characterName;
        } else {
            characterName = document.getElementById("sidebar").children[2].firstChild.textContent;
        }
        accountCookies[unsafeWindow.userVars['userID']] = {
            "characterName": characterName, "cookie": document.cookie,
            "userID": unsafeWindow.userVars['userID']
        };
        //Save updated cookie data
        GM.setValue("characterCookieData", JSON.stringify(accountCookies));
    }

    function removeCharacterFromCharacterCookieData(userID) {
        if (accountCookies[userID] != undefined) {
            delete accountCookies[userID];
            //Save updated cookie data
            GM.setValue("characterCookieData", JSON.stringify(accountCookies));
        }
    }

    function changeCharacterCookieDataName(userID) {
        if (accountCookies[userID] != undefined) {
            let newCharName = window.prompt("Input the new name for the saved character");
            accountCookies[userID]["characterName"] = newCharName.slice(0, 16);
            //Save updated cookie data
            GM.setValue("characterCookieData", JSON.stringify(accountCookies));
        }
    }

    async function loadLastActiveUserID() {
        lastActiveUserID = await GM.getValue("lastActiveUserID", null);
    }

    function clearCookies() {
        var cookies = document.cookie.split(';');
        //Clear seen ad banners
        for (var i in cookies) {
            var vals = cookies[i].split('=');
            var name = vals.shift(0, 1).trim();
            if (name.includes("_seen_brief")) {
                document.cookie = name + '=; Path=/onlinezombiemmo;Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            }
        }
        //Clear the actual login cookie and the lastuser
        document.cookie = 'DeadFrontierFairview=; Path=/;Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'lastLoginUser=; Path=/onlinezombiemmo;Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }

    function clearAndSetCookies(cookie) {
        clearCookies();
        var cookies = cookie.split(';');
        for (var i in cookies) {
            var vals = cookies[i].split('=');
            var name = vals.shift(0, 1).trim();
            if (name.includes("_seen_brief") || name.includes("lastLoginUser")) {
                //Restore seen ad banners
                document.cookie = name + '=' + vals.join('=') + '; Path=/onlinezombiemmo;max-age=31536000;';
            } else if (name == 'DeadFrontierFairview') {
                //Restore the actual login cookie
                document.cookie = name + '=' + vals.join('=') + '; Path=/;max-age=31536000;';
            }
        }
    }

    function changeCharacter(cookies) {
        clearAndSetCookies(cookies);
        window.open("https://fairview.deadfrontier.com/onlinezombiemmo/index.php", "_self");
    }

    function getRightQuickLinksContainer() {
        if (unsafeWindow.jQuery == null) {
            return;
        }
        let rightScreenEdge = $("td[background*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/right_edge.jpg']");
        rightScreenEdge[0].style.position = "relative";
        rightScreenEdge.closest('table')[0].style.overflow = "visible";
        rightScreenEdge.closest('table').parent().closest('table')[0].style.overflow = "visible";
        rightScreenEdge.closest('table').parent().closest('table').parent().closest('table')[0].style.overflow = "visible";
        let quickLinksContainer = document.getElementById("audaxRightQuickLinksContainer")
        if (!quickLinksContainer) {
            quickLinksContainer = document.createElement("div");
            quickLinksContainer.id = "audaxRightQuickLinksContainer";
            quickLinksContainer.style.position = "absolute";
            quickLinksContainer.style.top = "10px";
            quickLinksContainer.style.left = "48px";

            rightScreenEdge[0].appendChild(quickLinksContainer);
        }
        return quickLinksContainer;
    }

    function initUserData() {
        if (!unsafeWindow.userVars) {
            return;
        }
        lastActiveUserID = unsafeWindow.userVars['userID'];
        GM.setValue("lastActiveUserID", lastActiveUserID);
    }

    //Add character quick switcher button if at home. Credit to Rebekah/Tectonic Stupidity for the UI design.
    function addAccountQuickSwitcherButton() {
        let rightQuickLinksContainer = getRightQuickLinksContainer();
        let container = document.createElement("div");
        container.id = "audaxAccountQuickSwitcher";
        container.style.width = "120px";
        container.style.display = "grid";
        container.style.rowGap = "5px";
        container.style.padding = "5px";
        container.style.marginBottom = "20px";
        container.style.border = "1px solid #990000";
        container.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        container.style.textAlign = "center";

        for (let i in accountCookies) {
            let button = document.createElement("button");
            button.dataset.userId = accountCookies[i]["userID"];
            button.innerHTML = accountCookies[i]["characterName"];

            button.addEventListener("click", async event => {
                let confirmed = await promptYesOrNoAsync(`Switch current account to <span style="color: red;">${accountCookies[i]["characterName"]}</span>?`);
                if (confirmed) {
                    changeCharacter(accountCookies[i]["cookie"]);
                }
                let promptContainer = document.getElementById("audaxPromptContainer");
                promptContainer.style = "";
            });
            container.append(button);
        }

        rightQuickLinksContainer.append(container);
    }

    // Inject script when page fully loads
    window.addEventListener("load", async event => {
        console.log("Audax Scripts: starting account quick switcher userscript")
        await sleep(500);
        initUserData();
        await loadStoredCharacterCookieData();
        addAccountQuickSwitcherButton();
    });
})();
