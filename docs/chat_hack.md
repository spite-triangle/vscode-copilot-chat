

# 锁定 token

写死 `token` 验证，**且需要调大 `expires_at` 配置，防止`token` 过期**


```ts
// src\platform\authentication\node\copilotTokenManager.ts
    private async doAuthFromGitHubTokenOrDevDeviceId(
        context: { githubToken: string; ghUsername: string } | { devDeviceId: string }
    ): Promise<TokenInfoOrError & NotGitHubLoginFailed> {
        this._telemetryService.sendGHTelemetryEvent('auth.new_login');

			let response, userInfo, ghUsername;
		try {
			let config = workspace.getConfiguration('github.copilot').get('forceOffline');
			if (config) {
				throw Error('offline');
			}

			if ('githubToken' in context) {
				ghUsername = context.ghUsername;
				[response, userInfo] = (await Promise.all([
					this.fetchCopilotTokenFromGitHubToken(context.githubToken),
					this.fetchCopilotUserInfo(context.githubToken)
				]));
			} else {
				response = await this.fetchCopilotTokenFromDevDeviceId(context.devDeviceId);
			}

			if (!response) {
				this._logService.warn('Failed to get copilot token');
				this._telemetryService.sendGHTelemetryErrorEvent('auth.request_failed');
				return { kind: 'failure', reason: 'FailedToGetToken' };
			}
		} catch {
			// NOTE - TOKEN 验证
			let data1 = `
				{
				"annotations_enabled": true,
				"blackbird_clientside_indexing": false,
				"chat_enabled": true,
				"chat_jetbrains_enabled": true,
				"code_quote_enabled": true,
				"code_review_enabled": true,
				"codesearch": true,
				"copilotignore_enabled": false,
				"endpoints": {
					"api": "https://api.business.githubcopilot.com",
					"origin-tracker": "https://origin-tracker.business.githubcopilot.com",
					"proxy": "https://proxy.business.githubcopilot.com",
					"telemetry": "https://telemetry.business.githubcopilot.com"
				},
				"expires_at": 2761321757,
				"individual": false,
				"limited_user_quotas": null,
				"limited_user_reset_date": null,
				"organization_list": [
					"184531bbdd2fc3x8eee45c6c7e42aeb6"
				],
				"prompt_8k": true,
				"public_suggestions": "disabled",
				"refresh_in": 1500,
				"sku": "copilot_for_business_seat_quota",
				"snippy_load_test_enabled": false,
				"telemetry": "disabled",
				"token": "tid=25521c7a46180619297ead903f249eac;ol=084531bbdd2fc328eee45c6c7e42aeb6;exp=1761321757;sku=copilot_for_business_seat_quota;proxy-ep=proxy.business.githubcopilot.com;st=dotcom;ssc=1;chat=1;cit=1;malfil=1;editor_preview_features=1;agent_mode=1;mcp=1;ccr=1;8kp=1;ip=112.193.141.65;asn=AS4837:3ef201993d9faf6623bb22a45a66a74480b5f6bc7afcee57d1e40ad3109afcde",
				"tracking_id": "25521c7a46180619297ead903f249eac",
				"vsc_electron_fetcher_v2": false,
				"xcode": true,
				"xcode_chat": false
			}
			`;

			let data2 = `
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
						"api": "https://api.individual.githubcopilot.com",
						"origin-tracker": "https://origin-tracker.individual.githubcopilot.com",
						"proxy": "https://proxy.individual.githubcopilot.com",
						"telemetry": "https://telemetry.individual.githubcopilot.com"
					},
					"expires_at": 2760850265,
					"individual": false,
					"prompt_8k": true,
					"public_suggestions": "disabled",
					"refresh_in": 300,
					"sku": "no_auth_limited_copilot",
					"snippy_load_test_enabled": false,
					"telemetry": "disabled",
					"token": "tid=70b36c9e-ea08-48c2-b28e-0dd535b39982;exp=1760850265;sku=no_auth_limited_copilot;proxy-ep=proxy.individual.githubcopilot.com;st=dotcom;chat=1;malfil=1;agent_mode=1;mcp=1;8kp=1;ip=103.135.103.18;asn=AS38136:55183d53996e868667171d1850e50f4b318ee14f91da013658423649da8279e9",
					"tracking_id": "70b36c9e-ea08-48c2-b28e-0dd535b39982",
					"vsc_electron_fetcher_v2": false,
					"xcode": false,
					"xcode_chat": false
				}
			`;
			let data = data1;

			response = new Response(200,
				"",
				new Map(),
				() => {
					return Promise.resolve(data);;
				},
				() => {
					return Promise.resolve({});
				},
				() => {
					return Promise.resolve(Readable.from(data));
				}
			);
		}

        // ...
    }
```




# 模型配置


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
			let models;

			try {
				const response = await getRequest(
					this._fetcher,
					this._telemetryService,
					this._capiClientService,
					requestMetadata,
					copilotToken,
					await createRequestHMAC(process.env.HMAC_SECRET),
					'model-access',
					requestId,
				);

				this._lastFetchTime = Date.now();
				this._logService.info(`Fetched model metadata in ${Date.now() - requestStartTime}ms ${requestId}`);

				if (!response.ok) {
					throw Error('failed to request');
				}

				models = (await response.json()).data;
			} catch (e) {
				models = JSON.parse(`
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
								"family": "text-embedding-3-small",
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
								"type": "embeddings"
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
			}
			// NOTE - 模型配置，只是用于通过验证，实际配置利用 OAI 插件
			this._familyMap.clear();


			const data: IModelAPIResponse[] = models as IModelAPIResponse[];
			// const data: IModelAPIResponse[] = (await response.json()).data;
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
		let data: AutoModeAPIResponse;
		try {
			let config = workspace.getConfiguration('github.copilot').get('forceOffline');
			if (config) {
				throw Error('offline');
			}

			const response = await this._capiClientService.makeRequest<Response>({
				json: {
					"auto_mode": { "model_hints": ["auto"] },
				},
				headers,
				method: 'POST'
			}, { type: RequestType.AutoModels });
			data = await response.json() as AutoModeAPIResponse;
		} catch (e) {
			data = JSON.parse(
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
		}
        // ..
    }
```

# 网络请求

```ts
// src\platform\networking\common\networking.ts


export interface IEndpointBody {
	// ......
	/** Embeddings endpoints only: */
	dimensions?: number;
	embed?: boolean;
	encoding_format?: string;
	/** Chunking endpoints: */
	// ..
}

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
	if (typeof endpoint.urlOrRequestMetadata !== 'string') {
		let type = endpoint.urlOrRequestMetadata.type;
		if (type == RequestType.DotcomEmbeddings
			|| type == RequestType.CAPIEmbeddings
			|| type == RequestType.Chunks
			|| type == RequestType.EmbeddingsCodeSearch) {
			config = vscode.workspace.getConfiguration('github.copilot.embeddingModel');
		}
	}

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
		body.dimensions = config.has('dimensions') ? config.get('dimensions') : body.dimensions;
		body.encoding_format = config.has('encoding_format') ? config.get('encoding_format') : body.encoding_format;
	}
	// ....

	let url: string = config.has('url') ? config.get('url') as string : "https://api.githubcopilot.com";

	let token: CopilotToken = {
		endpoints: {
			api: url,
			proxy: url
		},
		sku: 'yearly_subscriber'
	};
	capiClientService.updateDomains(token, url);

	return capiClientService.makeRequest(request, endpoint.urlOrRequestMetadata as RequestMetadata);
}
```


# Embedding 模型

## index.js

```js
// node_modules\@vscode\copilot-api\dist\index.js
  updateDomains(e, t) {
    let o = this._dotcomAPIUrl,
      r = this._capiBaseUrl,
      n = this._telemetryBaseUrl,
      c = this._proxyBaseUrl;
    return (
      this._enterpriseUrlConfig !== t &&
      ((this._enterpriseUrlConfig = t),
        (this._dotcomAPIUrl = this._getCAPIUrl(e))),
		// ....
  }
```

## embeddingsEndpoint

```ts
// src\platform\endpoint\node\embeddingsEndpoint.ts
export class EmbeddingEndpoint implements IEmbeddingsEndpoint {
	public readonly maxBatchSize: number;
	public readonly modelMaxPromptTokens: number;
	public readonly tokenizer: TokenizerType;

	public readonly name = this._modelInfo.name;
	public readonly version = this._modelInfo.version;
	public readonly family = this._modelInfo.capabilities.family;

	constructor(
		private _modelInfo: IEmbeddingModelInformation,
		@ITokenizerProvider private readonly _tokenizerProvider: ITokenizerProvider
	) {
		let config = workspace.getConfiguration('github.copilot.embeddingModel');

		this.tokenizer = config.get('tokenzier', this._modelInfo.capabilities.tokenizer);
		this.maxBatchSize = config.get('max_chunk_bacth', this._modelInfo.capabilities.limits?.max_inputs ?? 256);
		this.modelMaxPromptTokens = config.get('max_chunk_tokens', 250);
		GlobalChunkingDefaults.maxTokenLength = config.get('max_chunk_tokens', 250);
		GlobalChunkingDefaults.strategy = config.get('chunk_strategy', 'token');
	}

	public acquireTokenizer(): ITokenizer {
		return this._tokenizerProvider.acquireTokenizer(this);
	}

	public get urlOrRequestMetadata(): string | RequestMetadata {
		return { type: RequestType.CAPIEmbeddings, modelId: LEGACY_EMBEDDING_MODEL_ID.TEXT3SMALL };
	}
}

```

## GithubAvailableEmbeddingTypesManager

```ts
	//src\platform\workspaceChunkSearch\common\githubAvailableEmbeddingTypes.ts
	private async getAllAvailableTypes(silent: boolean): Promise<GetAvailableTypesResult> {
		if (this._cached) {
			const oldCached = this._cached;
			try {
				const cachedResult = await this._cached;
				if (cachedResult.isOk()) {
					return cachedResult;
				}
			} catch {
				// noop
			}

			if (this._cached === oldCached) {
				this._cached = undefined;
			}
		}

		this._cached = (async () => {
			try {
				const anySession = await this._authService.getAnyGitHubSession({ silent });
				if (!anySession) {
					return Result.error<GetAvailableTypesError>({ type: 'noSession' });
				}

				const initialResult = await this.doGetAvailableTypes(anySession.accessToken);
				if (initialResult.isOk()) {
					return initialResult;
				}

				const permissiveSession = await this._authService.getPermissiveGitHubSession({ silent, createIfNone: !silent ? true : undefined });
				if (!permissiveSession) {
					return initialResult;
				}
				return this.doGetAvailableTypes(permissiveSession.accessToken);
			} catch (e) {
				const primary: EmbeddingType[] = [];
				const deprecated: EmbeddingType[] = [];

				let config = workspace.getConfiguration('github.copilot.embeddingModel');
				if (config.has('enable') && config.get('enable')) {
					primary.push(new EmbeddingType('text-embedding-3-small-512'));
				} else {
					this._logService.error('Error fetching available embedding types', e);

					return Result.error<GetAvailableTypesError>({
						type: 'requestFailed',
						error: e
					});
				}
				return Result.ok({ primary, deprecated });
			}
		})();

		return this._cached;
	}

	private async doGetAvailableTypes(token: string): Promise<GetAvailableTypesResult> {
		let response: Response;
		try {
			response = await getRequest(
				this._fetcherService,
				this._telemetryService,
				this._capiClientService,
				{ type: RequestType.EmbeddingsModels },
				token,
				await createRequestHMAC(env.HMAC_SECRET),
				'copilot-panel',
				generateUuid(),
				undefined,
				getGithubMetadataHeaders(new CallTracker(), this._envService)
			);
		} catch (e) {
			this._logService.error('Error fetching available embedding types', e);
			return Result.error<GetAvailableTypesError>({
				type: 'requestFailed',
				error: e
			});
		}

		if (!response.ok) {
			throw Error('Failed to fetch available embedding types');
			/* __GDPR__
				"githubAvailableEmbeddingTypes.getAvailableTypes.error" : {
					"owner": "mjbvz",
					"comment": "Information about failed githubAvailableEmbeddingTypes calls",
					"statusCode": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The response status code" }
				}
			*/
			// this._telemetryService.sendMSFTTelemetryEvent('githubAvailableEmbeddingTypes.getAvailableTypes.error', {}, {
			// 	statusCode: response.status,
			// });

			// // Also treat 404s as unauthorized since this typically indicates that the user is anonymous
			// if (response.status === 401 || response.status === 404) {
			// 	return Result.error<GetAvailableTypesError>({ type: 'unauthorized', status: response.status });
			// }

			// return Result.error<GetAvailableTypesError>({
			// 	type: 'badResponse',
			// 	status: response.status
			// });
		}
		// ...
	}
```

## workspaceChunkSearchService

```ts
// src\platform\workspaceChunkSearch\node\workspaceChunkSearchService.ts
	private async tryInit(silent: boolean): Promise<WorkspaceChunkSearchServiceImpl | undefined> {
		const enable = workspace.getConfiguration('github.copilot.embeddingModel').get('enable') as boolean;
		if (!enable) {
			return undefined;
		}

		if (this._impl) {
			return this._impl;
		}

		try {
			// const best = await this._availableEmbeddingTypes.getPreferredType(silent);
			const best = new EmbeddingType('text-embedding-3-small-512');
			// Double check that we haven't initialized in the meantime
			if (this._impl) {
				return this._impl;
			}
			// ....
		}
		// ....
	}
```

## @vscode/copilot-api

```js
// node_modules\@vscode\copilot-api\dist\index.js
  _getDotComAPIUrl() {
    if (this._enterpriseUrlConfig)
      try {
        // let e = new URL(this._enterpriseUrlConfig);
        // return `${e.protocol}//api.${e.hostname}${e.port ? ':' + e.port : ''}`;
        return this._enterpriseUrlConfig;
      } catch (e) {
        return (
          console.warn(
            'Failed to parse enterprise URL config:',
            this._enterpriseUrlConfig,
            e,
          ),
          'https://api.github.com'
        );
      }
    return 'https://api.github.com';
  }
```

## remoteEmbeddingsComputer

```ts
// src\platform\embeddings\common\remoteEmbeddingsComputer.ts
	public async computeEmbeddings(
		embeddingType: EmbeddingType,
		inputs: readonly string[],
		options?: ComputeEmbeddingsOptions,
		telemetryInfo?: TelemetryCorrelationId,
		cancellationToken?: CancellationToken,
	): Promise<Embeddings> {
		return logExecTime(this._logService, 'RemoteEmbeddingsComputer::computeEmbeddings', async () => {

			let config = workspace.getConfiguration('github.copilot.embeddingModel');

			// Determine endpoint type: use CAPI for no-auth users, otherwise use GitHub
			// const copilotToken = await this._authService.getCopilotToken();
			if (config.has('enable') && config.get('enable')) {
				const embeddings = await this.computeCAPIEmbeddings(inputs, options, cancellationToken);
				return embeddings ?? { type: embeddingType, values: [] };
			}

			const token = (await this._authService.getAnyGitHubSession({ silent: true }))?.accessToken;
			if (!token) {
				throw Error('getAnyGitHubSession error');
			}

			// ....
		}
	}
```

```ts
	public async rawEmbeddingsFetch(
		type: EmbeddingTypeInfo,
		endpoint: IEmbeddingsEndpoint,
		requestId: string,
		inputs: readonly string[],
		cancellationToken: CancellationToken | undefined
	): Promise<CAPIEmbeddingResults | CAPIEmbeddingError> {
		try {
			let token = '';
			try {
				token = (await this._authService.getCopilotToken()).token;
			} catch (e) {

			}
			// ..
		}
	}
```

## chunkingEndpointClientImpl.ts

```ts
// src\platform\chunking\common\chunkingEndpointClientImpl.ts
export class ChunkingEndpointClientImpl extends Disposable implements IChunkingEndpointClient {
	declare readonly _serviceBrand: undefined;

	/**
	 * Limiter for request to the chunks endpoint.
	 */
	private readonly _requestLimiter: RequestRateLimiter;

	private readonly _requestHmac = new Lazy(() => createRequestHMAC(env.HMAC_SECRET));

	constructor(
		@INaiveChunkingService private readonly naiveChunkingService: INaiveChunkingService,
		@IEmbeddingsComputer private readonly embeddingsComputer: IEmbeddingsComputer,
		@IInstantiationService instantiationService: IInstantiationService,
		@ICAPIClientService private readonly _capiClientService: ICAPIClientService,
		@IEnvService private readonly _envService: IEnvService,
		@IFetcherService private readonly _fetcherService: IFetcherService,
		@ILogService private readonly _logService: ILogService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService,
		@IWorkspaceService private readonly _workspaceService: IWorkspaceService,
	) {
		super();

		this._requestLimiter = this._register(instantiationService.createInstance(RequestRateLimiter));
	}

	public computeChunks(authToken: string, embeddingType: EmbeddingType, content: ChunkableContent, batchInfo: ComputeBatchInfo, qos: EmbeddingsComputeQos, cache: ReadonlyMap<string, FileChunkWithEmbedding> | undefined, telemetryInfo: CallTracker, token: CancellationToken): Promise<readonly FileChunkWithOptionalEmbedding[] | undefined> {
		return this.doComputeChunksAndEmbeddingsOffline(authToken, embeddingType, content, batchInfo, { qos, computeEmbeddings: false }, cache, telemetryInfo, token);
	}

	public async computeChunksAndEmbeddings(authToken: string, embeddingType: EmbeddingType, content: ChunkableContent, batchInfo: ComputeBatchInfo, qos: EmbeddingsComputeQos, cache: ReadonlyMap<string, FileChunkWithEmbedding> | undefined, telemetryInfo: CallTracker, token: CancellationToken): Promise<readonly FileChunkWithEmbedding[] | undefined> {
		const result = await this.doComputeChunksAndEmbeddingsOffline(authToken, embeddingType, content, batchInfo, { qos, computeEmbeddings: true }, cache, telemetryInfo, token);
		return result as FileChunkWithEmbedding[] | undefined;
	}


	private async doComputeChunksAndEmbeddingsOffline(
		authToken: string,
		embeddingType: EmbeddingType,
		content: ChunkableContent,
		batchInfo: ComputeBatchInfo,
		options: {
			qos: EmbeddingsComputeQos;
			computeEmbeddings: boolean;
		},
		cache: ReadonlyMap<string, FileChunkWithEmbedding> | undefined,
		telemetryInfo: CallTracker,
		token: CancellationToken
	): Promise<readonly FileChunkWithOptionalEmbedding[] | undefined> {
		const text = await raceCancellationError(content.getText(), token);
		if (isFalsyOrWhitespace(text)) {
			return [];
		}

		try {
			// 1. 使用 NaiveChunkingService 进行分块
			let maxToken = workspace.getConfiguration('github.copilot.embeddingModel').get('max_chunk_tokens', 250);
			let check = workspace.getConfiguration('github.copilot.embeddingModel').get('check_chunk_token', true);
			const chunks = await this.naiveChunkingService.chunkFile(
				{ tokenizer: TokenizerType.O200K },
				content.uri,
				text,
				{
					maxTokenLength: maxToken, // 或从配置中获取
					validateChunkLengths: check
				},
				token
			);

			let fileChunks: FileChunkWithOptionalEmbedding[] = new Array();

			// 2. 如果需要嵌入向量，计算嵌入
			if (options.computeEmbeddings) {
				const chunkStrings = chunks.map(chunk => chunk.text);

				// 3. 使用 OpenAI /embeddings API 计算嵌入
				const embeddings = await this.embeddingsComputer.computeEmbeddings(
					embeddingType,
					chunkStrings,
					{ inputType: 'document' },
					new TelemetryCorrelationId('LocalChunkingAndEmbeddingService'),
					token
				);

				for (let index = 0; index < chunks.length; index++) {
					const embedding = embeddings.values[index];
					const chunk = chunks[index];
					if (typeof chunk.text !== "string" || !chunk.rawText) {
						continue;
					}

					let hash = await createSha256Hash(chunk.rawText);
					fileChunks.push(
						{
							chunk: chunk,
							chunkHash: hash,
							embedding: embedding
						}
					)
				}
			} else {

				for (let chunk of chunks) {
					if (typeof chunk.text !== "string" || !chunk.rawText) {
						continue;
					}

					let hash = await createSha256Hash(chunk.rawText);
					const cached = cache?.get(hash);
					if (cached) {
						fileChunks.push({
							chunk: chunk,
							chunkHash: hash,
							embedding: cached.embedding,
						});
					} else {
						fileChunks.push({
							chunk: chunk,
							chunkHash: hash,
							embedding: undefined
						});
					}
				}
			}

			return coalesce(fileChunks);
		} catch (error) {
			this._logService.error('Error in local chunking and embedding:', error);
			return undefined;
		}
	}

	// .....
}
```

## naiveChunker

使用 `chonkie` 库重新实现

```ts
// src\platform\chunking\node\naiveChunker.ts

```

## chunkingService

使用依赖注入的方式实现在前端能调用 `naiveChunker` 的功能

```ts
// src\platform\chunking\common\chunkingService.ts
// src\platform\chunking\node\chunkingServiceImpl.ts
```


# package.json

```json
	"github.copilot.forceOffline": {
		"type": "boolean",
		"default": true,
		"description": "debug"
	},
	"github.copilot.baseModel": {
		"type": "object",
		"default": {},
		"tags": [
			"experimental"
		],
		"properties": {
			"model": {
				"type": "string",
				"description": "The model identifier to use for the request"
			},
			"url": {
				"type": "string",
				"description": "model url"
			},
			"apikey": {
				"type": "string",
				"description": "api key"
			},
			"max_tokens": {
				"type": "integer",
				"minimum": 1,
				"description": "Maximum number of tokens to generate in the response"
			},
			"max_output_tokens": {
				"type": "integer",
				"minimum": 1,
				"description": "Maximum number of output tokens to generate"
			},
			"max_completion_tokens": {
				"type": "integer",
				"minimum": 1,
				"description": "Maximum number of completion tokens to generate"
			},
			"temperature": {
				"type": "number",
				"minimum": 0,
				"maximum": 2,
				"description": "Sampling temperature for response randomness (0-2)"
			},
			"top_p": {
				"type": "number",
				"minimum": 0,
				"maximum": 1,
				"description": "Nucleus sampling parameter (0-1)"
			},
			"stream": {
				"type": "boolean",
				"description": "Whether to stream the response progressively"
			},
			"n": {
				"type": "integer",
				"minimum": 1,
				"description": "Number of chat completion choices to generate for each input message"
			}
		},
		"required": [
			"model",
			"url",
			"apikey"
		]
	},
	"github.copilot.embeddingModel": {
		"type": "object",
		"default": {},
		"tags": [
			"experimental"
		],
		"properties": {
			"enable": {
				"type": "boolean",
				"default": false,
				"description": "enable embedding model"
			},
			"model": {
				"type": "string",
				"description": "The model identifier to use for the request"
			},
			"url": {
				"type": "string",
				"description": "model url"
			},
			"apikey": {
				"type": "string",
				"description": "api key"
			},
			"dimensions": {
				"type": "integer",
				"default": 1024,
				"description": "The number of dimensions for the embedding"
			},
			"encoding_format": {
				"type": "string",
				"default": "float",
				"enum": [
					"float",
					"base64"
				],
				"description": "The encoding format for the embedding"
			},
			"check_chunk_token": {
				"type": "boolean",
				"default": true,
				"description": "check the size of chunk token before request embedding"
			},
			"chunk_strategy":{
				"type": "string",
				"default" : "token",
				"enum": ["token","sentence", "recursive", "code"],
				"description": "how to generate chunk"
			},
			"max_chunk_tokens": {
				"type": "integer",
				"default": 250,
				"minimum": 1,
				"description": "Maximum number of tokens to chunk"
			},
			"max_chunk_bacth": {
				"type": "integer",
				"default": 10,
				"minimum": 1,
				"description": "Maximum number of chunk to request embedding"
			},
			"tokenzier": {
				"type": "string",
				"default": "o200k_base",
				"enum": [
					"cl100k_base",
					"o200k_base"
				],
				"description": "tokenzier"
			}
		},
		"required": [
			"enable",
			"model",
			"url",
			"apikey",
			"tokenzier",
			"max_chunk_tokens",
			"max_chunk_bacth"
		]
	}
```

