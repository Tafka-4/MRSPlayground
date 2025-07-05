import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, CommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('current-key')
    .setDescription('현재 키 확인');

export async function execute(interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const client = interaction.client as Client;
    const requestClient = client.requestClient;

    try {
        const response = await requestClient.get(
            `${process.env.USER_SERVICE_URL}/api/v1/auth/current-key`
        );

        if (!(response.success && response.key)) {
            await interaction.editReply('키를 받아오지 못했어요...');
            return;
        }

        await interaction.editReply(
            `현재 키를 받아왔습니다! \`\`\`${response.key}\`\`\``
        );
    } catch (error) {
        console.error("Error fetching current key:", error);
        await interaction.editReply('키를 받아오는 중 오류가 발생했어요.');
    }
}
