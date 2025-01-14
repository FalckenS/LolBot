// noinspection JSUnresolvedReference

module.exports = {
    getLatestMatchStats: getLatestMatchStats,
    getLatestMatchAbilitiesStats: getLatestMatchAbilitiesStats,
    getLatestMatchLaneStats: getLatestMatchLaneStats
};
require('dotenv').config();
const axios = require("axios");

// ----------------------------------------------------- API URLs -----------------------------------------------------

const BASE_URL = "https://europe.api.riotgames.com";

// https://developer.riotgames.com/apis#account-v1/GET_getByRiotId
const GET_ACCOUNT_BY_RIOT_ID_URL = "/riot/account/v1/accounts/by-riot-id/";

// https://developer.riotgames.com/apis#match-v5/GET_getMatchIdsByPUUID
const GET_A_LIST_OF_MATCH_IDS_BY_PUUID_URL = "/lol/match/v5/matches/by-puuid/";

// https://developer.riotgames.com/apis#match-v5/GET_getMatch
const GET_A_MATCH_BY_MATCH_ID_URL = "/lol/match/v5/matches/";

// ------------------------------------------------- Riot API methods -------------------------------------------------

// Calls Riot API with an endpoint URL and returns the response data
async function getRiotAPIResponseData(endpointURL) {
    const response = await axios.get(
        BASE_URL+endpointURL, {
            headers: {
                "X-Riot-Token": process.env.RIOT_API_KEY
            }
        });
    return response.data;
}

// Returns the puuid (string)
async function getPuuid(gameName, tagLine) {
    return (
        await getRiotAPIResponseData(GET_ACCOUNT_BY_RIOT_ID_URL+gameName+"/"+tagLine)
    ).puuid;
}

// Returns the IDs for a players most recent matches (string[])
async function getMatchIDs(puuid, numOfMatches, onlyRanked) {
    let queryParameters = "count="+1;
    if(onlyRanked) {
        queryParameters += "&type=ranked";
    }
    return await getRiotAPIResponseData(GET_A_LIST_OF_MATCH_IDS_BY_PUUID_URL+puuid+"/ids?"+queryParameters);
}

// Returns information about a LoL match (JSON object)
async function getMatchData(matchID) {
    return await getRiotAPIResponseData(GET_A_MATCH_BY_MATCH_ID_URL+matchID);
}

// --------------------------------------------------------------------------------------------------------------------

// The lowest KDA to not be considered an inter
const kdaToNotBeAInter = 1;

// Returns a combined object consisting of ParticipantDto and ChallengesDto for a player
// https://developer.riotgames.com/apis#match-v5/GET_getMatch
function getPlayerMatchData(matchData, gameName) {
    const participantsArray = matchData.info.participants;
    for (const participant of participantsArray) {
        if (participant.riotIdGameName === gameName) {
            // Combines ParticipantDto and ChallengesDto (participant is a ParticipantDto object)
            return { ...participant, ...participant.challenges };
        }
    }
}

async function getLatestMatchPlayerData(gameName, tagLine) {
    // Get the puuid
    let puuid;
    console.log("gameName: " + gameName);
    console.log("gameName: " + tagLine);
    try {
        puuid = await getPuuid(gameName, tagLine);
        console.log("puuid: " + puuid);
    }
    catch (error) {
        console.log("Could not get puuid!");
        throw new Error(
            "No Riot account with the name \"" + gameName + "\" and the tag \"" + tagLine + "\" found on EUW!");
    }
    // Get the match data
    let matchData;
    try {
        const recentMatchIDs = await getMatchIDs(puuid, 1);
        matchData = await getMatchData(recentMatchIDs[0]);
    }
    catch (error) {
        console.log("Could not get recent matches!");
        throw new Error("No recent matches found!");
    }
    // Get match data for the player
    const playerMatchData = await getPlayerMatchData(matchData, gameName);
    return {matchData, playerMatchData};
}

function getOutputArrayStart(gameName, playerMatchData) {
    // This shit is ugly
    const outputArray = [];

    // Name
    const gameNameLastChar = gameName.slice(-1);
    if (gameNameLastChar === "s" || gameNameLastChar === "S") {
        outputArray.push("**Stats for " + gameName + " latest game:**");
    }
    else {
        outputArray.push("**Stats for " + gameName + "'s latest game:**");
    }

    outputArray.push("");

    // Duration
    const gameDurationSeconds = matchData.info.gameDuration;
    outputArray.push("**Duration:** " + Math.floor(gameDurationSeconds/60) + "m " + gameDurationSeconds % 60 + "s");
    // Win/Loss
    if (playerMatchData.win) {
        outputArray.push("**Victory!**");
    }
    else {
        outputArray.push("**Defeat!** (jg diff)");
    }
    // Champ
    if ((playerMatchData.championName === "Urgot") && (gameName === "YoloBoiis")) {
        outputArray.push("**Champ:** Urgot (sällan)");
    }
    else {
        outputArray.push("**Champ:** " + playerMatchData.championName);
    }
    outputArray.push("");
    return outputArray;
}

// Returns stats about the laning phase for a players latest match (string[])
async function getLatestMatchLaneStats(gameName, tagLine) {
    let {matchData, playerMatchData} = await getLatestMatchPlayerData(gameName, tagLine);

    // Returns an array with stats about a match (string[]). Some elements are empty strings that separates the array
    // into "categories" (looks better when printed)
    function constructOutputArray(gameName, playerMatchData) {
        const outputArray = getOutputArrayStart(gameName, playerMatchData);

        outputArray.push("**Lane minions first 10 minutes:** " + playerMatchData.laneMinionsFirst10Minutes);
        outputArray.push("**Max CS advantage on lane opponent:** " + playerMatchData.maxCsAdvantageOnLaneOpponent);
        outputArray.push("**Max level lead on lane opponent:** " + playerMatchData.maxLevelLeadLaneOpponent);

        return outputArray;
    }
    return constructOutputArray(gameName, playerMatchData, matchData);
}

// Returns stats about used abilities for players latest match (string[])
async function getLatestMatchAbilitiesStats(gameName, tagLine) {
    let {matchData, playerMatchData} = await getLatestMatchPlayerData(gameName, tagLine);

    // Returns an array with stats about a match (string[]). Some elements are empty strings that separates the array
    // into "categories" (looks better when printed)
    function constructOutputArray(gameName, playerMatchData) {
        const outputArray = getOutputArrayStart(gameName, playerMatchData);

        outputArray.push("**Qs used:** " + playerMatchData.spell1Casts);
        outputArray.push("**Ws used:** " + playerMatchData.spell2Casts);
        outputArray.push("**Es used:** " + playerMatchData.spell3Casts);
        outputArray.push("**Ults used:** " + playerMatchData.spell4Casts);
        outputArray.push("**Skillshots hit:** " + playerMatchData.skillshotsHit);

        return outputArray;
    }
    return constructOutputArray(gameName, playerMatchData, matchData);
}

// Returns stats for a players latest match (string[])
async function getLatestMatchStats(gameName, tagLine) {
    let {matchData, playerMatchData} = await getLatestMatchPlayerData(gameName, tagLine);

    // Returns an array with stats about a match (string[]). Some elements are empty strings that separates the array
    // into "categories" (looks better when printed)
    function constructOutputArray(gameName, playerMatchData) {
        const outputArray = getOutputArrayStart(gameName, playerMatchData);

        outputArray.push("");

        outputArray.push("**Kills:** " + playerMatchData.kills);
        outputArray.push("**Deaths:** " + playerMatchData.deaths);
        outputArray.push("**Assists:** " + playerMatchData.assists);
        let kdaString = "**KDA:** " + playerMatchData.kda.toFixed(2);
        if (playerMatchData.kda < kdaToNotBeAInter) {
            kdaString += "** nah bro**";
        }
        outputArray.push(kdaString);
        outputArray.push("**Kill participation:** " +
            (playerMatchData.killParticipation * 100).toFixed(0) + "%");

        outputArray.push("");

        const cs = playerMatchData.totalMinionsKilled + playerMatchData.neutralMinionsKilled;
        outputArray.push("**CS:** " + cs + " (" + Math.floor((cs / (gameDurationSeconds / 60)) * 10) / 10 + ")");
        outputArray.push("**Vision score:** " + playerMatchData.damageDealtToTurrets);

        outputArray.push("");

        outputArray.push("**Damage to players:** " + playerMatchData.totalDamageDealtToChampions);
        outputArray.push("**Damage to turrets:** " + playerMatchData.damageDealtToTurrets);
        outputArray.push("**Damage taken:** " + playerMatchData.totalDamageTaken);

        outputArray.push("");

        if (playerMatchData.soloKills > 0) {
            outputArray.push("**SOLOBOLO?**  Yes");
        }
        else {
            outputArray.push("**SOLOBOLO?**  No");
        }
        outputArray.push("**Objective steals:** " + playerMatchData.epicMonsterSteals);
        outputArray.push("**Skillshots hit:** " + playerMatchData.skillshotsHit);
        outputArray.push("**Dodged skillshots:** " + playerMatchData.skillshotsDodged);
        outputArray.push("**\"Enemy missing\"-pings:** " + playerMatchData.enemyMissingPings);

        return outputArray;
    }
    return constructOutputArray(gameName, playerMatchData, matchData);
}