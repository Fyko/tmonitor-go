import { TwitterOptions } from './TwitterAPI';
import MonitorClient from '../client/MonitorClient';

export default class KeyHandler {
	protected client: MonitorClient;

	public readonly _keys: TwitterOptions[];

	public constructor(client: MonitorClient, keys: TwitterOptions[]) {
		this.client = client;
		this._keys = keys;
	}

	public rotate(keys?: TwitterOptions): void {
		if (!keys) keys = this._keys[0];
		const index = this._keys.indexOf(keys);
		if (index > -1) this._keys.splice(index, 1);
		this.client.setTimeout(() => {
			this._keys.push(keys!);
		}, 1000 * 60 * 15);
	}

	public get keys(): TwitterOptions | null {
		if (this._keys.length) return this._keys[0];
		return null;
	}
}
