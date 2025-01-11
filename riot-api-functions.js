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
        statsTextArray.push("**Stats for " + gameName + " latest game:**");
    } else {
        statsTextArray.push("**Stats for " + gameName + "'s latest game:**");
    }

    statsTextArray.push("");

    statsTextArray.push("**Champ: **" + playerMatchData.championName);
    const gameDurationSeconds = matchData.info.gameDuration;
    statsTextArray.push("**Duration: **" + Math.floor(gameDurationSeconds / 60) + "m " + gameDurationSeconds % 60 + "s");
    if (playerMatchData.win) {
        statsTextArray.push("**Victory!**");
    } else {
        statsTextArray.push("**Defeat! :( (jg diff)**");
    }

    statsTextArray.push("");

    statsTextArray.push("**Kills: **" + playerMatchData.kills);
    statsTextArray.push("**Deaths: **" + playerMatchData.deaths);
    statsTextArray.push("**Assists: **" + playerMatchData.assists);
    let kdaString = "**KDA: **" + playerMatchData.kda.toFixed(2);
    if (playerMatchData.kda < kdaToNotBeAInter) {
        kdaString += "** CERTIFIED INTER!**";
    }
    statsTextArray.push(kdaString);
    statsTextArray.push("**Kill participation: **" +
        (playerMatchData.killParticipation * 100).toFixed(0) + "%");

    statsTextArray.push("");

    const cs = playerMatchData.totalMinionsKilled + playerMatchData.neutralMinionsKilled;
    statsTextArray.push("**CS: **" + cs + " (" + Math.floor((cs / (gameDurationSeconds / 60)) * 10) / 10 + ")");
    statsTextArray.push("**Vision score: **" + playerMatchData.damageDealtToTurrets);

    statsTextArray.push("");

    statsTextArray.push("**Damage to players: **" + playerMatchData.totalDamageDealtToChampions);
    statsTextArray.push("**Damage to turrets: **" + playerMatchData.damageDealtToTurrets);
    statsTextArray.push("**Damage taken: **" + playerMatchData.totalDamageTaken);

    statsTextArray.push("");

    if (playerMatchData.soloKills > 0) {
        statsTextArray.push("**Any SOLOBOLO?** Yes!");
    } else {
        statsTextArray.push("**Any SOLOBOLO?** No :(");
    }
    statsTextArray.push("**Objective steals: **" + playerMatchData.epicMonsterSteals);
    statsTextArray.push("**Skillshots hit: **" + playerMatchData.skillshotsHit);
    statsTextArray.push("**Dodged skillshots: **" + playerMatchData.skillshotsDodged);
    statsTextArray.push("**\"Enemy missing\"-pings: **" + playerMatchData.enemyMissingPings);

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