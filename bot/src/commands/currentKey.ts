import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, CommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('current-key')
    .setDescription('현재 키 확인');

export async function execute(interaction: CommandInteraction) {
    const client = interaction.client as Client;
    const requestClient = client.requestClient;

    const response = await requestClient.get(
        `${process.env.USER_SERVICE_URL}/api/v1/auth/current-key`
    );

    if (!(response.success && response.key)) {
        await interaction.reply('키를 받아오지 못했어요...');
        return;
    }

    await interaction.reply(
        `현재 키를 받아왔습니다! \`\`\`${response.key}\`\`\``
    );
}
