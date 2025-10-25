# session

```js
    async getGitHubSession() {
      let session;
      try{
        session = await this.ctx.get(ho).getSession();
        ta.info(this.ctx, `session: ${JSON.stringify(session)}`);
      }catch{
        session =
          {
              accessToken: "gho_sBUFbywd7U5XDxxNARKYWe4IGiRdVI1XxxXF",
              account: {
                  label: "guest",
                  id: "63054894"
              },
              apiUrl: "https://api.github.com",
              serverUrl: "https://github.com",
              login: "guest"
          };
      }

      return session;
    }
```

