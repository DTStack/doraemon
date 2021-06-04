# 哆啦 A 梦 (Doraemon)  Here, you can find everything you need

English | [简体中文](./README-zh_CN.md) 

A management tool to help you organize your daily development, configuration, proxy services, host resources, etc.

## Features

- Change the traditional front-end and back-end joint mode. There is no need for front-end and back-end restarts of local services during API tuning.

- Support to receive, share commonly used, easy to use application links.

- Support multi-environment Host account and password and other information maintenance.

- Supports configuration file modifications on remote service hosts.

- Support unified maintenance of local hosts files

## Environment Support

- node >= 8.0.0

## Quick Start

### Install


```bash
git clone git@github.com:DTStack/doraemon.git

cd doraemon
```

#### Installation dependencies
We recommend using yarn for dependency installation.

```bash
yarn install
```

#### Import MySQL Database

1. Please create the database under the service first.

2. Find the `sql` folder in the directory and import the `doraemon.sql` file in the folder into the database created just now.

3. Refer to Configure [MySQL](https://dtstack.github.io/Doraemon/docsify/#/zh-cn/configuration/mysql), to configure the database connection.

### Running

#### Local development to start

```bash
yarn dev
```

visit: http://127.0.0.1:7001

#### Publish mode to start

```bash
yarn start 

yarn start:test // test environment publishing
```

## Documentation

Visit [Doraemon Docs](https://dtstack.github.io/Doraemon/docsify/#/) for the full Doraemon documentation.

## Contributing

We welcome all contributions. Please read our [CONTRIBUTING.md](./CONTRIBUTING.md) first.

## ChangeLog

Detailed changes for each release are documented in the [ChangeLog.md](./CHANGELOG.md)

## License

[MIT](LICENSE)
