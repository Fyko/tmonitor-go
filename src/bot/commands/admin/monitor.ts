import { Command } from 'discord-akairo';
import { Message, Permissions, TextChannel } from 'discord.js';
import ms from 'ms';

export default class MonitorCommand extends Command {
	public constructor() {
		super('monitor', {
			category: 'admin',
			channel: 'guild',
			aliases: ['monitor', 'monit'],
			description: {
				content:
					'Starts monitoring a user in a specific channel. If no duration is provided, it will default to 10 minutes.',
				usage: '<user> <channel> [duration]',
				examples: ['cybersole #cyber-restock 1h', 'kodaiaio #kodai-restock 45m'],
			},
			args: [
				{
					id: 'user',
					type: 'string',
					prompt: {
						start: 'what user would you like to monitor?',
						retry: "please provide a valid user you'd like to monitor.",
					},
				},
				{
					id: 'channel',
					type: 'textChannel',
					prompt: {
						start: 'what channel would you like to post tweets and user-updates to?',
						retry: 'please provide a valid text-channel within this server.',
					},
				},
				{
					id: 'duration',
					type: (_: Message, str: string): number | null => {
						if (!str) return null;
						const duration = ms(str);
						if (duration && duration >= 3000 && !isNaN(duration)) return duration;
						return null;
					},
					prompt: {
						start: 'how long would you like to monitor this user?',
						retry: "please provide a valid duration for how long you'd like to monitor this user. `10m`, for example.",
						optional: true,
					},
					default: 1000 * 60 * 10, // 10 minutes
				},
			],
		});
	}

	// @ts-ignore
	public userPermissions(msg: Message): string | null {
		const guild = this.client.settings.cache.guilds.get(msg.guild!.id);
		if (
			msg.member!.permissions.has(Permissions.FLAGS.ADMINISTRATOR) ||
			(guild && msg.member!.roles.cache.has(guild.manager))
		)
			return null;
		return 'notMaster';
	}

	public async exec(
		msg: Message,
		{ user, channel, duration }: { user: string; channel: TextChannel; duration: number },
	): Promise<Message | Message[] | void> {
		const fetchedUser = await this.client.twitter.getUser({ screen_name: user }).catch((err: Error) => err);
		if (fetchedUser instanceof Error)
			return msg.util?.reply(`an error occurred when trying to fetch that user. Error: \`${fetchedUser}\`.`);
		if (!fetchedUser) return msg.util?.reply(`I couldn't find a user with the name \`${user}\`.`);

		if (!channel.permissionsFor(this.client.user?.id!)?.has('MANAGE_WEBHOOKS'))
			return msg.util?.reply(`I don't have permissions to fetch the webhooks in ${channel}!`);
		const webhooks = await channel.fetchWebhooks();
		const hook = webhooks.first() || (await channel.createWebhook('Twitter Monitor'));

		this.client.taskHandler.monitor(fetchedUser, hook, duration);

		const embed = this.client.util
			.embed()
			.setColor(this.client.config.color)
			.setTitle('Monitor Update: Account Added')
			.setDescription(
				`[${fetchedUser.name}](https://twitter.com/${fetchedUser.screen_name}) is now being monitored for ${ms(
					duration,
					{ long: true },
				)}!`,
			)
			.setThumbnail(fetchedUser.profile_image_url_https.replace('_normal', ''))
			.addFields({ name: 'Added by', value: msg.author })
			.setTimestamp();

		await channel.send({ embed });

		return msg.util?.reply(
			`successfully started monitor task for \`${fetchedUser.name}\` in ${channel} for ${ms(duration, { long: true })}`,
		);
	}
}
