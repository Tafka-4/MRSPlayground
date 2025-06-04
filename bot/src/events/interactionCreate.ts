import { Events, Interaction } from 'discord.js';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction: Interaction, client: any) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(
            `No command matching ${interaction.commandName} was found.`
        );
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Error executing command:', error);

        const errorMessage = 'There was an error while executing this command!';

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: errorMessage,
                ephemeral: true
            });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
}
