// ==UserScript==
// @name        DF - Outpost Quick Links
// @icon        https://www.google.com/s2/favicons?sz=64&domain=deadfrontier.com
// @namespace   https://github.com/AudaxLudos/
// @author      AudaxLudos
// @license     MIT
// @version     1.0.9
// @description Adds buttons for quickly accessing pages
// @match       https://fairview.deadfrontier.com/onlinezombiemmo/*
// @homepageURL https://github.com/AudaxLudos/dead-frontier-userscripts
// @supportURL  https://github.com/AudaxLudos/dead-frontier-userscripts/issues
// @downloadURL https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/outpost-quick-links.user.js
// @updateURL   https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/outpost-quick-links.user.js
// @run-at      document-end
// ==/UserScript==

(function () {
    "use strict";

    const normalOutpostLinks = [
        { name: "Marketplace", id: "35" },
        { name: "Yard", id: "24" },
        { name: "Bank", id: "15" },
        { name: "Storage", id: "50" },
        { name: "Crafting", id: "59" },
        { name: "Vendor", id: "84" },
        { name: "Records", id: "22" },
        { name: "Gambling Den", id: "49" },
        { name: "Fast Travel", id: "61" },
    ];
    const personalOutpostLinks = [
        { name: "Trading", id: "35" },
        { name: "Bank", id: "15" },
        { name: "Storage", id: "50" },
        { name: "Crafting", id: "59" },
        { name: "Records", id: "22" },
    ];

    function getLeftQuickLinksContainer() {
        if (unsafeWindow.jQuery == null) {
            return;
        }
        let leftScreenEdge = $("td[background*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/left_edge.jpg']");
        leftScreenEdge[0].style.position = "relative";
        leftScreenEdge.closest('table')[0].style.overflow = "visible";
        leftScreenEdge.closest('table').parent().closest('table')[0].style.overflow = "visible";
        leftScreenEdge.closest('table').parent().closest('table').parent().closest('table')[0].style.overflow = "visible";
        let quickLinksContainer = document.getElementById("audaxQuickLinksContainer")
        if (!quickLinksContainer) {
            quickLinksContainer = document.createElement("div");
            quickLinksContainer.id = "audaxQuickLinksContainer";
            quickLinksContainer.style.position = "absolute";
            quickLinksContainer.style.top = "10px";
            quickLinksContainer.style.right = "48px";

            leftScreenEdge[0].appendChild(quickLinksContainer);
        }
        return quickLinksContainer;
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

    function addRightQuickLinkButtons() {
        let quickLinksContainer = getRightQuickLinksContainer();
        if (!quickLinksContainer) {
            return;
        }
        let container = document.createElement("div");
        container.style.width = "120px";
        container.style.display = "grid";
        container.style.rowGap = "5px";
        container.style.padding = "5px";
        container.style.marginBottom = "20px";
        container.style.border = "1px solid #990000";
        container.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        container.style.textAlign = "center";
        let title = document.createElement("div");
        title.textContent = "Quick Links";
        title.style.textAlign = "center";
        title.style.color = "#ff0000";
        title.style.fontWeight = "bold";
        title.style.fontFamily = "arial";
        title.style.fontSize = "13px";
        container.append(title);

        let button = document.createElement("button");
        button.style.color = "#D0D0D0";
        button.style.textShadow = "0 0 5px red";
        button.style.fontWeight = "bold";
        button.style.letterSpacing = "-1px";
        button.href = `index.php?page=21`
        button.innerHTML = "Inner City";
        button.dataset.page = "21";
        button.dataset.mod = "1";
        button.dataset.sound = "1";
        container.appendChild(button);

        button.addEventListener("mousedown", event => {
            unsafeWindow.nChangePage(event);
        })

        quickLinksContainer.prepend(container);
    }

    function addLeftQuickLinkButtons() {
        let quickLinksContainer = getLeftQuickLinksContainer();
        if (!quickLinksContainer) {
            return;
        }
        let flag1 = userVars && userVars["DFSTATS_df_tradezone"] && (userVars["DFSTATS_df_tradezone"] != 21 && userVars["DFSTATS_df_tradezone"] != 22 && userVars["DFSTATS_df_tradezone"] != 10)
        let flag2 = userVars && userVars["df_tradezone"] && (userVars["df_tradezone"] != 21 && userVars["df_tradezone"] != 22 && userVars["df_tradezone"] != 10)
        let isInPersonalOutpost = flag1 || flag2
        let outpostLinks = normalOutpostLinks
        if (isInPersonalOutpost) {
            outpostLinks = personalOutpostLinks
        }
        let container = document.createElement("div");
        container.style.width = "120px";
        container.style.display = "grid";
        container.style.rowGap = "5px";
        container.style.padding = "5px";
        container.style.marginBottom = "20px";
        container.style.border = "1px solid #990000";
        container.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        container.style.textAlign = "center";
        let title = document.createElement("div");
        title.textContent = "Quick Links";
        title.style.textAlign = "center";
        title.style.color = "#ff0000";
        title.style.fontWeight = "bold";
        title.style.fontFamily = "arial";
        title.style.fontSize = "13px";
        container.append(title);
        for (let i in outpostLinks) {
            let link = document.createElement("a");
            link.style.color = "#D0D0D0";
            link.style.textShadow = "0 0 5px red";
            link.style.fontWeight = "bold";
            link.style.letterSpacing = "-1px";
            link.href = `index.php?page=${outpostLinks[i].id}`
            link.innerHTML = outpostLinks[i].name;
            container.appendChild(link);

            link.addEventListener("mouseenter", event => {
                link.style.filter = "brightness(140%)";
                link.style.textShadow = "0 0 5px white";
            })
            link.addEventListener("mouseout", event => {
                link.style.filter = "";
                link.style.textShadow = "0 0 5px red";
            })
        }

        quickLinksContainer.prepend(container);
    }

    // Inject script when page fully loads
    setTimeout(() => {
        if (window.location.href.indexOf("index.php?page=21") == -1) {
            console.log("Audax Scripts: starting outpost quick links userscript");
            addLeftQuickLinkButtons();
            addRightQuickLinkButtons();
        }
    }, 500);
})();
