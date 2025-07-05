import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { deployCommands, redeployCommands } from './deploy.js';
import { RequestClient } from './utils/unifiedClient.js';
import { broadcastKeygen } from './internal/keygenBroadcasting.js';

dotenv.config();

declare module 'discord.js' {
    interface Client {
        commands: Collection<string, any>;
        requestClient: RequestClient;
    }
}

async function waitForUserService(
    maxRetries = 30,
    retryInterval = 5000
): Promise<void> {
    const userServiceUrl =
        process.env.USER_SERVICE_URL || 'http://user-service:3001';
    const healthCheckUrl = `${userServiceUrl}/health` || `${userServiceUrl}/`;

    console.log(`User-service 연결을 확인 중입니다... (${userServiceUrl})`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(healthCheckUrl, {
                method: 'GET',
                headers: {
                    'X-Request-ID': uuidv4()
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                console.log('✅ User-service가 정상적으로 실행 중입니다!');
                return;
            }
        } catch (error) {
            console.log(
                `⏳ User-service 연결 시도 ${attempt}/${maxRetries} 실패... ${
                    retryInterval / 1000
                }초 후 재시도`
            );

            if (attempt === maxRetries) {
                return;
            }

            await new Promise((resolve) => setTimeout(resolve, retryInterval));
        }
    }
}

await waitForUserService();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();
client.requestClient = new RequestClient();
client.requestClient.initialize();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(pathToFileURL(filePath).href);
    client.commands.set(command.data.name, command);
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = await import(pathToFileURL(filePath).href);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

async function initializeKeygenBroadcasting(client: Client, maxRetries = 5, retryInterval = 10000) {
    console.log('🔑 키젠 브로드캐스팅 시스템을 시작합니다...');
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const success = await broadcastKeygen(client);
            if (success) {
                console.log('✅ 키젠 브로드캐스팅 시스템이 성공적으로 초기화되었습니다.');
                return;
            }
            console.log(`⏳ 키젠 브로드캐스팅 연결 시도 ${attempt}/${maxRetries} 실패... ${retryInterval / 1000}초 후 재시도`);
        } catch (error) {
            console.error(`❌ 키젠 브로드캐스팅 초기화 중 오류 발생 (시도 ${attempt}/${maxRetries}):`, error);
        }
        if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryInterval));
        }
    }
    console.error('❌ 키젠 브로드캐스팅 시스템 초기화에 최종 실패했습니다.');
}

client.once('ready', async () => {
    console.log('🤖 bot is ready: deploy slash commands...');

    const clearFirst = true;

    if (clearFirst) {
        await redeployCommands(true);
    } else {
        await deployCommands();
    }

    await initializeKeygenBroadcasting(client);
});

client
    .login(process.env.DISCORD_BOT_TOKEN)
    .then(() => console.log('🤖 bot is ready'))
    .catch(console.error);

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    client.requestClient.disconnectWebSocket();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    client.requestClient.disconnectWebSocket();
    process.exit(0);
});
