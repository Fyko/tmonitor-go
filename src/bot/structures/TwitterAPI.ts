/* https://github.com/OliverJAsh/oauth-authorization-header */
import fetch, { Response } from 'node-fetch';
import { getOAuthAuthorizationHeader, OAuthOptions } from 'oauth-authorization-header';
import * as querystring from 'querystring';

export default class Twitter {
	protected options: TwitterOptions;

	protected readonly baseURL = 'https://api.twitter.com/1.1';

	public constructor(options: TwitterOptions) {
		this.options = options;
	}

	public async get(options: RequestOptions): Promise<Response> {
		const request = await this._request({ ...options, method: 'GET' });
		return request;
	}

	public async post(options: RequestOptions): Promise<Response> {
		const request = await this._request({ ...options, method: 'POST' });
		return request;
	}

	public async delete(options: RequestOptions): Promise<Response> {
		const request = await this._request({ ...options, method: 'DELETE' });
		return request;
	}

	public async patch(options: RequestOptions): Promise<Response> {
		const request = await this._request({ ...options, method: 'PATCH' });
		return request;
	}

	public async getUser(params: UserShowParams): Promise<User> {
		try {
			const request = await this.get({
				url: '/users/show',
				queryParams: params,
			});
			const json = await request.json();
			return json as User;
		} catch (err) {
			throw err;
		}
	}

	public async getTimeline(params: TimelineShowParams): Promise<[Tweet[], string | null]> {
		try {
			const request = await this.get({
				url: '/statuses/user_timeline',
				queryParams: params,
			});
			const json = await request.json();
			return [json as Tweet[], request.headers.get('x-rate-limit-remaining')];
		} catch (err) {
			throw err;
		}
	}

	private async _request(options: _InternalRequestOptions): Promise<Response> {
		const { method, queryParams } = options;
		const baseUrl = `${this.baseURL}${options.url}.json`;
		const paramsStr = Object.keys(queryParams).length > 0 ? `?${querystring.stringify(queryParams)}` : '';
		const url = `${baseUrl}${paramsStr}`;

		const header = this._makeHeader({
			oAuth: {
				consumerKey: this.options.api_key,
				consumerSecret: this.options.api_secret,
				token: this.options.access_token,
				tokenSecret: this.options.access_token_secret,
			},
			url,
			method,
			queryParams,
		});

		return fetch(url, {
			method,
			headers: {
				Authorization: header,
			},
		});
	}

	private _makeHeader(options: MakeHeaderOptions): string {
		const { oAuth, url, method, queryParams } = options;
		return getOAuthAuthorizationHeader({
			oAuth,
			url,
			method,
			queryParams,
			formParams: {},
		});
	}
}

export type Method = 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'UPDATE';

export interface TwitterOptions {
	api_key: string;
	api_secret: string;
	access_token: string;
	access_token_secret: string;
}

export interface MakeHeaderOptions {
	oAuth: OAuthOptions;
	url: string;
	method: Method;
	queryParams: {};
}

// eslint-disable-next-line @typescript-eslint/class-name-casing
export interface _InternalRequestOptions {
	url: string;
	method: Method;
	queryParams: {};
}

export interface RequestOptions {
	url: string;
	queryParams: {};
}

export type ResultType = 'mixed' | 'popular' | 'recent';

/**
 * The User interface.
 * @see @see https://dev.twitter.com/overview/api/users
 */
export interface User {
	id: number;
	int_str: string;
	name: string;
	screen_name: string;
	location: string;
	url: string | null;
	entities: Entities;
	description: string;
	protected: boolean;
	verified: boolean;
	followers_count: number;
	friends_count: number;
	listed_count: string;
	created_at: string;
	profile_banner_url: string;
	profile_image_url_https: string;
	default_profile: boolean;
	default_profile_image: boolean;
	withheld_in_countries: string;
	withheld_scope: string;
}

/**
 * Tweet contributors interface.
 * @see https://dev.twitter.com/overview/api/tweets#obj-contributors
 */
export interface Contributors {
	id: number;
	id_str: string;
	screen_name: string;
}

/**
 * @see https://dev.twitter.com/overview/api/entities
 */
export interface HashtagEntity {
	indices: [number, number];
	text: string;
}

export interface Size {
	h: number;
	w: number;
	resize: 'crop' | 'fit';
}

export interface Sizes {
	thumb: Size;
	large: Size;
	medium: Size;
	small: Size;
}

export interface MediaEntity {
	id: number;
	id_str: string;
	indices: [number, number];
	url: string;
	display_url: string;
	expanded_url: string;
	media_url: string;
	media_url_https: string;
	sizes: Sizes;
	source_status_id: number;
	source_status_id_str: string;
	type: string;
}

export interface UrlEntity {
	url: string;
	display_url: string;
	expanded_url: string;
	indices: [number, number];
}

export interface UserMentionEntity {
	id: number;
	id_str: string;
	indices: [number, number];
	name: string;
	screen_name: string;
}

export interface Entities {
	hashtags: HashtagEntity[];
	media: MediaEntity[];
	urls: UrlEntity[];
	user_mentions: UserMentionEntity[];
}

/**
 * @see https://dev.twitter.com/overview/api/places
 */
export interface PlaceAttribute {
	street_address: string;
	locality: string;
	region: string;
	iso3: string;
	postal_code: string;
	phone: string;
	twitter: string;
	url: string;
	'app:id': string;
}
export interface Place {
	geometry: GeoJSON.Point;
	attributes: PlaceAttribute;
	bounding_box: GeoJSON.Polygon;
	contained_within: Place[];
	country: string;
	country_code: string;
	full_name: string;
	id: string;
	name: string;
	place_type: string;
	url: string;
}

/**
 * @see https://dev.twitter.com/overview/api/tweets
 */
export interface Tweet {
	id: number;
	id_str: string;
	annotations?: Record<string, any>;
	contributors?: Contributors[];
	coordinates?: GeoJSON.Point;
	created_at: string;
	current_user_retweet?: {
		id: number;
		id_str: string;
	};
	entities: Entities;
	favorite_count?: number;
	favorited?: boolean;
	filter_level: 'none' | 'low' | 'medium';
	geo?: Record<string, any>;
	in_reply_to_screen_name?: string;
	in_reply_to_status_id?: number;
	in_reply_to_status_id_str?: string;
	in_reply_to_user_id?: number;
	in_reply_to_user_id_str?: string;
	lang?: string;
	place?: Place;
	possibly_sensitive?: boolean;
	quoted_status_id?: number;
	quoted_status_id_str?: string;
	quoted_status?: Tweet;
	scopes?: Record<string, any>;
	retweet_count: number;
	retweeted: boolean;
	retweeted_status?: Tweet;
	source?: string;
	text?: string;
	full_text?: string;
	extended_tweet: {
		full_text: string;
	};
	truncated: boolean;
	user: User;
	withheld_copyright?: boolean;
	withheld_in_countries?: string[];
	withheld_scope?: string;
	display_text_range?: [number, number];
}
export interface Metadata {
	max_id?: number;
	since_id?: number;
	refresh_url?: string;
	next_results?: string;
	count?: number;
	completed_in?: number;
	since_id_str?: string;
	query?: string;
	max_id_str?: string;
}

export interface Errors {
	errors: {
		code: number;
		message: string;
	}[];
}

export interface SearchResults {
	statuses: Tweet[];
	search_metadata: Metadata;
}

/**
 * Params for the users/show endpoint
 * @see https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/api-reference/get-users-show#parameters
 */
export interface UserShowParams {
	user_id?: string | number;
	screen_name?: string;
	include_entities?: boolean;
}

/**
 * Params for the status/user_timeline endpoint
 * @see https://developer.twitter.com/en/docs/tweets/timelines/api-reference/get-statuses-user_timeline#parameters
 */
export interface TimelineShowParams {
	user_id?: string | number;
	screen_name?: string;
	since_id?: string | number;
	count?: number;
	max_id?: number | string;
	trim_user?: boolean;
	exclude_replies?: boolean;
	include_rts?: boolean;
	tweet_mode?: string;
}
