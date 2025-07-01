// Only in dev version: Umbulgi command
import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('umbulgi')
    .setDescription('엄벌기');

export async function execute(interaction: ChatInputCommandInteraction) {
    const umbulgiImage = await fetch("https://i.namu.wiki/i/MX7JRP1FyzJvHb1JIlo4xq5R5DviZVdqajul13Z_HGY6zfiJgp67iXH4eUd4B9hcrjGQlpMFQ_kB8q8-MeExhg.webp");
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