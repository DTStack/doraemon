# 配置项

你可以配置在根目录下的 `env.json` 里。

```json
{
    "webhookUrls": [],
    "articleResultWebhook": "",
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

## articleResultWebhook

- 类型：String
- 默认值：""

文章订阅发送结果通知助手的 webhook，默认为空，如果需要配置钉钉通知机器人，请将对应 webhook 配置给 articleResultWebhook。

```json
{
    "articleResultWebhook": ""
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

## proxyHelpDocUrl

- 类型：String
- 默认值：'https://dtstack.github.io/doraemon/docsify/#/zh-cn/guide/代理服务'

点击帮助文档的悬浮 Icon 跳转帮助文档链接，默认跳转到 GitHub 文档，可自行配置

```json
{
    "proxyHelpDocUrl": "https://dtstack.github.io/doraemon/docsify/#/zh-cn/guide/代理服务"
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

## vpnIp

- 类型：string[]
- 默认值：[]

使用公司内部 VPN 时，本地地址会变成 VPN 的机器地址

```json
{
    "vpnIp": ["127.0.0.1"]
}
```
