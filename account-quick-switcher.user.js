// ==UserScript==
// @name        DF - Account Quick Switcher
// @icon        https://www.google.com/s2/favicons?sz=64&domain=deadfrontier.com
// @namespace   https://github.com/AudaxLudos/
// @author      AudaxLudos
// @license     MIT
// @version     1.0.11
// @description Adds trade prices to item tooltip on hover
// @match       https://fairview.deadfrontier.com/onlinezombiemmo/*
// @grant       GM.getValue
// @grant       GM.setValue
// @grant       GM_xmlhttpRequest
// @grant       GM_openInTab
// @homepageURL https://github.com/AudaxLudos/dead-frontier-userscripts
// @supportURL  https://github.com/AudaxLudos/dead-frontier-userscripts/issues
// @downloadURL https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/account-quick-switcher.user.js
// @updateURL   https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/account-quick-switcher.user.js
// @run-at      document-end
// @require     https://cdn.jsdelivr.net/gh/AudaxLudos/dead-frontier-userscripts@7.0.3/utils.js
// ==/UserScript==

(function () {
    "use strict";

    let lastActiveUserID;
    let accountCookies = {};

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function initUserData() {
        if (!unsafeWindow.userVars) {
            return;
        }
        lastActiveUserID = unsafeWindow.userVars['userID'];
        GM.setValue("lastActiveUserID", lastActiveUserID);
    }

    async function loadStoredCharacterCookieData() {
        //Load stored cookie data
        accountCookies = JSON.parse(await GM.getValue("accountCookies", JSON.stringify(accountCookies)));
        //Fix character cookie if loading from previous versions
        for (let userID in accountCookies) {
            if (accountCookies[userID]['userID'] == undefined) {
                accountCookies[userID]['userID'] = userID;
            }
        }
        console.log(accountCookies);
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
            "characterName": characterName,
            "cookie": document.cookie,
            "userID": unsafeWindow.userVars['userID']
        };
        console.log(accountCookies);
        //Save updated cookie data
        GM.setValue("accountCookies", JSON.stringify(accountCookies));
    }

    async function loadLastActiveUserID() {
        lastActiveUserID = await GM.getValue("lastActiveUserID", null);
    }

    function removeAccountCookie(userID) {
        if (accountCookies[userID] != undefined) {
            delete accountCookies[userID];
            //Save updated cookie data
            GM.setValue("accountCookies", JSON.stringify(accountCookies));
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
        //Clear the actual login cookie and the last user
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

    promptYesOrNoAsync = function (message) {
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
            let promptContainer = document.getElementById("audaxPromptContainer");
            if (promptContainer) {
                promptContainer.style.visibility = "visible";
            }
        });
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
        let title = document.createElement("div");
        title.textContent = "Account Switcher";
        title.style.textAlign = "center";
        title.style.color = "#ff0000";
        title.style.fontWeight = "bold";
        title.style.fontFamily = "arial";
        title.style.fontSize = "13px";
        container.append(title);
        for (let userId in accountCookies) {
            let buttonContainer = document.createElement("div");
            buttonContainer.style.display = "flex";
            buttonContainer.style.justifyContent = "space-between";
            buttonContainer.style.flexFlow = "row nowrap";
            buttonContainer.style.overflow = "auto";

            let accountButton = document.createElement("button");
            accountButton.style.width = "70%";
            accountButton.style.textAlign = "center";
            accountButton.style.overflow = "hidden"
            accountButton.style.whiteSpace = "nowrap";
            accountButton.style.textOverflow = "ellipsis";
            accountButton.dataset.userId = accountCookies[userId]["userID"];
            accountButton.innerHTML = accountCookies[userId]["characterName"];

            let removeButton = document.createElement("button");
            removeButton.style.width = "30%";
            removeButton.innerHTML = "x"

            if (lastActiveUserID && userId === lastActiveUserID) {
                accountButton.disabled = true;
            }

            accountButton.addEventListener("click", async event => {
                const buttons = container.querySelectorAll("button");
                for (const element of buttons) {
                    element.disabled = true;
                }
                let confirmed = await promptYesOrNoAsync(`Switch current account to <span style="color: red;">${accountCookies[userId]["characterName"]}</span>?`);
                if (confirmed) {
                    changeCharacter(accountCookies[userId]["cookie"]);
                }
                let promptContainer = document.getElementById("audaxPromptContainer");
                if (promptContainer) {
                    promptContainer.style.visibility = "hidden";
                }
                for (const element of buttons) {
                    if (element.dataset.userId === userId || element.dataset.userId === undefined) {
                        element.disabled = false;
                    }
                }
            });

            removeButton.addEventListener("click", async event => {
                const buttons = container.querySelectorAll("button");
                for (const element of buttons) {
                    element.disabled = true;
                }
                let confirmed = await promptYesOrNoAsync(`Remove <span style="color: red;">${accountCookies[userId]["characterName"]}</span> account?`);
                if (confirmed) {
                    removeAccountCookie(userId);
                    document.getElementById("audaxAccountQuickSwitcher").remove();
                    addAccountQuickSwitcherButton();
                }
                let promptContainer = document.getElementById("audaxPromptContainer");
                if (promptContainer) {
                    promptContainer.style.visibility = "hidden";
                }
                for (const element of buttons) {
                    element.disabled = false;
                }
            });

            buttonContainer.append(accountButton);
            buttonContainer.append(removeButton);
            container.append(buttonContainer);
        }

        rightQuickLinksContainer.append(container);
    }

    // Inject script when page fully loads
    setTimeout(async () => {
        if (window.location.href.indexOf("index.php?page=21") == -1) {
            console.log("Audax Scripts: starting account quick switcher userscript")
            initUserData();
            await loadStoredCharacterCookieData();
            await loadLastActiveUserID();
            addAccountQuickSwitcherButton();
        }
    }, 500);
})();
