

# 锁定 token

写死 `token` 验证，**且需要调大 `expires_at` 配置，防止`token` 过期**


```ts
// src\platform\authentication\node\copilotTokenManager.ts
    private async doAuthFromGitHubTokenOrDevDeviceId(
        context: { githubToken: string; ghUsername: string } | { devDeviceId: string }
    ): Promise<TokenInfoOrError & NotGitHubLoginFailed> {
        this._telemetryService.sendGHTelemetryEvent('auth.new_login');

		let response1, userInfo, ghUsername;
		try {
			if ('githubToken' in context) {
				ghUsername = context.ghUsername;
				[response1, userInfo] = (await Promise.all([
					this.fetchCopilotTokenFromGitHubToken(context.githubToken),
					this.fetchCopilotUserInfo(context.githubToken)
				]));
			} else {
				response1 = await this.fetchCopilotTokenFromDevDeviceId(context.devDeviceId);
			}

			if (!response1) {
				this._logService.warn('Failed to get copilot token');
				this._telemetryService.sendGHTelemetryErrorEvent('auth.request_failed');
				return { kind: 'failure', reason: 'FailedToGetToken' };
			}
			let json = await response1.json();
			this._logService.debug(`${JSON.stringify(json)}`);
		} catch {

		}


		let config = vscode.workspace.getConfiguration('github.copilot.baseModel');
		let apiurl = config.has('url') ? config.get('url') : "https://api.individual.githubcopilot.com";

		// NOTE - TOKEN 验证
		let data = JSON.parse(`
		{
			"annotations_enabled": false,
			"blackbird_clientside_indexing": false,
			"chat_enabled": true,
			"chat_jetbrains_enabled": false,
			"code_quote_enabled": false,
			"code_review_enabled": false,
			"codesearch": false,
			"copilotignore_enabled": false,
			"endpoints": {
				"api": "${apiurl}",
				"origin-tracker": "https://origin-tracker.individual.githubcopilot.com",
				"proxy": "https://proxy.individual.githubcopilot.com",
				"telemetry": "https://telemetry.individual.githubcopilot.com"
			},
			"expires_at": 2760850265,
			"individual": false,
			"prompt_8k": true,
			"public_suggestions": "disabled",
			"refresh_in": 300,
			"sku": "free_limited_copilot",
			"snippy_load_test_enabled": false,
			"telemetry": "disabled",
			"token": "tid=70b36c9e-ea08-48c2-b28e-0dd535b39982;exp=1760850265;sku=free_limited_copilot;proxy-ep=proxy.individual.githubcopilot.com;st=dotcom;chat=1;malfil=1;agent_mode=1;mcp=1;8kp=1;ip=103.135.103.18;asn=AS38136:55183d53996e868667171d1850e50f4b318ee14f91da013658423649da8279e9",
			"tracking_id": "70b36c9e-ea08-48c2-b28e-0dd535b39982",
			"vsc_electron_fetcher_v2": false,
			"xcode": false,
			"xcode_chat": false
		}
		`);

		let response2 = new Response(200,
			"",
			new Map(),
			() => {
				return Promise.resolve(JSON.stringify(data));;
			},
			() => {
				return Promise.resolve(data);
			},
			() => {
				return Promise.resolve(data);
			}
		);

		let response = response2;

        // ...
    }
```

# 模型配置

## 全部模型获取

写死模型配置，**写死的模型配置并不能被使用，只是为了让代码运行通过**

```js
// src\platform\endpoint\node\modelMetadataFetcher.ts
    private async _fetchModels(force?: boolean): Promise<void> {
		if (!force && !this._shouldRefreshModels()) {
			return;
		}
		const requestStartTime = Date.now();

		const copilotToken = (await this._authService.getCopilotToken()).token;
		const requestId = generateUuid();
		const requestMetadata = { type: RequestType.Models, isModelLab: this._isModelLab };

		try {
			// const response = await getRequest(
			// 	this._fetcher,
			// 	this._telemetryService,
			// 	this._capiClientService,
			// 	requestMetadata,
			// 	copilotToken,
			// 	await createRequestHMAC(process.env.HMAC_SECRET),
			// 	'model-access',
			// 	requestId,
			// );

			// this._lastFetchTime = Date.now();
			// this._logService.info(`Fetched model metadata in ${Date.now() - requestStartTime}ms ${requestId}`);

			// if (response.status < 200 || response.status >= 300) {
			// 	// If we're rate limited and have models, we should just return
			// 	if (response.status === 429 && this._familyMap.size > 0) {
			// 		this._logService.warn(`Rate limited while fetching models ${requestId}`);
			// 		return;
			// 	}
			// 	throw new Error(`Failed to fetch models (${requestId}): ${(await response.text()) || response.statusText || `HTTP ${response.status}`}`);
			// }

			this._familyMap.clear();

			let models = JSON.parse(`
				    [
						{
							"auto": true,
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-5-mini",
								"limits": {
									"max_context_window_tokens": 264000,
									"max_output_tokens": 64000,
									"max_prompt_tokens": 127988,
									"vision": {
										"max_prompt_image_size": 3145728,
										"max_prompt_images": 1,
										"supported_media_types": [
											"image/jpeg",
											"image/png",
											"image/webp",
											"image/gif"
										]
									}
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"structured_outputs": true,
									"tool_calls": true,
									"vision": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-5-mini",
							"is_chat_default": true,
							"is_chat_fallback": false,
							"model_picker_category": "lightweight",
							"model_picker_enabled": false,
							"name": "GPT-5 mini",
							"object": "model",
							"policy": {
								"state": "enabled",
								"terms": "Enable access to the latest GPT-5 mini model from OpenAI. [Learn more about how GitHub Copilot serves GPT-5 mini](https://gh.io/copilot-openai)."
							},
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-5-mini"
						},
						{
							"billing": {
								"is_premium": true,
								"multiplier": 1,
								"restricted_to": [
									"pro",
									"pro_plus",
									"max",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-5",
								"limits": {
									"max_context_window_tokens": 264000,
									"max_output_tokens": 64000,
									"max_prompt_tokens": 127988,
									"vision": {
										"max_prompt_image_size": 3145728,
										"max_prompt_images": 1,
										"supported_media_types": [
											"image/jpeg",
											"image/png",
											"image/webp",
											"image/gif"
										]
									}
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"structured_outputs": true,
									"tool_calls": true,
									"vision": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-5",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_category": "versatile",
							"model_picker_enabled": false,
							"name": "GPT-5",
							"object": "model",
							"policy": {
								"state": "enabled",
								"terms": "Enable access to the latest GPT-5 model from OpenAI. [Learn more about how GitHub Copilot serves GPT-5](https://gh.io/copilot-openai)."
							},
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-5"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-3.5-turbo",
								"limits": {
									"max_context_window_tokens": 16384,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 13918
								},
								"object": "model_capabilities",
								"supports": {
									"streaming": true,
									"tool_calls": true
								},
								"tokenizer": "cl100k_base",
								"type": "chat"
							},
							"id": "gpt-3.5-turbo",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT 3.5 Turbo",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-3.5-turbo-0613"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-3.5-turbo",
								"limits": {
									"max_context_window_tokens": 16384,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 13918
								},
								"object": "model_capabilities",
								"supports": {
									"streaming": true,
									"tool_calls": true
								},
								"tokenizer": "cl100k_base",
								"type": "chat"
							},
							"id": "gpt-3.5-turbo-0613",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT 3.5 Turbo",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-3.5-turbo-0613"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4o-mini",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 63988
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"tool_calls": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-4o-mini",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT-4o mini",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4o-mini-2024-07-18"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4o-mini",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 63988
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"tool_calls": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-4o-mini-2024-07-18",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT-4o mini",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4o-mini-2024-07-18"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4",
								"limits": {
									"max_context_window_tokens": 32768,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 28663
								},
								"object": "model_capabilities",
								"supports": {
									"streaming": true,
									"tool_calls": true
								},
								"tokenizer": "cl100k_base",
								"type": "chat"
							},
							"id": "gpt-4",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT 4",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4-0613"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4",
								"limits": {
									"max_context_window_tokens": 32768,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 28663
								},
								"object": "model_capabilities",
								"supports": {
									"streaming": true,
									"tool_calls": true
								},
								"tokenizer": "cl100k_base",
								"type": "chat"
							},
							"id": "gpt-4-0613",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT 4",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4-0613"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4o",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 63988,
									"vision": {
										"max_prompt_image_size": 3145728,
										"max_prompt_images": 1,
										"supported_media_types": [
											"image/jpeg",
											"image/png",
											"image/webp",
											"image/gif"
										]
									}
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"tool_calls": true,
									"vision": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-4o",
							"is_chat_default": false,
							"is_chat_fallback": true,
							"model_picker_category": "versatile",
							"model_picker_enabled": false,
							"name": "GPT-4o",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4o-2024-11-20"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4o",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 16384,
									"max_prompt_tokens": 63988,
									"vision": {
										"max_prompt_image_size": 3145728,
										"max_prompt_images": 1,
										"supported_media_types": [
											"image/jpeg",
											"image/png",
											"image/webp",
											"image/gif"
										]
									}
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"tool_calls": true,
									"vision": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-4o-2024-11-20",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT-4o",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4o-2024-11-20"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4o",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 63988,
									"vision": {
										"max_prompt_image_size": 3145728,
										"max_prompt_images": 1,
										"supported_media_types": [
											"image/jpeg",
											"image/png",
											"image/webp",
											"image/gif"
										]
									}
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"tool_calls": true,
									"vision": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-4o-2024-05-13",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT-4o",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4o-2024-05-13"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4o",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 4096,
									"max_prompt_tokens": 63988
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"tool_calls": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-4-o-preview",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT-4o",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4o-2024-05-13"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gpt-4o",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 16384,
									"max_prompt_tokens": 63988
								},
								"object": "model_capabilities",
								"supports": {
									"parallel_tool_calls": true,
									"streaming": true,
									"tool_calls": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gpt-4o-2024-08-06",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "GPT-4o",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "gpt-4o-2024-08-06"
						},
						{
							"billing": {
								"is_premium": true,
								"multiplier": 0.33,
								"restricted_to": [
									"free",
									"pro",
									"pro_plus",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "o3-mini",
								"limits": {
									"max_context_window_tokens": 200000,
									"max_output_tokens": 100000,
									"max_prompt_tokens": 63988
								},
								"object": "model_capabilities",
								"supports": {
									"streaming": true,
									"structured_outputs": true,
									"tool_calls": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "o3-mini-paygo",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_enabled": false,
							"name": "o3-mini",
							"object": "model",
							"preview": false,
							"vendor": "Azure OpenAI",
							"version": "o3-mini-paygo"
						},
						{
							"billing": {
								"is_premium": false,
								"multiplier": 0,
								"restricted_to": [
									"pro",
									"pro_plus",
									"max",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "grok-code",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 64000,
									"max_prompt_tokens": 108792
								},
								"object": "model_capabilities",
								"supports": {
									"streaming": true,
									"structured_outputs": true,
									"tool_calls": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "grok-code-fast-1",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_category": "powerful",
							"model_picker_enabled": false,
							"name": "Grok Code Fast 1 (Preview)",
							"object": "model",
							"policy": {
								"state": "enabled",
								"terms": "Enable access to the latest Grok Code Fast 1 model from xAI. If enabled, you instruct GitHub Copilot to send data to xAI Grok Code Fast 1. [Learn more about how GitHub Copilot serves Grok Code Fast 1](https://docs.github.com/en/copilot/reference/ai-models/model-hosting#xai-models). During launch week, [promotional pricing is 0x](https://gh.io/copilot-grok-code-promo)."
							},
							"preview": true,
							"vendor": "xAI",
							"version": "grok-code-fast-1"
						},
						{
							"billing": {
								"is_premium": true,
								"multiplier": 1,
								"restricted_to": [
									"pro",
									"pro_plus",
									"max",
									"business",
									"enterprise"
								]
							},
							"capabilities": {
								"family": "gemini-2.5-pro",
								"limits": {
									"max_context_window_tokens": 128000,
									"max_output_tokens": 64000,
									"max_prompt_tokens": 108792,
									"vision": {
										"max_prompt_image_size": 3145728,
										"max_prompt_images": 1,
										"supported_media_types": [
											"image/jpeg",
											"image/png",
											"image/webp",
											"image/heic",
											"image/heif"
										]
									}
								},
								"object": "model_capabilities",
								"supports": {
									"max_thinking_budget": 32768,
									"min_thinking_budget": 128,
									"parallel_tool_calls": true,
									"streaming": true,
									"tool_calls": true,
									"vision": true
								},
								"tokenizer": "o200k_base",
								"type": "chat"
							},
							"id": "gemini-2.5-pro",
							"is_chat_default": false,
							"is_chat_fallback": false,
							"model_picker_category": "powerful",
							"model_picker_enabled": false,
							"name": "Gemini 2.5 Pro",
							"object": "model",
							"policy": {
								"state": "enabled",
								"terms": "Enable access to the latest Gemini 2.5 Pro model from Google. [Learn more about how GitHub Copilot serves Gemini 2.5 Pro](https://docs.github.com/en/copilot/using-github-copilot/ai-models/choosing-the-right-ai-model-for-your-task#gemini-25-pro)."
							},
							"preview": false,
							"vendor": "Google",
							"version": "gemini-2.5-pro"
						}
					]
			`);
            // ...
    }
```

# 模型会话

 写死模型会话获取，**需要调大 `expires_at` 自动值，防止会话过期**

```ts
    // src\platform\endpoint\common\automodeService.ts
    private async _updateAutoEndpointCache(chatRequest: ChatRequest | undefined, knownEndpoints: IChatEndpoint[]): Promise<IChatEndpoint> {
        const startTime = Date.now();
        const conversationId = getConversationId(chatRequest);
        const cacheEntry = this._autoModelCache.get(conversationId);
        const existingToken = cacheEntry?.autoModeToken;
        const isExpired = cacheEntry && (cacheEntry.expiration <= Date.now());
        const authToken = (await this._authService.getCopilotToken()).token;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };
        if (existingToken && !isExpired) {
            headers['Copilot-Session-Token'] = existingToken;
        }

        // const response = await this._capiClientService.makeRequest<Response>({
        // 	json: {
        // 		"auto_mode": { "model_hints": ["auto"] },
        // 	},
        // 	headers,
        // 	method: 'POST'
        // }, { type: RequestType.AutoModels });
        // const data: AutoModeAPIResponse = await response.json() as AutoModeAPIResponse;

        // NOTE - 模型会话
        let data: AutoModeAPIResponse = JSON.parse(
            `
            {
                "available_models": [
                    "gpt-5-mini"
                ],
                "selected_model": "gpt-5-mini",
                "session_token": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdmFpbGFibGVfbW9kZWxzIjpbImdwdC01LW1pbmkiXSwic2VsZWN0ZWRfbW9kZWwiOiJncHQtNS1taW5pIiwic3ViIjoiNzBiMzZjOWUtZWEwOC00OGMyLWIyOGUtMGRkNTM1YjM5OTgyIiwiaWF0IjoxNzYwMDI5OTEzLCJleHAiOjE3NjAwMzM1MTMsImRpc2NvdW50ZWRfY29zdHMiOnsiZ3B0LTUtbWluaSI6MC4xfX0.0ldG2uQkBiuiC7BtHHbFvqFrEsxo50L5Jaai5BZWoRd9M_lX8hWr-waNdx6zQ1qVQUIVnwa-AIw7ENHvPNMvIw",
                "expires_at": 2770033513,
                "discounted_costs": {
                    "gpt-5-mini": 0.1
                }
            }
            `
        );
        // ..
    }
```

# 修改基本模型

```ts
// src\platform\networking\common\networking.ts
function networkRequest(
	fetcher: IFetcher,
	telemetryService: ITelemetryService,
	capiClientService: ICAPIClientService,
	requestType: 'GET' | 'POST',
	endpointOrUrl: IEndpoint | string | RequestMetadata,
	secretKey: string,
	intent: string,
	requestId: string,
	body?: IEndpointBody,
	additionalHeaders?: Record<string, string>,
	cancelToken?: CancellationToken,
	useFetcher?: FetcherId,
): Promise<Response> {
	// TODO @lramos15 Eventually don't even construct this fake endpoint object.
	const endpoint = typeof endpointOrUrl === 'string' || 'type' in endpointOrUrl ? {
		modelMaxPromptTokens: 0,
		urlOrRequestMetadata: endpointOrUrl,
		family: '',
		tokenizer: TokenizerType.O200K,
		acquireTokenizer: () => {
			throw new Error('Method not implemented.');
		},
		name: '',
		version: '',
	} satisfies IEndpoint : endpointOrUrl;


	let config = vscode.workspace.getConfiguration('github.copilot.baseModel');
	let apikey = config.has('apikey') ? config.get('apikey') : secretKey;

	const headers: ReqHeaders = {
		Authorization: `Bearer ${apikey}`,
		'X-Request-Id': requestId,
		'X-Interaction-Type': intent,
		'OpenAI-Intent': intent, // Tells CAPI who flighted this request. Helps find buggy features
		'X-GitHub-Api-Version': '2025-05-01',
		...additionalHeaders,
		...(endpoint.getExtraHeaders ? endpoint.getExtraHeaders() : {}),
	};

	if (endpoint.interceptBody) {
		endpoint.interceptBody(body);
	}

	if (body) {
		body.model = config.get('model');
		body.max_tokens = config.has('max_tokens') ? config.get('max_tokens') : body.max_tokens;
		body.max_output_tokens = config.has('max_output_tokens') ? config.get('max_output_tokens') : body.max_output_tokens;
		body.max_completion_tokens = config.has('max_completion_tokens') ? config.get('max_completion_tokens') : body.max_completion_tokens;
		body.temperature = config.has('temperature') ? config.get('temperature') : body.temperature;
		body.top_p = config.has('top_p') ? config.get('top_p') : body.top_p;
		body.stream = config.has('stream') ? config.get('strean') : body.stream;
		body.n = config.has('n') ? config.get('n') : body.n;
	}
	// ....
}
```