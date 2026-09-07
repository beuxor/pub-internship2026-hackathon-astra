Snowflake CoCoの実行環境です

# セットアップ
以下はCodespace上での実行を前提とします（ローカル実行する人は自力で頑張って）

0. config.toml.exampleをコピーしてconfig.tomlを作成し、YOUR_USERNAMEを自身のSnowflakeユーザ名に書きかえる。

```
cp .snowflake/config.toml.example .snowflake/config.toml
```

1. 拡張機能からSnowflakeを開いてユーザ名を入力する

![Snowflake拡張機能でユーザ名を入力](asset/01.png)

2. Snowflakeのログイン画面に遷移するのでユーザ名、パスワードを入れる

![ブラウザを開くダイアログ](asset/02-1.png)

![Snowflakeログイン画面](asset/02-2.png)

3. リダイレクトがエラーになるが**これは問題ない**。接続先のURLをコピーする

![リダイレクトエラー画面](asset/03.png)

4. Codespaceに戻りターミナルに以下を入力

```
curl -sL "コピーしたurl" > /dev/null
```

5. アカウント名が表示されればOK

![Snowflake拡張機能ログイン後](asset/05.png)
