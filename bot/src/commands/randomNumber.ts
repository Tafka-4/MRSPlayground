import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('random-number')
    .setDescription('랜덤 숫자를 생성합니다. 진법을 입력할 때는 숫자만 입력해주세요.')
    .addIntegerOption((option) =>
        option.setName('min').setDescription('최소값입니다. 입력하지 않으면 1로 설정됩니다.').setRequired(false)
    )
    .addIntegerOption((option) =>
        option.setName('max').setDescription('최대값입니다. 입력하지 않으면 100으로 설정됩니다.').setRequired(false)
    )
    .addIntegerOption((option) =>
        option.setName('type').setDescription('진법입니다. 입력하지 않거나, 지원하지 않는 진법이라면 10진법으로 설정됩니다.').setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const min = interaction.options.getInteger('min') ?? 1;
    const max = interaction.options.getInteger('max') ?? 100;
    if (min > max) {
        await interaction.reply('최소값이 최대값보다 큽니다! 최소값과 최대값을 다시 입력해주세요.');
        return;
    }

    if (min === max) {
        await interaction.reply('최소값과 최대값이 같습니다! 최소값과 최대값을 다시 입력해주세요.');
        return;
    }

    const type = interaction.options.getInteger('type') ?? 10;
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    await interaction.reply(`${min}부터 ${max} 사이의 랜덤한 숫자입니다! \n => \`${randomNumber.toString(type)}\``);
}