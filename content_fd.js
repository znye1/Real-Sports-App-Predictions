let observer = null;
let activeTeams = [];
let ufc = false;
let mTabs = [];

// ================== FIND MONEYLINE ==================
function findMoneyline(team, type="Moneyline") {
    return [...document.querySelectorAll(`div[aria-label*="${type}"]`)]
        .filter(div => {
            const label = div.getAttribute("aria-label") || "";
            if (ufc) {
                return label.split(" to win")[0] === team;
            }
            return label.split(", ")[1] === team;
        });
}

// ================== FIND TOTAL ==================
function findTotal(type, total) {
    const spans = document.querySelectorAll("span");

    let ans = "";
    spans.forEach(span => {
        const label = span.textContent || "";
        if (!Number.isNaN(Number(label)) && Number.isFinite(Number(label))) {
            if (Number(label) == total) {
                const totalDiv = span.parentElement?.parentElement?.parentElement?.parentElement.children[1];
                [...totalDiv.children].forEach(div => {
                    const odd = div.getAttribute("aria-label") || "";
                    if (odd.includes(total) && odd.includes(type)) {
                        ans = div.firstChild.textContent || "";
                    }
                });
            }
        }
    });

    if (!ans) {
        const divs = [...document.querySelectorAll(`div[aria-label*="${type}"]`)]
            .filter(div => {
                const label = div.getAttribute("aria-label") || "";
                return label.includes(total);
            });

        const fdDiv = divs[0];
        const fdText = 
            fdDiv?.children[1]?.textContent?.trim() || "";

        return fdText;
    }

    return ans;
}

// ================== FIND SPREAD ==================
function findSpread(team, spread) {
    let positive = false;
    if (spread.startsWith("+")) {
        spread = spread.slice(1);
        positive = true;
    }

    return [...document.querySelectorAll(`div[aria-label*="${spread}"]`)]
        .filter(div => {
            const label = div.getAttribute("aria-label") || "";
            if (label.includes(team) && !label.includes("Total")) {
            }
            if (positive) {
                if (label.split(", ")[0].includes("Puck Line")) {
                    if (label.split(", ")[0] === "Puck Line") {
                        return label.includes(team) && !label.includes("Total") && (label.split(", ")[2] ? !label.split(", ")[2].startsWith("-") : true);
                    }
                    return label.includes(team) && !label.includes("Total") && (label.split(", ")[1] ? !label.split(", ")[1].split(" ")[label.split(", ")[1].split(" ").length - 1].startsWith("-") : true);    
                }
                return label.includes(team) && !label.includes("Total") && (label.split(", ")[0] ? !label.split(", ")[0].split(" ")[label.split(", ")[0].split(" ").length - 1].startsWith("-") : true);
            }
            return label.includes(team) && !label.includes("Total");
        });
}

function findRFI(type) {
    if (type === "YRFI") {
        type = "Over";
    }
    if (type === "NRFI") {
        type = "Under";
    }

    return [...document.querySelectorAll(`div[aria-label*="1st Inning 0.5 Runs, "]`)]
        .filter(div => {
            const label = div.getAttribute("aria-label") || "";
            return label.split(", ")[1].includes(type);
        });
}

function findToAdvance(team) {
    return [...document.querySelectorAll(`div[aria-label*="To Qualify for the Next Round"]`)]
        .filter(div => {
            const label = div.getAttribute("aria-label") || "";
            return label.split(", ")[1] === team;
        });
}

// ================== EXTRACT TEXT ==================
function extractText() {
    if (!activeTeams.length) return ["", ""];

    const result = [];

    for (let i = 0; i < activeTeams.length; i++) {
        const team = activeTeams[i];

        const mTab = mTabs[Math.trunc(i / 2)] || "Game Winner";
        if (mTab === "Game Winner") {
            let divs;
            if (ufc) {
                divs = findMoneyline(team, "to win");
            } else {
                divs = findMoneyline(team);
            }

            const fdDiv = divs[0];
            const fdText =
                fdDiv?.querySelector("span")?.textContent?.trim() || "";
            
            if (!fdText) {
                const divs2 = findToAdvance(team);
                const fdDiv2 = divs2[0];
                const fdText2 = fdDiv2?.querySelector("span")?.textContent?.trim() || "";
                result.push(fdText2 || "");
            } else {
                result.push(fdText || "");
            }
        } else if (mTab === "Total" || "") {
            result.push(findTotal(team[0], team[1]) || "");
        } else if (mTab === "Spread") {
            const divs = findSpread(team[0], team[1]);

            if (!divs) {
                result.push("");
                continue;
            }

            const fdDiv = divs[0];

            if (!fdDiv) {
                result.push("");
                continue;
            }

            if (fdDiv.children[1]) {
                const fdText =
                    fdDiv?.children[1]?.textContent?.trim() || "";
                result.push(fdText || "");
            } else {
                const fdText = fdDiv.firstChild.textContent?.trim() || "";
                result.push(fdText || "");
            }
        } else if (mTab === "Run in 1st inning?") {
            const divs = findRFI(team[0]);
            const fdDiv = divs[0];
            const fdText = fdDiv?.querySelector("span")?.textContent?.trim() || "";
            result.push(fdText || "");
        } else if (mTab === "To Advance") {
            const divs = findToAdvance(team);
            const fdDiv = divs[0];
            const fdText = fdDiv?.querySelector("span")?.textContent?.trim() || "";
            result.push(fdText || "");
        }
    }

    return result;
}

// ================== OBSERVER ==================
function startObserving() {
    if (observer) return;

    let lastSerialized = "";

    const sendUpdate = () => {
        const text = extractText();
        const serialized = JSON.stringify(text);

        if (serialized !== lastSerialized) {
            lastSerialized = serialized;
            chrome.runtime.sendMessage({
                type: "TEXT_UPDATE_FD",
                text
            });
        }
    };

    sendUpdate();

    observer = new MutationObserver(sendUpdate);
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

// ================== MESSAGE LISTENER ==================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "SET_ACTIVE_TEAMS") {
        activeTeams = request.teams || [];
        ufc = request.ufc || false;
        mTabs = request.mTabs || [];
    }

    if (request.type === "START_OBSERVING_FD") {
        startObserving();
    }

    if (request.type === "GET_FD_TEXT") {
        sendResponse({ text: extractText() });
    }

    if (request.type === "GET_FD_ML") {
        const team = request.teamName?.trim();
        if (!team) {
            sendResponse({ text: "" });
            return;
        }

        const mappedTeams = Array.isArray(request.teamNames) && request.teamNames.length
            ? request.teamNames
            : [team];
        for (const fullname of mappedTeams) {
            const odds = findMoneyline(fullname);
            const fdText = odds[0]?.querySelector("span")?.textContent?.trim() || "";
            console.log(fdText, fullname);
            if (fdText) {
                sendResponse({ text: fdText });
                return;
            }
        }

        sendResponse({ text: "" });
    } 

    return true;
});

// ================== CLEANUP ==================
window.addEventListener("beforeunload", () => {
    observer?.disconnect();
    observer = null;
});
