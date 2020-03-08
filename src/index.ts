import { config } from 'dotenv';
import { resolve } from 'path';
import MonitorClient from './bot/client/MonitorClient';
config({ path: resolve(__dirname, '..', '.env') });

const client = new MonitorClient({
	token: process.env.TOKEN!,
	color: process.env.COLOR!,
	owners: process.env.OWNERS!.split(','),
});

client.launch().catch(err => {
	client.logger.error(err);
	process.exit(1);
});
