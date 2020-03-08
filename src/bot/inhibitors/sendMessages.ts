import { Inhibitor } from 'discord-akairo';
import { Message, Permissions, TextChannel } from 'discord.js';

export default class SendMessagesInhibtor extends Inhibitor {
	public constructor() {
		super('sendMessages', {
			reason: 'sendMessages',
		});
	}

	public async exec(msg: Message): Promise<boolean> {
		if (msg.channel instanceof TextChannel) {
			return !msg.channel.permissionsFor(this.client.user!)!.has(Permissions.FLAGS.SEND_MESSAGES);
		}
		return Promise.resolve(false);
	}
}
