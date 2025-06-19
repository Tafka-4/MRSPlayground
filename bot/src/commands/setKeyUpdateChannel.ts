import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ChannelType,
    ChatInputCommandInteraction,
    TextChannel
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { broadcastKeygen } from '../internal/keygenBroadcasting.js';

function isSafeGuildId(key: string): boolean {
    const filter = ['__proto__', 'constructor', 'prototype'];
    return (
        !filter.includes(key.toLowerCase()) &&
        typeof key === 'string' &&
        key.length > 0
    );
}

function isValidGuildId(guildId: string): boolean {
    return /^\d{17,19}$/.test(guildId);
}

function safeSetGuildProperty(obj: any, guildId: string, value: any): void {
    if (isSafeGuildId(guildId) && isValidGuildId(guildId)) {
        obj[guildId] = value;
    }
}

function safeGetGuildProperty(obj: any, guildId: string): any {
    if (isSafeGuildId(guildId) && isValidGuildId(guildId)) {
        return Object.prototype.hasOwnProperty.call(obj, guildId)
            ? obj[guildId]
            : undefined;
    }
    return undefined;
}

export const data = new SlashCommandBuilder()
    .setName('set-key-update-channel')
    .setDescription('키 업데이트 채널을 지정하거나 생성합니다.')
    .addChannelOption((option) =>
        option
            .setName('channel')
            .setDescription(
                '키 업데이트 채널 (지정하지 않으면 새로 생성됩니다)'
            )
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    let channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;

    if (!guildId) {
        return interaction.editReply({
            content: '정보를 찾을 수 없습니다.'
        });
    }

    if (!isValidGuildId(guildId)) {
        return interaction.editReply({
            content: '유효하지 않은 서버 ID입니다.'
        });
    }

    try {
        if (!channel) {
            channel = (await interaction.guild?.channels.create({
                name: '내부 키 업데이트 채널',
                type: ChannelType.GuildText
            })) as TextChannel;
            if (!channel) {
                return interaction.editReply({
                    content: '채널을 생성할 수 없습니다.'
                });
            }
        } else if (!(channel instanceof TextChannel)) {
            return interaction.editReply({
                content: '텍스트 채널만 키 업데이트 채널로 설정할 수 있습니다.'
            });
        }

        const keyBroadcastMessage = await channel.send({
            content:
                '키 업데이트 채널이 설정되었습니다. 다음 키 업데이트부터 키를 볼 수 있습니다.',
            embeds: [
                {
                    title: '키 업데이트 채널',
                    description:
                        '내부 키가 이곳에서 업데이트 됩니다. 다음 키 업데이트부터 키를 볼 수 있습니다.',
                    color: 0x0099ff
                }
            ]
        });

        if (!keyBroadcastMessage) {
            return interaction.editReply({
                content: '메시지를 보낼 수 없습니다.'
            });
        }

        let serverMappingInfo;
        const serverMappingPath = path.join(
            process.cwd(),
            'src',
            'serverMapping.json'
        );

        try {
            if (fs.existsSync(serverMappingPath)) {
                const rawData = fs.readFileSync(serverMappingPath, 'utf8');
                serverMappingInfo = JSON.parse(rawData);
            } else {
                console.warn(
                    `serverMapping.json 파일을 찾을 수 없습니다: ${serverMappingPath}`
                );
                serverMappingInfo = {};
            }
        } catch (fileError) {
            console.error(
                'serverMapping.json 파일을 읽는 중 오류가 발생했습니다:',
                fileError
            );
            serverMappingInfo = {};
        }

        const existingData = safeGetGuildProperty(serverMappingInfo, guildId);

        if (!existingData) {
            safeSetGuildProperty(serverMappingInfo, guildId, {
                keyUpdateChannel: channel.id,
                keyBroadcastMessage: keyBroadcastMessage.id
            });
        } else {
            existingData.keyUpdateChannel = channel.id;
            existingData.keyBroadcastMessage = keyBroadcastMessage.id;
        }

        try {
            fs.writeFileSync(
                serverMappingPath,
                JSON.stringify(serverMappingInfo, null, 4)
            );
        } catch (writeError) {
            console.error(
                'serverMapping.json 파일을 쓰는 중 오류가 발생했습니다:',
                writeError
            );
            return interaction.editReply({
                content: '설정을 저장하는 중 오류가 발생했습니다.'
            });
        }

        setImmediate(async () => {
            try {
                await broadcastKeygen(interaction.client);
            } catch (broadcastError) {
                console.error('broadcastKeygen 실행 중 오류:', broadcastError);
            }
        });

        return interaction.editReply({
            content: `키 업데이트 채널이 <#${channel.id}>로 설정되었습니다.`
        });
    } catch (error) {
        console.error('setKeyUpdateChannel 명령어 실행 중 오류:', error);
        return interaction.editReply({
            content: '명령어 실행 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        });
    }
}
