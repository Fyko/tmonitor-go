import { createWorker, Worker } from 'tesseract.js';
import MonitorClient from '../client/MonitorClient';

export default class OCR {
	protected readonly client: MonitorClient;
	protected readonly _worker: Worker;

	public constructor(client: MonitorClient) {
		this.client = client;

		this._worker = createWorker();
	}

	public async recognize(image: Tesseract.ImageLike): Promise<string> {
		const recog = await this._worker.recognize(image);
		return recog.data.text;
	}

	public async init(): Promise<this> {
		await this._worker.load();
		await this._worker.loadLanguage('eng');
		await this._worker.initialize('eng');

		return this;
	}
}
