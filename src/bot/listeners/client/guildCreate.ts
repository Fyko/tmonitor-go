import { Listener } from 'discord-akairo';
import { Guild, Constants } from 'discord.js';

export default class GuildCreateListener extends Listener {
	public constructor() {
		super(Constants.Events.GUILD_CREATE, {
			category: 'client',
			emitter: 'client',
			event: Constants.Events.GUILD_CREATE,
		});
	}

	public async exec(guild: Guild): Promise<void> {
		this.client.logger.info(`[NEW GUILD] Joined ${guild.name} with ${guild.memberCount} members.`);
		const existing = this.client.settings.cache.guilds.get(guild.id);
		if (!existing) this.client.settings.new('guild', { id: guild.id });
	}
}
