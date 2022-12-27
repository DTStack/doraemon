# 哆啦 A 梦 (Doraemon) Here, you can find everything you need

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
3. Refer to Configure [MySQL](https://dtstack.github.io/doraemon/docsify/#/zh-cn/configuration/mysql), to configure the database connection.

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

## Deploy with Docker（Only support Linux）

#### Images build(If the image is already in the Docker Hub, skip this step)

1. Modify the `mysql` configuration in the root `env.json` file. This configuration item needs to be consistent with the startup command configuration of the mysql image in `./dockerScripts/docker_start.sh`
   ```json
   "mysql": {
       "prod": {
           "database": "doraemon",
           "host": "0.0.0.0",
           "port": "3302",
           "password": "******"
       }
   }
   ```
2. `cd ./dockerScripts`, configure the image information in the `const.sh`(such as `image_mysql`, `image_web`, `version` and so on）

3. image build

   ```bash
   $ yarn build:docker
   ```

4. After the build is complete and pushed to the repository, log in to the deployment server, pull the image and start the container

#### Container run

1. Log in to the deployment server, `cd ./dockerScripts`, change `v_path`(the path to the data volume) in the `const.sh` file

2. container run
   Return to the root directory and run the startup command, pull the latest image and run

   ```bash
   $ yarn start:docker
   ```

   If this is the first startup and the library table structure has not been initialized, run the `-volume` command (historical data needs to be manually migrated)

   ```bash
   $ yarn start:docker -volume
   ```

3. The preceding operations will delete the original container and image, and pull the latest image. If you want to restart the stopped container, you only need to start

   ```bash
   $ docker start <containerId>
   ```

visit: http://127.0.0.1:7002

## Documentation

Visit [Doraemon Docs](https://dtstack.github.io/doraemon/docsify/#/) for the full Doraemon documentation.

## Contributing

We welcome all contributions. Please read our [CONTRIBUTING.md](./CONTRIBUTING.md) first.

## ChangeLog

Detailed changes for each release are documented in the [ChangeLog.md](./CHANGELOG.md)

## License

[MIT](LICENSE)
