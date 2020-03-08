import { AkairoClient, CommandHandler, InhibitorHandler, ListenerHandler } from 'discord-akairo';
import { ColorResolvable, Message, WebhookClient } from 'discord.js';
import { join } from 'path';
import { Logger as WinstonLogger } from 'winston';
import SettingsProvider from '../../database/structures/SettingsProvider';
import { Logger } from '../util/constants';
import MonitorHandler from '../structures/MonitorHandler';
import Twitter from '../structures/TwitterAPI';
import { KEYS } from '../util/keys';

declare module 'discord-akairo' {
	interface AkairoClient {
		logger: WinstonLogger;
		commandHandler: CommandHandler;
		config: MonitorOptions;
		twitter: Twitter;
		settings: SettingsProvider;
		taskHandler: MonitorHandler;
	}
}

interface MonitorOptions {
	token: string;
	owners: string | string[];
	color: ColorResolvable;
}

export default class MonitorClient extends AkairoClient {
	public constructor(config: MonitorOptions) {
		super({
			disabledEvents: ['TYPING_START', 'PRESENCE_UPDATE'],
			messageCacheMaxSize: 50,
			messageCacheLifetime: 300,
			messageSweepInterval: 900,
			ownerID: config.owners,
			partials: ['MESSAGE'],
		});

		this.config = config;

		this.listenerHandler.on('load', i =>
			this.logger.debug(`[LISTENER HANDLER] [${i.category.id.toUpperCase()}] Loaded ${i.id} listener!`),
		);
	}

	public readonly config: MonitorOptions;

	public readonly devlog: WebhookClient = new WebhookClient(process.env.LOG_ID!, process.env.LOG_TOKEN!);

	public logger: WinstonLogger = Logger;

	public commandHandler: CommandHandler = new CommandHandler(this, {
		directory: join(__dirname, '..', 'commands'),
		prefix: (msg: Message): string => {
			if (msg.guild) {
				const req = this.settings.cache.guilds.get(msg.guild.id);
				if (req?.prefix) return req?.prefix;
			}
			return 'tm!';
		},
		aliasReplacement: /-/g,
		allowMention: true,
		handleEdits: true,
		commandUtil: true,
		commandUtilLifetime: 3e5,
		defaultCooldown: 3000,
		argumentDefaults: {
			prompt: {
				modifyStart: (msg: Message, str: string) =>
					`${msg.author}, ${str}\n...or type \`cancel\` to cancel this command.`,
				modifyRetry: (msg: Message, str: string) =>
					`${msg.author}, ${str}\n... or type \`cancel\` to cancel this command.`,
				timeout: 'You took too long. Command cancelled.',
				ended: 'You took more than 3 tries! Command canclled',
				cancel: 'Sure thing, command cancelled.',
				retries: 3,
				time: 60000,
			},
			otherwise: '',
		},
	});

	public inhibitorHandler: InhibitorHandler = new InhibitorHandler(this, {
		directory: join(__dirname, '..', 'inhibitors'),
	});

	public listenerHandler: ListenerHandler = new ListenerHandler(this, {
		directory: join(__dirname, '..', 'listeners'),
	});

	public readonly settings: SettingsProvider = new SettingsProvider(this);

	public readonly taskHandler: MonitorHandler = new MonitorHandler(this);

	public readonly twitter: Twitter = new Twitter(KEYS[0]!);

	private async load(): Promise<void> {
		this.listenerHandler.setEmitters({
			commandHandler: this.commandHandler,
			inhibitorHandler: this.inhibitorHandler,
			listenerHandler: this.listenerHandler,
			shard: this,
		});

		this.commandHandler.useInhibitorHandler(this.inhibitorHandler);
		this.commandHandler.useListenerHandler(this.listenerHandler);

		this.listenerHandler.loadAll();
		this.commandHandler.loadAll();
		this.inhibitorHandler.loadAll();
	}

	public async launch(): Promise<string> {
		await this.load();
		await this.settings.init();
		return this.login(this.config.token);
	}
}
