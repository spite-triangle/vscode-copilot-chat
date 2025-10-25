# session

```js
    // NOTE - session
    async getGitHubSession() {
      let session;
      try{
        session = await this.ctx.get(ho).getSession();
        ta.info(this.ctx, `session: ${JSON.stringify(session)}`);
      }catch{
        session =
          {
              accessToken: "gho_xxxxxxxxxxxxxxxxxxx",
              account: {
                  label: "guest",
                  id: "1234"
              },
              apiUrl: "https://api.github.com",
              serverUrl: "https://github.com",
              login: "guest"
          };
      }

      return session;
    }
```

# authority

```js
   async getTokenResult() {
      if (!this.primed) {
        let e = new Error("Token requested before initialization");
        if (_je(this.ctx)) throw ((this.tokenPrimingError = e), e);
        ub.exception(this.ctx, e, ".getToken");
      }
      // if (
      //   !this.tokenPromise &&
      //   (!this.activeToken || this.activeToken?.needsRefresh())
      // ) {
      //   let n = this.getGitHubSession()
      //     .then(async (a) =>
      //       a ? await this.fetchTokenResult(a) : { failureKind: "NotSignedIn" },
      //     )
      //     .catch((a) => {
      //       if (!(a instanceof Error)) throw a;
      //       return {
      //         failureKind: "Exception",
      //         message: String(a),
      //         exception: a,
      //       };
      //     })
      //     .then(
      //       (a) => (
      //         this.tokenPromise !== n ||
      //       ((this.tokenPromise = void 0), this.handleTokenResult(a)),
      //         a
      //       ),
      //     );
      //   this.tokenPromise = n;
      // }

      // NOTE - token
       let  l = JSON.parse(`
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
      `);

          // NOTE  - 权限获取
    let m = JSON.parse(`
      {
        "access_type_sku": "copilot_for_business_seat_quota",
        "analytics_tracking_id": "25521c7a46180619397ead903f249eac",
        "assigned_date": "2025-10-23T22:18:17+08:00",
        "can_signup_for_limited": false,
        "chat_enabled": true,
        "copilot_plan": "business",
        "organization_login_list": [
            "xxx"
        ],
        "organization_list": [
            {
                "login": "xxx",
                "name": null
            }
        ],
        "quota_reset_date": "2025-11-01",
        "quota_snapshots": {
            "chat": {
                "entitlement": 0,
                "overage_count": 0,
                "overage_permitted": false,
                "percent_remaining": 100,
                "quota_id": "chat",
                "quota_remaining": 0,
                "remaining": 0,
                "unlimited": true,
                "timestamp_utc": "2025-10-25T02:05:15.025Z"
            },
            "completions": {
                "entitlement": 0,
                "overage_count": 0,
                "overage_permitted": false,
                "percent_remaining": 100,
                "quota_id": "completions",
                "quota_remaining": 0,
                "remaining": 0,
                "unlimited": true,
                "timestamp_utc": "2025-10-25T02:05:15.025Z"
            },
            "premium_interactions": {
                "entitlement": 300,
                "overage_count": 0,
                "overage_permitted": true,
                "percent_remaining": 93.7,
                "quota_id": "premium_interactions",
                "quota_remaining": 281.1,
                "remaining": 281,
                "unlimited": false,
                "timestamp_utc": "2025-10-25T02:05:15.025Z"
            }
        },
        "quota_reset_date_utc": "2025-11-01T00:00:00.000Z"
    }

      `);

      if(!this.activeToken){
        this.activeToken  = new H3(l, m, 60);
      }


      return { copilotToken: this.activeToken };
    }
```

# fetch

```js
async function lnt(t, e, n, a, r, o, c, l, A, u, p) {
  let m = t.get(Dr),
    g = Xun(t, c, n, a),
    f = A.extendedBy({ endpoint: a, engineName: n, uiKind: l }, nS(e));
  (rY(o, f, ["prompt", "suffix"], ["context"]),
    (f.properties.headerRequestId = r),
    et(t, "request.sent", f));
  let h = go(),
    b = unt(l);
  // NOTE - 请求模型
  var vs = require("vscode");
  let config;
  let apikey;
  try{
    config = vs.workspace.getConfiguration("github.copilot.codeModel");
    o.model = config.get("model");
    apikey = config.get("apikey");
    g = config.get("url") + "/chat/completions";
  }catch(e){
      vs.window.showErrorMessage('请配置 github.copilot.codeModel 模型');
      throw new Error(`Failed to get github.copilot.codeModel configuration.${e}\n${e.stack}`);
  }

  o.messages =  [
                  {
                      role: "system",
                      content: `
你是一名经验丰富的代码补全助手。

# 字段格式定义
- 开始标签: |@field_name#|
- 结束标签: |/@field_name#|
- 值: 在开始标签与biazh之间

# 补全规则
- speculation 是补全代码的建议
- 要根据 context 规则在 prompt 与 suffix 之间插入代码
  - prompt 是要插入位置的前文
  - suffix 是要插入位置的后文
- extra 中读取额外关于代码补全的配置

# 代码要求
- 仔细分析 prompt 与 suffix 上下文, 保证插入prompt 与 suffix之间代码的语法正确性
- 无较好的补全建议，可以不生成补全内容，返回空字符串即可
- 最小化修改，且补全的代码尽量保持最少化
- 不要生成重复代码
- 变量命名与编码风格尽量原代码保持一致

# 返回内容
- 纯代码文本, 不需要 markdown 的代码块格式
- 不要返回无关内容
                      `
                  },
                {
                      role: "user",
                      content: `
|@speculation#| ${ o.speculation? JSON.stringify(o.speculation): "" } |/@speculation#|
|@context#| ${o.extra?.context} |/@context#|
|@suffix#|  ${o.suffix}  |/@suffix#|
|@prompt#| ${o.prompt}  |/@prompt#|
|@extra#| ${ o.extra ? JSON.stringify(o.extra): ""} |@/extra#|
                      `
                  }
              ];

    // ..............
}
```

```js
    async *processSSEInner(e) {
      let n = "",
        a = null,
        r,
        o;
      e: for await (let c of this.body) {
        if (this.maybeCancel("after awaiting body chunk")) return;

```


# configuration

```js
// extension.js
     // NOTE - 配置
    "github.copilot.enable": {
        type: "object",
        scope: "window",
        default: { "*": !0, plaintext: !1, markdown: !1, scminput: !1 },
        additionalProperties: { type: "boolean" },
        markdownDescription:
            "Enable or disable auto triggering of Copilot completions for specified [languages](https://code.visualstudio.com/docs/languages/identifiers). You can still trigger suggestions manually using `Alt + \\`",
        },
        "github.copilot.codeModel": {
        type: "object",
        default: {},
        tags: [
            "experimental"
        ],
        properties: {
            model: {
                type: "string",
                description: "The model identifier to use for the request"
            },
            url: {
                type: "string",
                description: "model url"
            },
            apikey: {
                type: "string",
                description: "api key"
            },
              max_n: {
                type: "integer",
                description: "the max of n."
              }
            },
        },
        required: [
            "model",
            "url",
            "apikey"
        ]
    }
```

```json
    // package.json
    "github.copilot.enable": {
        "type": "object",
        "scope": "window",
        "default": {
            "*": true,
            "plaintext": false,
            "markdown": false,
            "scminput": false
        },
        "additionalProperties": {
            "type": "boolean"
        },
        "markdownDescription": "Enable or disable auto triggering of Copilot completions for specified [languages](https://code.visualstudio.com/docs/languages/identifiers). You can still trigger suggestions manually using `Alt + \\`"
    },
    "github.copilot.codeModel": {
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
        "max_n": {
          "type": "integer",
          "description": "the max of n."
        }
      },
      "required": [
        "model",
        "url",
        "apikey"
      ]
    }
```