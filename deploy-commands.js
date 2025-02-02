// noinspection JSUnresolvedReference

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Load the commands
const commands = [];
const commandsFolderPath = path.join(__dirname, 'commands');
const commandFileNames = fs.readdirSync(commandsFolderPath).filter(file => file.endsWith('.js'));
for (const file of commandFileNames) {
    const command = require(path.join(commandsFolderPath, file));
    commands.push(command.data.toJSON());
}

// Create a REST client instance
// The REST client allows the bot to interact with the Discord REST API. The REST API is used to perform actions like
// registering slash commands, sending messages, or managing servers. The REST Client makes it easy to send HTTP
// requests to the Discord API without needing to manually construct requests, headers or handle authentication
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_LOLBOT_TOKEN);

// Deploy the commands
(async () => {
    // noinspection GrazieInspection
    try {
        console.log("Started refreshing application commands...");

        // Fetch and delete all existing commands (cleanup)
        const existingCommands = await rest.get(Routes.applicationCommands(process.env.DISCORD_APPLICATION_CLIENT_ID));
        for (const cmd of existingCommands) {
            await rest.delete(
                Routes.applicationCommands(process.env.DISCORD_APPLICATION_CLIENT_ID) + "/" + cmd.id
            );
            console.log("Deleted command: " + cmd.name);
        }

        // Deploys commands to a specific guild/server (faster update time):
        /*await rest.put(
            // API route
            Routes.applicationGuildCommands(process.env.DISCORD_APPLICATION_CLIENT_ID, process.env.SERVER_ID),
            // Send the commands array in the request body
            { body: commands }
        );*/

        // Deploy commands globally:
        await rest.put(
            // API route
            Routes.applicationCommands(process.env.DISCORD_APPLICATION_CLIENT_ID),
            // Send the commands array in the request body
            { body: commands }
        );

        console.log("Successfully reloaded application commands!");
    }
    catch (error) {
        console.error(error);
    }
})();