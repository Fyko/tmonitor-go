import { Listener } from 'discord-akairo';
import { ActivityType, Constants } from 'discord.js';

export interface ReactionStatus {
	text: string;
	type: ActivityType;
}

export default class ReadyListener extends Listener {
	public constructor() {
		super(Constants.Events.CLIENT_READY, {
			category: 'client',
			emitter: 'client',
			event: Constants.Events.CLIENT_READY,
		});
	}

	public async exec(): Promise<void> {
		this.client.logger.info(`[READY] ${this.client.user!.tag} is ready to rock.`);

		for (const id of this.client.guilds.cache.keys()) {
			const existing = this.client.settings.cache.guilds.get(id);
			if (!existing) await this.client.settings.new('guild', { id });
		}

		await this.client.user?.setActivity(`giveawaybot.fun | gguide 🎉`, { type: 'WATCHING' });

		setInterval(async () => {
			for (const g2 of this.client.guilds.cache.values()) {
				g2.presences.cache.clear();
			}
		}, 1000 * 60 * 10);
	}
}
