import { Command } from 'discord-akairo';
import { Message, SnowflakeUtil, Snowflake, DeconstructedSnowflake, Permissions } from 'discord.js';
import ms from 'pretty-ms';
import { stripIndents } from 'common-tags';

export default class CompareCommand extends Command {
	public constructor() {
		super('compare', {
			category: 'utilities',
			aliases: ['compare'],
			channel: 'guild',
			description: {
				content: 'Compares two Discord message snowflakes.',
				usage: '<first> <second>',
				examples: ['683346835758120974 683382826732748899'],
			},
			clientPermissions: [Permissions.FLAGS.EMBED_LINKS],
			args: [
				{
					id: 'one',
					type: 'string',
					prompt: {
						start: 'what is the first message snowflake?',
						retry: "please provide me with the first snowflake you'd like to compare.",
					},
				},
				{
					id: 'two',
					type: 'string',
					prompt: {
						start: 'what si the second message snowflake?',
						retry: "please provide me with the second snowflake you'd like to compare.",
					},
				},
			],
		});
	}

	private _deconstruct(id: Snowflake): DeconstructedSnowflake {
		return SnowflakeUtil.deconstruct(id);
	}

	private _isFaster(first: number, second: number): string {
		return first > second ? '⚡' : '';
	}

	public async exec(msg: Message, { one, two }: { one: string; two: string }): Promise<Message | Message[] | void> {
		const first = this._deconstruct(one);
		const second = this._deconstruct(two);
		const diff = Math.abs(first.timestamp - second.timestamp);
		const embed = this.client.util
			.embed()
			.setColor(this.client.config.color)
			.setTitle('Snowflake Comparison')
			.setDescription(`\`${ms(diff, { formatSubMilliseconds: true })}\` difference`)
			.addFields(
				{
					name: `${this._isFaster(first.timestamp, second.timestamp)} First Snowflake`,
					value: stripIndents`
					Worker ID: \`${first.workerID}\`
					Process ID: \`${first.processID}\`
					Date: \`${first.date.toLocaleString('en-US', { timeZone: 'America/New_York' })}\`
				`,
				},
				{
					name: `${this._isFaster(second.timestamp, first.timestamp)} Second Snowflake`,
					value: stripIndents`
					Worker ID: \`${second.workerID}\`
					Process ID: \`${first.processID}\`
					Date: \`${first.date.toLocaleString('en-US', { timeZone: 'America/New_York' })}\`
				`,
				},
			);

		return msg.util?.reply({ embed });
	}
}
