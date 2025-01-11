// noinspection JSUnresolvedReference

// The lowest KDA to not be considered an inter
const kdaToNotBeAInter = 1;

module.exports = { getLatestGameStats };
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
    // noinspection JSCheckFunctionSignatures
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
    return (await getRiotAPIResponseData(
        GET_ACCOUNT_BY_RIOT_ID_URL+gameName+"/"+tagLine)
    ).puuid;
}

// Returns the IDs for a players most recent matches (string[])
async function getMatchIDs(puuid, numOfMatches, onlyRanked) {
    let queryParameters = "count="+1;
    if(onlyRanked) {
        queryParameters += "&type=ranked";
    }
    return await getRiotAPIResponseData(
        GET_A_LIST_OF_MATCH_IDS_BY_PUUID_URL+puuid+"/ids?"+queryParameters
    );
}

// Returns information about a LoL match (JSON object)
async function getMatchData(matchID) {
    return await getRiotAPIResponseData(GET_A_MATCH_BY_MATCH_ID_URL+matchID);
}

// --------------------------------------------------------------------------------------------------------------------

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

// Returns an array with stats about a game (string[]). Some elements are empty strings that separates the array into
// "categories" (looks better when printed)
function constructStatsTextArray(gameName, playerMatchData, matchData) {
    const statsTextArray = [];

    const gameNameLastChar = gameName.slice(-1);
    if (gameNameLastChar === "s" || gameNameLastChar === "S") {
        statsTextArray.push("__Stats for " + gameName + " latest game:__");
    }
    else {
        statsTextArray.push("__Stats for " + gameName + "'s latest game:__");
    }

    statsTextArray.push("");

    // noinspection SpellCheckingInspection
    if ((playerMatchData.championName === "Urgot") && (gameName === "YoloBoiis")) {
        statsTextArray.push("__Champ:__ Urgot (sällan)");
    }
    else {
        statsTextArray.push("__Champ:__ " + playerMatchData.championName);
    }
    const gameDurationSeconds = matchData.info.gameDuration;
    statsTextArray.push("__Duration:__ " + Math.floor(gameDurationSeconds / 60) + "m " + gameDurationSeconds % 60 + "s");
    if (playerMatchData.win) {
        statsTextArray.push("__Victory!__");
    }
    else {
        statsTextArray.push("__Defeat! (jg diff)__");
    }

    statsTextArray.push("");

    statsTextArray.push("__Kills:__ " + playerMatchData.kills);
    statsTextArray.push("__Deaths:__ " + playerMatchData.deaths);
    statsTextArray.push("__Assists:__ " + playerMatchData.assists);
    let kdaString = "__KDA:__ " + playerMatchData.kda.toFixed(2);
    if (playerMatchData.kda < kdaToNotBeAInter) {
        kdaString += "__ bro__";
    }
    statsTextArray.push(kdaString);
    statsTextArray.push("__Kill participation:__ " +
        (playerMatchData.killParticipation * 100).toFixed(0) + "%");

    statsTextArray.push("");

    const cs = playerMatchData.totalMinionsKilled + playerMatchData.neutralMinionsKilled;
    statsTextArray.push("__CS:__ " + cs + " (" + Math.floor((cs / (gameDurationSeconds / 60)) * 10) / 10 + ")");
    statsTextArray.push("__Vision score:__ " + playerMatchData.damageDealtToTurrets);

    statsTextArray.push("");

    statsTextArray.push("__Damage to players:__ " + playerMatchData.totalDamageDealtToChampions);
    statsTextArray.push("__Damage to turrets:__ " + playerMatchData.damageDealtToTurrets);
    statsTextArray.push("__Damage taken:__ " + playerMatchData.totalDamageTaken);

    statsTextArray.push("");

    if (playerMatchData.soloKills > 0) {
        statsTextArray.push("__SOLOBOLO?__  Yes");
    }
    else {
        statsTextArray.push("__SOLOBOLO?__  No");
    }
    statsTextArray.push("__Objective steals:__ " + playerMatchData.epicMonsterSteals);
    statsTextArray.push("__Skillshots hit:__ " + playerMatchData.skillshotsHit);
    statsTextArray.push("__Dodged skillshots:__ " + playerMatchData.skillshotsDodged);
    statsTextArray.push("__\"Enemy missing\"-pings:__ " + playerMatchData.enemyMissingPings);

    return statsTextArray;
}

// Returns stats for a players latest game (string[])
async function getLatestGameStats(gameName, tagLine) {
    // Get the puuid
    let puuid;
    try {
        puuid = await getPuuid(gameName, tagLine);
    }
    catch (error) {
        // noinspection GrazieInspection
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
        throw new Error("No recent matches found!");
    }

    // Get match data for the player
    const playerMatchData = await getPlayerMatchData(matchData, gameName);
    return constructStatsTextArray(gameName, playerMatchData, matchData);
}