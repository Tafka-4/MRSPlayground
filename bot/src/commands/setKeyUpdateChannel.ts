import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import fs from 'fs';

export const data = new SlashCommandBuilder()
    .setName('set-key-update-channel')
    .setDescription('키 업데이트 채널을 지정하거나 생성합니다.')
    .addChannelOption((option) =>
        option
            .setName('channel')
            .setDescription('키 업데이트 채널')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;

    if (!(guildId && channel)) {
        return interaction.reply({
            content: '정보를 찾을 수 없습니다.',
            ephemeral: true
        });
    }

    const serverMappingInfo = JSON.parse(
        fs.readFileSync('../serverMapping.json', 'utf8')
    );

    if (!serverMappingInfo[guildId]) {
        serverMappingInfo[guildId] = {
            keyUpdateChannel: channel.id
        };
    } else {
        serverMappingInfo[guildId].keyUpdateChannel = channel.id;
    }

    fs.writeFileSync(
        '../serverMapping.json',
        JSON.stringify(serverMappingInfo, null, 4)
    );

    return interaction.reply({
        content: '키 업데이트 채널이 설정되었습니다.',
        ephemeral: true
    });
}
