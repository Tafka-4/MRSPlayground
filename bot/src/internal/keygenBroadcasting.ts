import fs from 'fs';
import path from 'path';
import { Client, TextChannel } from 'discord.js';
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
        const url = 'user-service:3001/ws/keygen';
        console.log(`🔌 user-service 웹소켓 연결을 시도합니다... (${url})`);
        
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

        requestClient.onWebSocketMessage('new-key', async (data) => {
            console.log('🔑 새로운 키젠 데이터를 받았습니다:', data);

            if (!data.data.key) {
                console.warn('⚠️ 키젠 데이터에 key가 없습니다:', data);
                return;
            }

            const key = data.data.key;
            let successCount = 0;
            let failCount = 0;

            for (const guildId in serverMappingInfo) {
                const serverConfig = serverMappingInfo[guildId];
                const channelId = serverConfig.keyUpdateChannel;
                const broadcastMessageId = serverConfig.keyBroadcastMessage;

                if (!channelId || !broadcastMessageId) {
                    console.warn(
                        `⚠️ 서버 ${guildId}의 설정이 불완전합니다:`,
                        serverConfig
                    );
                    failCount++;
                    continue;
                }

                try {
                    const channel = await client.channels.fetch(channelId);
                    if (!channel || !(channel instanceof TextChannel)) {
                        console.warn(
                            `⚠️ 채널을 찾을 수 없거나 텍스트 채널이 아닙니다: ${channelId}`
                        );
                        failCount++;
                        continue;
                    }

                    const broadcastMessage = await channel.messages.fetch(
                        broadcastMessageId
                    );
                    if (!broadcastMessage) {
                        console.warn(
                            `⚠️ 브로드캐스트 메시지를 찾을 수 없습니다: ${broadcastMessageId}`
                        );
                        failCount++;
                        continue;
                    }

                    await broadcastMessage.edit(`🔑 키 업데이트: \`${key}\``);
                    console.log(
                        `✅ 서버 ${guildId}에 키 업데이트를 전송했습니다.`
                    );
                    successCount++;
                } catch (error) {
                    console.error(
                        `❌ 서버 ${guildId}에 키 업데이트 전송 실패:`,
                        error
                    );
                    failCount++;
                }
            }

            console.log(
                `📊 키 브로드캐스트 완료 - 성공: ${successCount}, 실패: ${failCount}`
            );
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
