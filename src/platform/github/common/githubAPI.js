"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeGitHubAPIRequest = makeGitHubAPIRequest;
async function makeGitHubAPIRequest(fetcherService, logService, telemetry, host, routeSlug, method, token, body) {
    const headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetcherService.fetch(`${host}/${routeSlug}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
        return undefined;
    }
    try {
        const result = await response.json();
        const rateLimit = Number(response.headers.get('x-ratelimit-remaining'));
        const logMessage = `[RateLimit] REST rate limit remaining: ${rateLimit}, ${routeSlug}`;
        if (rateLimit < 1000) {
            // Danger zone
            logService.warn(logMessage);
            telemetry.sendMSFTTelemetryEvent('githubAPI.approachingRateLimit', { rateLimit: rateLimit.toString() });
        }
        else {
            logService.debug(logMessage);
        }
        return result;
    }
    catch {
        return undefined;
    }
}
//# sourceMappingURL=githubAPI.js.map