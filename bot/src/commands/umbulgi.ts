// Only in dev version: Umbulgi command
import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('umbulgi')
    .setDescription('엄벌기');

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate some work
    await interaction.editReply({
        content: '엄벌기!'
    });
}