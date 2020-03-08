import { Listener, Command, Constants } from 'discord-akairo';
import { Message } from 'discord.js';

export default class CommandStartedListener extends Listener {
	public constructor() {
		super(Constants.CommandHandlerEvents.COMMAND_STARTED, {
			category: 'commandHandler',
			emitter: 'commandHandler',
			event: Constants.CommandHandlerEvents.COMMAND_STARTED,
		});
	}

	public exec(msg: Message, command: Command): void {
		if (msg.util!.parsed!.command) return;
		const where = msg.guild ? msg.guild.name : msg.author.tag;
		this.client.logger.info(`[COMMAND STARTED] ${command.id} in ${where}`);
	}
}
