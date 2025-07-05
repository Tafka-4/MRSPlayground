// Only in dev version: Umbulgi command
import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('umbulgi')
    .setDescription('엄벌기');

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const umbulgiImage = await fetch("https://i.namu.wiki/i/JQD6ODljEwldrEmg40FJlNbV2yQILsABg0D5wHynLx1P6nJ2Dx1ny72b91AtqgboepiZDhHWoO-ESEKPeopPAw.webp");
    const umbulgiImageBuffer = await umbulgiImage.arrayBuffer();

    await interaction.editReply({
        files: [
            {
                attachment: Buffer.from(umbulgiImageBuffer),
                name: 'umbulgi.webp'
            }
        ]
    });
}