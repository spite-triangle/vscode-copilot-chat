/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Readable } from 'stream';
import { IEnvService } from '../../env/common/envService';
import { FetchOptions, IAbortController, Response } from '../common/fetcherService';
import { IFetcher, userAgentLibraryHeader } from '../common/networking';

export abstract class BaseFetchFetcher implements IFetcher {

	constructor(
		private readonly _fetchImpl: typeof fetch | typeof import('electron').net.fetch,
		private readonly _envService: IEnvService,
		private readonly userAgentLibraryUpdate?: (original: string) => string,
	) {
	}

	abstract getUserAgentLibrary(): string;

	async fetch(url: string, options: FetchOptions): Promise<Response> {
		const headers = { ...options.headers };
		headers['User-Agent'] = `GitHubCopilotChat/${this._envService.getVersion()}`;
		headers[userAgentLibraryHeader] = this.userAgentLibraryUpdate ? this.userAgentLibraryUpdate(this.getUserAgentLibrary()) : this.getUserAgentLibrary();

		let body = options.body;
		if (options.json) {
			if (options.body) {
				throw new Error(`Illegal arguments! Cannot pass in both 'body' and 'json'!`);
			}
			headers['Content-Type'] = 'application/json';
			body = JSON.stringify(options.json);
		}

		const method = options.method || 'GET';
		if (method !== 'GET' && method !== 'POST') {
			throw new Error(`Illegal arguments! 'method' must be either 'GET' or 'POST'!`);
		}

		const signal = options.signal ?? new AbortController().signal;
		if (signal && !(signal instanceof AbortSignal)) {
			throw new Error(`Illegal arguments! 'signal' must be an instance of AbortSignal!`);
		}

		return this._fetch(url, method, headers, body, signal);
	}

	private async _fetch(url: string, method: 'GET' | 'POST', headers: { [name: string]: string }, body: string | undefined, signal: AbortSignal): Promise<Response> {
		const resp = await this._fetchImpl(url, { method, headers, body, signal });
		return new Response(
			resp.status,
			resp.statusText,
			resp.headers,
			() => resp.text(),
			() => resp.json(),
			async () => {
				if (!resp.body) {
					return Readable.from([]);
				}
				return Readable.fromWeb(resp.body);
			}
		);
	}

	async disconnectAll(): Promise<void> {
		// Nothing to do
	}
	makeAbortController(): IAbortController {
		return new AbortController();
	}
	isAbortError(e: any): boolean {
		// see https://github.com/nodejs/node/issues/38361#issuecomment-1683839467
		return e && e.name === "AbortError";
	}
	abstract isInternetDisconnectedError(e: any): boolean;
	abstract isFetcherError(e: any): boolean;
	getUserMessageForFetcherError(err: any): string {
		return `Please check your firewall rules and network connection then try again. Error Code: ${err.message}.`;
	}
}
