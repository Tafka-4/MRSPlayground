// Only in dev version: Umbulgi command
import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('umbulgi')
    .setDescription('엄벌기');

export async function execute(interaction: ChatInputCommandInteraction) {
    const umbulgiImage = await fetch("https://i.namu.wiki/i/KpQ_vg1iJqbzgKQ-2WhGpjlpKorsJ7bPwesYDsVhQGAgefAEPN69ULnwySRaEsZfq1AgdMlc4gFBK9oDvN3NkA.webp");
    const umbulgiImageBuffer = await umbulgiImage.arrayBuffer();

    await interaction.reply({
        files: [
            {
                attachment: Buffer.from(umbulgiImageBuffer),
                name: 'umbulgi.webp'
            }
        ]
    });
}