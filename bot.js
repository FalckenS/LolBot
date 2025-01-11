// Load environment variables
require('dotenv').config();

// Import modules
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

// Create a Discord client instance
// The intents are the types of events the bot will receive from the Discord Gateway. "Guilds" include guild-related
// events like slash commands (guild = server)
// noinspection JSUnresolvedReference
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Load the commands into client.commands
const commandsFolderPath = path.join(__dirname, 'commands');
const commandFileNames = fs.readdirSync(commandsFolderPath).filter(file => file.endsWith('.js'));
client.commands = new Collection();
for (const fileName of commandFileNames) {
    // Load the command from the path and add it to client.commands
    const command = require(path.join(commandsFolderPath, fileName));
    client.commands.set(command.data.name, command);
}

// When the bot is ready
client.once('ready', () => {
    console.log("Logged in as " + client.user.tag);
});

// Respond to slash commands
// Event listener for the 'interactionCreate' event. 'interactionCreate' fires whenever the bot receives any
// interaction from a user (e.g. slash commands)
client.on('interactionCreate', async interaction => {
    // If the interaction is not a slash command, return
    if (!interaction.isChatInputCommand()) return;

    // Retrieve the command with the same name. If no matching command, return
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Execute the command
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        // Ephemeral means only the user who triggered the interaction will see the message
        await interaction.reply({ content: 'There was an error executing that command!', ephemeral: true });
    }
});

// Login with the bot token
// noinspection JSIgnoredPromiseFromCall
client.login(process.env.DISCORD_LOLBOT_TOKEN);