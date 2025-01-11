// Import modules
const { SlashCommandBuilder } = require('discord.js');
const { getLatestGameStats } = require('../riot-api-functions');

// The command
// This is what is returned when require() is used on this file
module.exports = {
    data: new SlashCommandBuilder()
        .setName('latest-game-stats')
        .setDescription('Shows some stats from the latest game')
        .addStringOption(option =>
            option
                .setName('riot-id')
                .setDescription('Write like this: Name#Tag (you can copy from the LoL client and send directly)')
                .setRequired(true)
        ),

    // Handle execution of the command
    async execute(interaction) {
        // When a Riot ID is copied from the League of Legends client it also adds invisible (and annoying) Unicode
        // directional formatting characters (\u2066 and \u2069) which has to be removed
        const riotID = interaction.options.getString('riot-id').replace(/[\u2066\u2069]/g, "");
        const [gameName, tagLine] = riotID.split("#");

        if (gameName.length < 1) {
            // When there's nothing before #
            await interaction.reply("No name detected!");
            return;
        }
        if (typeof tagLine === "undefined") {
            // When there's no # (no tag)
            await interaction.reply("No tag detected!");
            return;
        }
        try {
            // Get the game stats array and reply with every stat on a new line
            const gameStatsArray = await getLatestGameStats(gameName, tagLine);
            const reply = gameStatsArray.join('\n');
            await interaction.reply(reply);
        }
        catch (error) {
            // If any other error occurs, reply with the error message
            await interaction.reply("Something went wrong! Error message: " + error.message);
        }
    }
};