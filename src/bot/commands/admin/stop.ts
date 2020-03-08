import { Command } from 'discord-akairo';
import { Message, Permissions, TextChannel } from 'discord.js';

export default class StopCommand extends Command {
	public constructor() {
		super('stop', {
			category: 'admin',
			channel: 'guild',
			aliases: ['stop', 's'],
			description: {
				content: 'Stops a monitor',
				usage: '<user>',
				examples: ['cybersole', 'kodaiaio'],
			},
			args: [
				{
					id: 'user',
					type: 'string',
					prompt: {
						start: "what user's monitor would you like to stop?",
						retry: "please provide a valid user you'd like to stop a monitor for.",
					},
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

	public async exec(msg: Message, { user }: { user: string }): Promise<Message | Message[] | void> {
		const task = this.client.taskHandler.tasks.find(
			t => t.options.user.screen_name.toLowerCase() === user.toLowerCase(),
		);
		if (!task) return msg.util?.reply(`sorry pal, I coudln't find a task for \`${user}\`!`);
		this.client.taskHandler.stop(task);
		const embed = this.client.util
			.embed()
			.setTimestamp()
			.setColor(this.client.config.color)
			.setTitle('Monitor Update: Account Removed')
			.setDescription(`The task monitoring \`${task.options.user.screen_name}\` has been stopped by ${msg.author}!`)
			.setThumbnail(task.options.user.profile_image_url_https.replace('_normal', ''));
		const channel = this.client.channels.cache.get(task.options.hook.channelID);
		if (channel instanceof TextChannel) await channel.send({ embed });
		return msg.util?.send(`you got it! ${task.options.user.name}'s task has been stopped!`);
	}
}
