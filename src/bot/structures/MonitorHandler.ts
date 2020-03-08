import MonitorClient from '../client/MonitorClient';
import { Webhook, TextChannel } from 'discord.js';
import Task from './Task';
import OCR from './OCR';
import KeyHandler from './KeyHandler';
import { KEYS } from '../util/keys';
import { User } from './TwitterAPI';

export default class MonitorHandler {
	protected readonly client: MonitorClient;
	public readonly ocrEngine: OCR;
	public readonly keyHandler: KeyHandler;

	public readonly tasks: Task[] = [];
	protected readonly _ids: string[] = [];

	public constructor(client: MonitorClient) {
		this.client = client;

		this.ocrEngine = new OCR(this.client);
		this.keyHandler = new KeyHandler(this.client, KEYS);

		this.init();
	}

	public get delay() {
		return 1000 / this.keyHandler._keys.length;
	}

	public monitor(user: User, hook: Webhook, duration: number): Task {
		const task = this._createTask(user, hook, duration);
		this._startTask(task);
		return task;
	}

	private _createTask(user: User, hook: Webhook, duration: number): Task {
		const task = new Task({
			monitorHandler: this,
			user,
			hook,
			client: this.client,
			delay: this.delay,
		});

		this.client.setTimeout(() => this.stop(task, true), duration);
		return task;
	}

	public async stop(task: Task, automatic?: boolean): Promise<Task> {
		task.stop();
		const index = this.tasks.indexOf(task);
		if (index) this.tasks.splice(index, 1);
		if (automatic) {
			const embed = this.client.util
				.embed()
				.setTimestamp()
				.setColor(this.client.config.color)
				.setTitle('Monitor Update: Account Removed')
				.setDescription(`The task monitoring \`${task.options.user.screen_name}\` has been stopped automatically!`)
				.setThumbnail(task.options.user.profile_image_url_https.replace('_normal', ''));
			const channel = this.client.channels.cache.get(task.options.hook.channelID);
			if (channel instanceof TextChannel) await channel.send({ embed });
		}

		return task;
	}

	private _startTask(task: Task): Task {
		task.start();
		this.tasks.push(task);

		return task;
	}

	private init() {
		this.ocrEngine.init();
	}
}
