import fetch from 'node-fetch';
import { parse } from 'url';

export async function postHaste(code: string, lang?: string): Promise<string> {
	try {
		if (code.length > 400 * 1000) {
			return 'Document exceeds maximum length.';
		}
		const res = await fetch('https://paste.nomsy.net/documents', { method: 'POST', body: code });
		const { key, message } = await res.json();
		if (!key) {
			return message;
		}
		return `https://paste.nomsy.net/${key}${lang && `.${lang}`}`;
	} catch (err) {
		throw err;
	}
}

export async function fetchBinURL(url: string): Promise<string | null> {
	try {
		const res = await fetch(url);
		if (res.status === 200) {
			const text = await res.text();
			return text;
		}
	} catch {}
	return null;
}

export function getRawBinURL(url: string) {
	const { host, path } = parse(url);
	return `https://${host}/raw${path}`;
}
