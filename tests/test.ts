/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import Twit, { Twitter } from 'twit';
import { MessageEmbed, WebhookClient } from 'discord.js';
import signale from 'signale';
import { parse } from 'url';

const webhook = new WebhookClient(
	'680276645407358977',
	'zF46pIpjfMHDyWc5FUbDmpqPjQTE8W72WDe71V0WdF0MuboD_qOG86XIX5GpWNF2cYsK',
);

declare module 'twit' {
	namespace Twitter {
		interface Status {
			extended_tweet: {
				full_text: string;
			};
		}
	}
}

const _ids: string[] = [];

const client = new Twit({
	consumer_key: 'xc2zsZZk7I1haPUtFRqyu09Mk',
	consumer_secret: 'IFkTeUXNPixXtH6xahsTJl3Zy2GgXcdbxBAao4W09cgCv2GXBk',
	access_token: '939987961071919104-1QLvITleQVHRKnTT5ZKqK6RHWwoeYaW',
	access_token_secret: 'PoEXWP2s7boGRpyP4XUPD6ZpGSzG03U0zKkyqdjyvOBjm',
});

const makeAvatar = (str: string): string => str.replace('_normal', '');
const toLocale = (num: number, locale?: string): string => num.toLocaleString(locale || 'en-US');
const makeTweetURL = (user: string, tweetID: string): string => `https://twitter.com/${user}/status/${tweetID}`;
const makeProfileURL = (user: string): string => `https://twitter.com/${user}/`;
const makeTweetText = (tweet: Twitter.Status): string =>
	(tweet.extended_tweet?.full_text || tweet.text || tweet.full_text || '')
		.replace(/@(\w+)/gm, m => `[${m}](https://twitter.com/${m.slice(1)})`)
		.replace(/#(\w+)/gm, m => `[${m}](https://twitter.com/hashtag/${m.slice(1)})`);
const mapURLs = (urls: Twitter.UrlEntity[]): string =>
	urls.map(u => `${u.url.replace('https://', '')} => [${parse(u.expanded_url).host}](${u.expanded_url})`).join('\n');

const mapMentions = (mentions: Twitter.UserMentionEntity[]): string =>
	mentions.map(m => `- **[${m.name} (@${m.screen_name})](${makeProfileURL(m.screen_name)})**`).join('\n');

// const getATweet = async (): Promise<Twitter.Status> => {
// 	const get = await client.get('statuses/show', {
// 		id: '1230719245236895744',
// 		include_entities: true,
// 		include_user_entities: true,
// 		tweet_mode: 'extended',
// 	});
// 	// @ts-ignore
// 	return get.data as Tweet;
// };

const makeEmbed = (t: Twitter.Status) => {
	const avatar = makeAvatar(t.user.profile_image_url_https);
	const embed = new MessageEmbed()
		.setColor('NAVY')
		.setFooter('Made with 💖 & 🍵 by Fyko')
		.setTimestamp()
		.setThumbnail(avatar)
		.setAuthor(
			`${t.user.name} \~ ${toLocale(t.user.followers_count)} Followers`,
			avatar,
			makeProfileURL(t.user.screen_name),
		)
		.setTitle('**New Tweet**')
		.setURL(makeTweetURL(t.user.screen_name, t.id_str))
		.setDescription(makeTweetText(t));
	if (t.entities?.media?.length) embed.setImage(t.entities.media[0]?.media_url_https);
	if (t.entities?.urls?.length) embed.addField('🔗 URLs', mapURLs(t.entities.urls));
	if (t.entities?.user_mentions.length) embed.addField('🔔 Mentioned Users', mapMentions(t.entities.user_mentions));

	return embed;
};

const fetch = async (screen_name: string) => {
	const fetch = await client.get('statuses/user_timeline', {
		screen_name,
		include_rts: false,
		exclude_replies: true,
		tweet_mode: 'extended',
	});
	signale.debug(`Recieved code ${fetch.resp.statusCode}.`);
	const tweets = fetch.data as Twitter.Status[];

	// handle startup
	if (!_ids.length) {
		for (const t of tweets) _ids.push(t.id_str);
		return signale.success(`Filled cache with old tweet IDs.`);
	}

	for (const t of tweets) {
		if (_ids.includes(t.id_str)) continue;
		_ids.push(t.id_str);
		signale.success(`New tweet from ${t.user.name}! Processing...`);
		const avatar = makeAvatar(t.user.profile_image_url_https);
		const embed = makeEmbed(t);
		await webhook.send({ embeds: [embed], avatarURL: avatar, username: t.user.name });
	}
};

(async () => {
	await fetch('GhostAIO');
	setInterval(() => fetch('GhostAIO'), 500);
})();

// (async () => {
// 	const tweet = await getATweet();
// 	return console.dir(tweet);
// })();
