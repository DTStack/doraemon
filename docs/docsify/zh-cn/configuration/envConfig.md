# 配置项

你可以配置在根目录下的 `env.json` 里。

```json
{
    "webhookUrls": [],
    "msgSingleUrl": "https://dtstack.github.io/doraemon/docsify/#/",
    "helpDocUrl": "https://dtstack.github.io/doraemon/docsify/#/"
}
```

## webhookUrls

- 类型：Array
- 默认值：[]

dingBot 的钉钉接收群 token 集合，默认为空，如果需要配置通知群，请将对应 token 配置在 webhookUrls 中。

```json
{
    "webhookUrls": []
}
```

## msgSingleUrl

- 类型：String
- 默认值：'https://dtstack.github.io/doraemon/docsify/#/'

dingBot 的通知模板的跳转路径，默认跳转到帮助文档，可自行配置

```json
{
    "msgSingleUrl": "https://dtstack.github.io/doraemon/docsify/#/"
}
```

## helpDocUrl

- 类型：String
- 默认值：'https://dtstack.github.io/doraemon/docsify/#/'

导航栏帮助文档跳转链接，默认跳转到 GitHub 文档，可自行配置

```json
{
    "helpDocUrl": "https://dtstack.github.io/doraemon/docsify/#/"
}
```

## articleHelpDocUrl

- 类型：String
- 默认值：'https://dtstack.github.io/doraemon/docsify/#/zh-cn/guide/文章订阅'

点击帮助文档的悬浮 Icon 跳转帮助文档链接，默认跳转到 GitHub 文档，可自行配置

```json
{
    "articleHelpDocUrl": "https://dtstack.github.io/doraemon/docsify/#/zh-cn/guide/文章订阅"
}
```

## mysql

- 类型：Object
- 默认值：无

数据库连接配置，目前仅提供 config.prod.js 生产下的数据库连接配置

```json
{
    "mysql": {
        "prod": {
            "database": "doraemon",
            "host": "127.0.0.1",
            "port": 3306,
            "username": "root",
            "password": "******"
        }
    }
}
```
