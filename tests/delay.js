const Twitter = require('../dist/bot/structures/TwitterAPI');
const { KEYS } = require('../dist/bot/util/keys');

const key = KEYS[0];

const client = new Twitter.default(key);

(async () => {
	const user = await client.getUser({ screen_name: 'fykowo' });
	console.dir(user);
})()