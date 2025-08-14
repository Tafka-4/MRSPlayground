import fs from 'fs';
import path from 'path';
import { Client, TextChannel, Message } from 'discord.js';
import { RequestClient } from '../utils/unifiedClient.js';

const serverMappingPath = path.join(process.cwd(), 'src', 'serverMapping.json');
let serverMappingInfo: any = {};

try {
    if (fs.existsSync(serverMappingPath)) {
        serverMappingInfo = JSON.parse(
            fs.readFileSync(serverMappingPath, 'utf8')
        );
        console.log('✅ serverMapping.json 파일을 성공적으로 로드했습니다.');
        console.log(
            '📋 등록된 서버 수:',
            Object.keys(serverMappingInfo).length
        );
    } else {
        console.warn(
            `⚠️ serverMapping.json 파일을 찾을 수 없습니다: ${serverMappingPath}`
        );
        console.warn('📝 파일을 생성하고 서버 정보를 추가해주세요.');
    }
} catch (error) {
    console.error(
        '❌ serverMapping.json 파일을 읽는 중 오류가 발생했습니다:',
        error
    );
}

let broadcastMessageCache: { [key: string]: Message } = {};

export async function initializeBroadcastCache(client: Client) {
    console.log('🔍 브로드캐스트 메시지 캐시를 초기화합니다...');
    if (Object.keys(serverMappingInfo).length === 0) {
        console.warn('⚠️ 등록된 서버가 없어 캐시를 초기화할 수 없습니다.');
        return;
    }

    let successCount = 0;
    const totalServers = Object.keys(serverMappingInfo).length;

    for (const guildId in serverMappingInfo) {
        const serverConfig = serverMappingInfo[guildId];
        const channelId = serverConfig.keyUpdateChannel;
        const broadcastMessageId = serverConfig.keyBroadcastMessage;

        if (!channelId || !broadcastMessageId) {
            console.warn(
                `⚠️ 서버 ${guildId}의 설정이 불완전하여 캐시할 수 없습니다.`
            );
            continue;
        }

        try {
            const channel = await client.channels.fetch(channelId);
            if (channel instanceof TextChannel) {
                const message = await channel.messages.fetch(broadcastMessageId);
                broadcastMessageCache[guildId] = message;
                successCount++;
                console.log(`✅ 서버 ${guildId}의 메시지를 성공적으로 캐시했습니다.`);
            } else {
                console.warn(
                    `⚠️ 채널 ${channelId}을 찾을 수 없거나 텍스트 채널이 아닙니다.`
                );
            }
        } catch (error) {
            console.error(`❌ 서버 ${guildId}의 메시지 캐싱 실패:`, error);
        }
    }

    console.log(
        `👍 브로드캐스트 캐시 초기화 완료. 성공: ${successCount}/${totalServers}`
    );
}

export const broadcastKeygen = async (client: Client) => {
    console.log('🔑 키젠 브로드캐스팅 시스템을 초기화합니다...');

    if (Object.keys(serverMappingInfo).length === 0) {
        console.warn(
            '⚠️ 등록된 서버가 없습니다. serverMapping.json을 확인해주세요.'
        );
        return;
    }

    const requestClient: RequestClient = client.requestClient;

    try {
        const url = 'user-api:3001/ws/keygen';
        console.log(`🔌 user-api 웹소켓 연결을 시도합니다... (${url})`);
        
        let connected = false;
        try {
            connected = await requestClient.connectWebSocket(url);
        } catch (error) {
            console.error('❌ connectWebSocket 호출 중 오류 발생:', error);
            connected = false;
        }

        if (!connected) {
            console.error('❌ 웹소켓 연결에 실패했습니다.');
            return;
        }

        console.log('✅ 웹소켓 연결이 성공했습니다.');

        requestClient.onWebSocketMessage('new-key', (data) => {
            console.log('🔑 새로운 키젠 데이터를 받았습니다:', data);

            if (!data.data || !data.data.key) {
                console.warn('⚠️ 키젠 데이터에 key가 없습니다:', data);
                return;
            }

            const key = data.data.key;

            const broadcastToGuild = async (guildId: string) => {
                const broadcastMessage = broadcastMessageCache[guildId];
                if (!broadcastMessage) {
                    console.warn(
                        `⚠️ 서버 ${guildId}에 대한 캐시된 메시지를 찾을 수 없습니다. 브로드캐스트를 건너뜁니다.`
                    );
                    return { success: false };
                }

                try {
                    await broadcastMessage.edit(`🔑 키 업데이트: \`${key}\``);
                    console.log(
                        `✅ 서버 ${guildId}에 키 업데이트를 전송했습니다.`
                    );
                    return { success: true };
                } catch (error) {
                    console.error(
                        `❌ 서버 ${guildId}에 키 업데이트 전송 실패:`,
                        error
                    );
                    return { success: false };
                }
            };

            setTimeout(() => {
                (async () => {
                    const results = await Promise.all(
                        Object.keys(serverMappingInfo).map(broadcastToGuild)
                    );

                    const successCount = results.filter(
                        (r) => r.success
                    ).length;
                    const failCount = results.length - successCount;

                    console.log(
                        `📊 키 브로드캐스트 완료 - 성공: ${successCount}, 실패: ${failCount}`
                    );
                })();
            }, 100);
        });

        console.log('👂 키젠 메시지 리스너가 등록되었습니다.');
        return true;
    } catch (error) {
        console.error(
            '❌ 키젠 브로드캐스팅 초기화 중 오류가 발생했습니다:',
            error
        );
        return false;
    }
};
