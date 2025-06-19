import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function clearAllCommands() {
    try {
        const rest = new REST({ version: '10' }).setToken(
            process.env.DISCORD_BOT_TOKEN as string
        );

        console.log('clearing all slash commands...');

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.DISCORD_BOT_CLIENT_ID as string,
                process.env.DISCORD_GUILD_ID as string
            ),
            { body: [] }
        );

        await rest.put(
            Routes.applicationCommands(
                process.env.DISCORD_BOT_CLIENT_ID as string
            ),
            { body: [] }
        );

        console.log('✅ all slash commands cleared successfully!');
        return true;
    } catch (error) {
        console.error('❌ clear slash commands failed:', error);
        return false;
    }
}

export async function deployCommands() {
    try {
        const commands: any[] = [];
        const commandsPath = path.join(__dirname, 'commands');
        const commandFiles = fs
            .readdirSync(commandsPath)
            .filter((file) => (file.endsWith('.js') || file.endsWith('.ts')) && file !== '.js' && file !== '.ts');

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = await import(pathToFileURL(filePath).href);
            if (command.data && typeof command.data.toJSON === 'function') {
                commands.push(command.data.toJSON());
            }
        }

        const rest = new REST({ version: '10' }).setToken(
            process.env.DISCORD_BOT_TOKEN as string
        );

        console.log(`deploy slash commands... (${commands.length} commands)`);

        // Global deploy
        /*
        await rest.put(
            Routes.applicationCommands(
                process.env.DISCORD_BOT_CLIENT_ID as string
            ),
            {
                body: commands
            }
        );
        */

        // Debug deploy
        await rest.put(
            Routes.applicationGuildCommands(
                process.env.DISCORD_BOT_CLIENT_ID as string,
                process.env.DISCORD_GUILD_ID as string
            ),
            {
                body: commands
            }
        );

        console.log('✅ slash commands are deployed successfully!');
        return true;
    } catch (error) {
        console.error('❌ deploy slash commands failed:', error);
        return false;
    }
}

export async function redeployCommands(clearFirst = false) {
    if (clearFirst) {
        await clearAllCommands();
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return await deployCommands();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const args = process.argv.slice(2);
    if (args.includes('--clear')) {
        clearAllCommands();
    } else if (args.includes('--redeploy')) {
        redeployCommands(true);
    } else {
        deployCommands();
    }
}
