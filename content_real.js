let observer = null;

// Extract text from all containers with .r-adyw6z
function extractText() {
    const tabs = document.querySelectorAll("div.r-rjixqe");
    let markets = false;
    let marketColor;
    const colorDict = {};

    tabs.forEach (tab => {
        const tabText = tab.innerText.trim();
        if (tabText === "Markets") {
            if (tab.style.color) {
                marketColor = tab.style.color;
                if (colorDict[marketColor]) {
                    colorDict[marketColor] += 1;
                } else {
                    colorDict[marketColor] = 1
                }
            }
        }
        if (tabText === "Feed" || tabText === "Game") {
            if (tab.style.color) {
                const curColor = tab.style.color;
                if (colorDict[curColor]) {
                    colorDict[curColor] += 1;
                } else {
                    colorDict[curColor] = 1
                }
            }
        }
    })

    if (colorDict[marketColor] === 1) {
        markets = true;
    }

    const ufcTabs = document.querySelectorAll("div.r-633pao");
    let ufc = false;
    ufcTabs.forEach (tab => {
        const tabText = tab.innerText.trim();
        if (tabText === "Fight") ufc = true;     
    });


    const mTabs = [];
    let total = false, spread = false, rfi = false;
    const marketTabs = document.querySelectorAll("div.r-1qsk4np");
    marketTabs.forEach (tab => {
        const tabText = tab.innerText.trim();
        if (tabText === "Game Winner") {
            mTabs.push("Game Winner");
        }
        if (tabText === "Total") {
            total = true;
            mTabs.push("Total");
        }
        if (tabText === "Spread") {
            spread = true;
            mTabs.push("Spread");
        }
        if (tabText === "Run in 1st inning?") {
            rfi = true;
            mTabs.push("Run in 1st inning?");
        }
        if (tabText === "To Advance") {
            mTabs.push("To Advance");
        }
    });

    const rDivs = document.querySelectorAll("div.r-adyw6z");

    // Pair each rDiv with its previous sibling div
    const result = [];
    let totalSelected = 0;
    let maxSelected = 2;
    if (total) maxSelected += 2;
    if (spread) maxSelected += 2;
    if (rfi) maxSelected += 2;

    rDivs.forEach(rDiv => {
        const wrapper = rDiv.parentElement;                  // wrapper div around rDiv
        const prevDiv = wrapper.previousElementSibling;     // previous div (can be different for each rDiv)
        const prevText = prevDiv ? prevDiv.innerText.trim() : "";
        const rText = rDiv.innerText.trim();

        if (rText.endsWith("%") && totalSelected < maxSelected) {                          // filter by text ending with %
            result.push(prevText + "\n" + rText);
            totalSelected += 1;
        }
    });

    return [result, ufc, mTabs];
}

function isStrictNumberString(str) {
    return /^-?\d+(\.\d+)?$/.test(str);
}

function extractTeamName() {
    const rDivs = document.querySelectorAll("div.r-1e50gmw");

    const result = [];
    rDivs.forEach(rDiv => {
        const rTeamName = rDiv.innerText.trim();

        if ((!(isStrictNumberString(rTeamName[0]) && rTeamName.includes("-") || (isStrictNumberString(rTeamName[0]) && rTeamName.includes("·"))) || rTeamName.length > 9) && !isStrictNumberString(rTeamName)) {
            result.push(rTeamName);
        }
    })
    return [result[0] || "", result[1] || ""];
}

function extractPolls() {
    const rDivs = document.querySelectorAll("div.r-1jnzvcq")[document.querySelectorAll("div.r-1jnzvcq").length - 1];

    if (!rDivs) {
        return [];
    }

    const pollList = [];
    const rList = rDivs.children[0].children[0];

    for (const child of rList.childNodes) {
        const wrapper = child.firstChild;
        const pollType = wrapper?.children?.[0].children[1].innerText.trim();
        const pollData = wrapper?.children?.[1]?.firstChild;

        const pollName = pollData.children[0].firstChild.innerText.trim();
        const pollChoices = pollData.children[1].firstChild;
        const pollStatus = pollData.children[1].children[1].children[1].innerText.trim();
        if (pollStatus === "Closed") {
            continue;
        }

        const choices = [];
        const chosen = [];
        const bets = [];
        for (const choice of pollChoices.childNodes) {
            const playerPollTypes = ["Pick a player", "Anytime play", "Anytime goal scorer", "Anytime shot on goal", "Anytime TD"];
            let choiceText;
            if (playerPollTypes.includes(pollType)) {
                choiceText = choice.firstChild.firstChild.innerText.trim();

                if (choiceText === "Select a player...") {
                    chosen.push(false);
                    bets.push(-1);
                } else {
                    chosen.push(true);
                    bets.push("");
                }
            } else {
                choiceText = choice.firstChild.children[1].firstChild.innerText.trim();

                if (choice.style.backgroundColor) {
                    chosen.push(true);
                    if (choice.children.length < 2) {
                        bets.push(0);
                    } else {
                        const bet = choice.children[1].firstChild.children[1].innerText.trim();
                        bets.push(bet);
                    }
                } else {
                    chosen.push(false);
                    bets.push(-1);
                }
            }
            
            choices.push(choiceText);
        }

        pollList.push([pollName, choices, chosen, bets, pollStatus]);
    }
    console.log(pollList);

    return pollList;
}

function extractDOTD() {
    const divs = document.querySelector("div.r-16wqof.r-wk8lta");
    const teamNames = [];
    const teamOdds = [];
    const teamChosen = [];

    if (!divs) {
        return [teamNames, teamOdds, teamChosen];
    }

    for (const teamDiv of divs.childNodes) {
        const details = teamDiv.firstElementChild?.children?.[1];
        const odds = details?.firstElementChild?.children?.[0]?.innerText?.trim();
        const chosen = details?.children?.[1]?.firstElementChild?.children?.[0]?.innerText?.trim();

        if (!details || !odds || !chosen) {
            continue;
        }

        const name = details.firstElementChild.innerText?.trim().split(" ")[0];
        teamNames.push(name || "");
        teamOdds.push(odds);
        teamChosen.push(chosen);
    }

    return [teamNames, teamOdds, teamChosen];
}

// Start observing DOM changes for live updates
function startObserving() {
    if (observer) return; // Avoid multiple observers
    let lastSerialized = "";

    const sendUpdate = () => {
        const [text, ufc, mTabs] = extractText();

        const teamName = extractTeamName();
        const pollList = extractPolls();
        const serialized = JSON.stringify({ text, teamName, pollList, mTabs });
        if (serialized !== lastSerialized) {
            lastSerialized = serialized;
            chrome.runtime.sendMessage({ type: "POLL_UPDATE", text: pollList});
            chrome.runtime.sendMessage({ type: "TEXT_UPDATE_REAL", text: text, teamName: teamName, ufc: ufc, mTabs: mTabs });
        }
    };

    // Send initial text immediately
    sendUpdate();

    // Observe DOM changes
    observer = new MutationObserver(sendUpdate);
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "START_OBSERVING") {
        startObserving();
    } else if (request.type === "GET_REAL_TEXT") {
        const [text, ufc, mTabs] = extractText();
        const teamName = extractTeamName();
        sendResponse({ text: text, teamName: teamName, ufc: ufc, mTabs: mTabs });
    } else if (request.type === "GET_REAL_POLLS") {
        const pollList = extractPolls();
        sendResponse({ text: pollList });
    } else if (request.type === "GET_REAL_DOTD") {
        const [teamNames, teamOdds, teamChosen] = extractDOTD();
        sendResponse({ text: [teamNames, teamOdds, teamChosen] });
    }
    return true; // Keep channel open for async responses
});

window.addEventListener("beforeunload", () => {
    observer?.disconnect();
    observer = null;
});
