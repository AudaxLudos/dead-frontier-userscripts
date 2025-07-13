// ==UserScript==
// @name        DF - Outpost Quick Links
// @icon        https://www.google.com/s2/favicons?sz=64&domain=deadfrontier.com
// @namespace   https://github.com/AudaxLudos/
// @author      AudaxLudos
// @license     MIT
// @version     1.0.4
// @description Adds buttons for quickly accessing pages
// @match       https://fairview.deadfrontier.com/onlinezombiemmo/*
// @homepageURL https://github.com/AudaxLudos/dead-frontier-userscripts
// @supportURL  https://github.com/AudaxLudos/dead-frontier-userscripts/issues
// @downloadURL https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/outpost-quick-links.user.js
// @updateURL   https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/outpost-quick-links.user.js
// @run-at      document-end
// @require     https://raw.githubusercontent.com/AudaxLudos/dead-frontier-userscripts/refs/heads/main/utils.js
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

    function addQuickLinkButtons() {
        if (unsafeWindow.jQuery == null) {
            return;
        }
        let mainScreenEdge = $("td[background*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/right_edge.jpg']").offset();
        if (!mainScreenEdge) {
            return;
        }
        let flag1 = userVars && userVars["DFSTATS_df_tradezone"] && (userVars["DFSTATS_df_tradezone"] != 21 && userVars["DFSTATS_df_tradezone"] != 22 && userVars["DFSTATS_df_tradezone"] != 10)
        let flag2 = userVars && userVars["df_tradezone"] && (userVars["df_tradezone"] != 21 && userVars["df_tradezone"] != 22 && userVars["df_tradezone"] != 10)
        let isInPersonalOutpost = flag1 || flag2
        let outpostLinks = normalOutpostLinks
        if (isInPersonalOutpost) {
            outpostLinks = personalOutpostLinks
        }
        let quickLinksContainer = getQuickLinksContainer(mainScreenEdge);
        let container = document.createElement("div");
        container.style.width = "120px";
        container.style.display = "grid";
        container.style.rowGap = "5px";
        container.style.padding = "5px";
        container.style.marginBottom = "20px";
        container.style.border = "1px solid #990000";
        container.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        container.style.textAlign = "center";
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
    window.addEventListener("load", event => {
        setTimeout(() => {
            console.log("Audax Scripts: starting outpost quick links userscript");
            addQuickLinkButtons();
        }, 500);
    });
})();
