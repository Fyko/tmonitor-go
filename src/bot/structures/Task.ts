/* eslint-disable @typescript-eslint/no-namespace */
import { MessageEmbed, Webhook, Message, SnowflakeUtil } from 'discord.js';
import TwitterAPI, { User, Tweet, UrlEntity, UserMentionEntity } from './TwitterAPI';
import { parse } from 'url';
import MonitorClient from '../client/MonitorClient';
import { stripIndents } from 'common-tags';
import { getRawBinURL, fetchBinURL } from '../util';
import MonitorHandler from './MonitorHandler';
import text from 'twitter-text';

interface TaskOptions {
	monitorHandler: MonitorHandler;
	client: MonitorClient;
	user: User;
	hook: Webhook;
	delay: number;
}

declare module 'twit' {
	namespace Twitter {
		interface Status {
			extended_tweet: {
				full_text: string;
			};
		}
	}
}

export default class Task {
	public options: TaskOptions;

	protected readonly _seenTweetIDs: string[] = [];

	protected monitorHandler: MonitorHandler;

	protected _lastUser: User;

	protected interval!: NodeJS.Timeout;

	public constructor(options: TaskOptions) {
		this.options = options;
		this.monitorHandler = options.monitorHandler;
		this._lastUser = options.user;
	}

	private get client() {
		const keys = this.monitorHandler.keyHandler.keys;
		if (keys) return new TwitterAPI(keys);
		return null;
	}

	public readonly makeAvatar = (str: string): string => str.replace('_normal', '');
	public readonly toLocale = (num: number, locale?: string): string => num.toLocaleString(locale || 'en-US');
	public readonly makeTweetURL = (user: string, tweetID: string): string =>
		`https://twitter.com/${user}/status/${tweetID}`;

	private readonly extractBinURLs = (urls: string[]): string[] =>
		urls.filter(w => ['bin', 'paste'].some(e => w.includes(e)));

	public readonly makeProfileURL = (user: string): string => `https://twitter.com/${user}/`;
	public readonly hyperlinkMentionsAndTags = (str: string) =>
		str
			.replace(/@(\w+)/gm, m => `[${m}](https://twitter.com/${m.slice(1)})`)
			.replace(/#(\w+)/gm, m => `[${m}](https://twitter.com/hashtag/${m.slice(1)})`);

	private readonly makeTweetText = (tweet: Tweet): string =>
		this.hyperlinkMentionsAndTags(
			text.htmlEscape(tweet.extended_tweet?.full_text || tweet.text || tweet.full_text || ''),
		);

	private readonly mapURLs = (urls: UrlEntity[]): string =>
		urls.map(u => `${u.url.replace('https://', '')} => [${parse(u.expanded_url).host}](${u.expanded_url})`).join('\n');

	private readonly mapMentions = (mentions: UserMentionEntity[]): string =>
		mentions.map(m => `- **[${m.name} (@${m.screen_name})](${this.makeProfileURL(m.screen_name)})**`).join('\n');

	private _fetchTimeline() {
		return this.client!.getTimeline({
			screen_name: this.options.user.screen_name,
			include_rts: true,
			exclude_replies: true,
			tweet_mode: 'extended',
		});
	}

	private _sendUserUpdate(embeds: MessageEmbed[], user: User): void {
		const avatar = this.makeAvatar(user.profile_image_url_https);
		this.options.hook
			.send({
				embeds,
				avatarURL: avatar,
				username: user.name,
			})
			.catch(err =>
				this.options.client.logger.error(err, `[WEBHOOK ERROR]: Error when sending ${user.name} user update.`),
			);
	}

	private _checkUser(n: User): void {
		const o = this._lastUser;
		this._lastUser = n;
		if (o.name !== n.name) this._handleUserChange('name', o, n);
		if (o.profile_image_url_https !== n.profile_image_url_https) this._handleUserChange('avatar', o, n);
		if (o.profile_banner_url !== n.profile_banner_url) this._handleUserChange('banner', o, n);
		if (o.description !== n.description) this._handleUserChange('bio', o, n);
		if (o.location !== n.location) this._handleUserChange('location', o, n);
		if (o.protected !== n.protected) this._handleUserChange('protected', o, n);
		if (o.url !== n.url) this._handleUserChange('url', o, n);
	}

	private _handleUserChange(change: string, oldU: User, newU: User): void {
		const avatar = this.makeAvatar(newU.profile_image_url_https);
		const embeds: MessageEmbed[] = [];
		const baseEmbed = this.options.client.util
			.embed()
			.setTimestamp()
			.setFooter('Made with 💖 & 🍵 by Fyko')
			.setAuthor(
				`${newU.name} \~ ${this.toLocale(newU.followers_count)} Followers`,
				avatar,
				this.makeProfileURL(newU.screen_name),
			)
			.setColor(this.options.client.config.color);

		if (change === 'avatar') {
			const embed = new MessageEmbed(baseEmbed)
				.setTitle('User Update: Avatar')
				.setDescription(
					stripIndents`
				**Before**: 👉

				**After**: 👇
			`,
				)
				.setImage(this.makeAvatar(newU.profile_image_url_https))
				.setThumbnail(this.makeAvatar(oldU.profile_image_url_https));
			embeds.push(embed);
		}

		if (change === 'banner') {
			const embed = new MessageEmbed(baseEmbed)
				.setTitle('User Update: Banner')
				.setDescription(
					stripIndents`
				**Before**: 👉

				**After**: 👇
			`,
				)
				.setImage(newU.profile_banner_url)
				.setThumbnail(oldU.profile_banner_url);
			embeds.push(embed);
		}

		if (change === 'name') {
			const embed = new MessageEmbed(baseEmbed).setTitle('User Update: Display Name').setDescription(stripIndents`
				**Before**: ${oldU.name}

				**After**: ${newU.name}
			`);
			embeds.push(embed);
		}

		if (change === 'bio') {
			const embed = new MessageEmbed(baseEmbed)
				.setTitle('User Update: Biography')
				.addFields(
					{ name: '**Before**', value: this.hyperlinkMentionsAndTags(oldU.description) },
					{ name: '**After**', value: this.hyperlinkMentionsAndTags(newU.description) },
				);
			embeds.push(embed);
		}

		if (change === 'location') {
			const embed = new MessageEmbed(baseEmbed).setTitle('User Update: Location').setDescription(stripIndents`
				**Before**: ${oldU.name}

				**After**: ${newU.name}
			`);
			embeds.push(embed);
		}

		if (change === 'protected') {
			const embed = new MessageEmbed(baseEmbed).setTitle('User Update: Privacy');
			if (newU.protected) embed.setDescription(`🔒 ${newU.name} is now **PRIVATE** 🔒`);
			else embed.setDescription(`🔓 ${newU.name} is now **PUBLIC** 🔓`);
			embeds.push(embed);
		}

		if (change === 'url') {
			const embed = new MessageEmbed(baseEmbed).setTitle('User Update: URL').setDescription(stripIndents`
				**Before**: ${oldU.entities.urls[0]?.expanded_url || 'None set.'}

				**After**: ${newU.entities.urls[0]?.expanded_url || 'None set.'}
			`);
			embeds.push(embed);
		}

		return this._sendUserUpdate(embeds, newU);
	}

	private _makeTweetEmbed(t: Tweet): [MessageEmbed, string] {
		const avatar = this.makeAvatar(t.user.profile_image_url_https);
		const embed = new MessageEmbed()
			.setColor(this.options.client.config.color)
			.setFooter('Made with 💖 & 🍵 by Fyko')
			.setTimestamp()
			.setThumbnail(avatar)
			.setAuthor(
				`${t.user.name} \~ ${this.toLocale(t.user.followers_count)} Followers`,
				avatar,
				this.makeProfileURL(t.user.screen_name),
			)
			.setTitle('**New Tweet**')
			.setURL(this.makeTweetURL(t.user.screen_name, t.id_str))
			.setDescription(this.makeTweetText(t));
		if (t.entities?.media?.length) embed.setImage(t.entities.media[0]?.media_url_https);
		if (t.entities?.urls?.length) embed.addFields({ name: '🔗 URLs', value: this.mapURLs(t.entities.urls) });
		if (t.entities?.user_mentions.length)
			embed.addFields({ name: '🔔 Mentioned Users', value: this.mapMentions(t.entities.user_mentions) });

		return [embed, avatar];
	}

	private _makeQuoteEmbed(quotedTweet: Tweet): [MessageEmbed, string] {
		const t = quotedTweet.quoted_status!;
		const avatar = this.makeAvatar(t.user.profile_image_url_https);
		const embed = new MessageEmbed()
			.setColor(this.options.client.config.color)
			.setFooter('Made with 💖 & 🍵 by Fyko')
			.setTimestamp()
			.setThumbnail(avatar)
			.setAuthor(
				`${t.user.name} \~ ${this.toLocale(t.user.followers_count)} Followers`,
				avatar,
				this.makeProfileURL(t.user.screen_name),
			)
			.setTitle('**Quoted Tweet**')
			.setURL(this.makeTweetURL(t.user.screen_name, t.id_str))
			.setDescription(this.makeTweetText(t));
		if (t.entities?.media?.length) embed.setImage(t.entities.media[0]?.media_url_https);
		if (t.entities?.urls?.length) embed.addFields({ name: '🔗 URLs', value: this.mapURLs(t.entities.urls) });
		if (t.entities?.user_mentions.length)
			embed.addFields({ name: '🔔 Mentioned Users', value: this.mapMentions(t.entities.user_mentions) });

		return [embed, avatar];
	}

	private async _request() {
		const [tweets, limit] = await this._fetchTimeline();
		this.options.client.logger.info(`Rate Limit Remaining: ${limit}`);
		console.log(parseInt(limit!, 10));
		if (parseInt(limit!, 10) <= 1) this.monitorHandler.keyHandler.rotate();
		if (!tweets.length) return;

		// handle startup
		if (!this._seenTweetIDs.length) {
			for (const t of tweets) this._seenTweetIDs.push(t.id_str);
		}

		this._checkUser(tweets[0].user);

		for (const t of tweets) {
			if (this._seenTweetIDs.includes(t.id_str)) continue;
			this._seenTweetIDs.push(t.id_str);

			const [quoteEmbed] = t.quoted_status_id ? this._makeQuoteEmbed(t) : [null, null];
			const [embed, avatar] = this._makeTweetEmbed(t);
			const embeds = [embed];
			if (quoteEmbed) embeds.push(quoteEmbed);

			const bins = this.extractBinURLs(t.entities.urls.map(u => u.expanded_url));
			if (bins.length) {
				for (const b of bins) {
					const raw = getRawBinURL(b);
					const text = await fetchBinURL(raw);
					if (text) {
						const embed = new MessageEmbed()
							.setColor(this.options.client.config.color)
							.setTitle('Parsed *bin Content')
							.setDescription(text.substring(0, 2047))
							.setTimestamp();
						embeds.push(embed);
					}
				}
			}

			if (embeds.length <= 10) {
				this.options.hook
					.send({
						embeds,
						avatarURL: avatar,
						username: t.user.name,
					})
					.then((m: Message): void => {
						const deconstructedTweet = SnowflakeUtil.deconstruct(t.id_str);
						const tweetTimestamp = deconstructedTweet.timestamp - 1420070400000 + 1288834974657;
						this.options.client.logger.info(
							`[TWEET]: Processed in ${m.createdTimestamp - tweetTimestamp}ms. Message ID: ${m.id}`,
						);
					})
					.catch(err =>
						this.options.client.logger.error(err, `[WEBHOOK ERROR]: Error when sending ${t.user.name}'s tweet.`),
					);
			}

			const images = t.entities?.media?.map(e => e.media_url_https);
			if (images?.length) {
				const embeds: MessageEmbed[] = [];
				for (const i of images) {
					try {
						const start = Date.now();
						const text = await this.options.client.taskHandler.ocrEngine.recognize(i);
						const stop = Date.now();
						if (text.length) {
							const embed = new MessageEmbed()
								.setColor(this.options.client.config.color)
								.setTitle('OCR Parsed Content')
								.setImage(i)
								.setDescription(text.substring(0, 2047))
								.setFooter(`Took ${stop - start} ms`)
								.setTimestamp();
							embeds.push(embed);
						}
					} catch {}
				}
				if (embeds.length) {
					this.options.hook
						.send({
							embeds,
							avatarURL: avatar,
							username: t.user.name,
						})
						.catch(err =>
							this.options.client.logger.error(err, `[WEBHOOK ERROR]: Error when sending ${t.user.name}'s tweet.`),
						);
				}
			}
		}

		return false;
	}

	public start(): void {
		this._request();
		this.interval = this.options.client.setInterval(() => this._request(), this.options.delay);
	}

	public stop(): void {
		this.options.client.clearTimeout(this.interval);
	}
}
