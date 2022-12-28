# 使用 Docker 部署（仅支持 Linux）

## 构建镜像（如果镜像已在 Docker Hub 中，可跳过此步）

1. 修改根目录的 `env.json` 文件中的 `mysql` 配置，该配置项需要和 `./dockerScripts/docker_start.sh` 中 mysql 镜像的启动命令配置保持一致，默认配置如下
   ```json
   "mysql": {
       "docker": {
           "database": "doraemon",
           "host": "0.0.0.0",
           "port": "3302",
           "password": "******"
       }
   }
   ```
   mysql 镜像的 docker run 默认如下
   ```bash
   docker run -d \
       --name="doraemon_mysql" \
       -v $v_path:/var/lib/mysql \
       -e MYSQL_ROOT_HOST=% \
       -e MYSQL_ROOT_PASSWORD=$mysql_pwd \
       -p 3302:3306 \
       $imageName
   ```
2. 修改 `./dockerScripts/const.sh` 文件配置的镜像信息（`image_mysql`, `image_web`, `version` 等）

3. 执行 build 命令

   ```bash
   $ yarn build:docker
   ```

4. 待构建完成并推到仓库后，登入部署服务器，拉取镜像并启动容器

## 启动镜像

1. 登入部署服务器，进到 `dockerScripts` 文件夹下，修改 `const.sh` 文件中 `v_path` (数据卷的存储路径)

2. 启动容器
   回到根目录下，执行启动命令，拉取最新镜像，并启动

   ```bash
   $ yarn start:docker
   ```

   如果是第一次启动，尚未初始化库表结构，请执行 `-volume` 命令（历史数据需手动迁移）

   ```bash
   $ yarn start:docker -volume
   ```

3. 上述操作会删除原有容器和镜像，拉取最新镜像，如果只是重启停止的容器，仅需要 start 即可

   ```bash
   $ docker start <containerId>
   ```

4. 如遇到容器启动失败，请根据错误提示停止或者删除容器及镜像，在重新执行 `start:docker` 命令

## 访问

1. 访问地址: http://127.0.0.1:7002
2. 如需修改端口，需修改 `package.json` 启动脚本中的 `server:docker` 配置，并重新构建镜像

## 配置及脚本详解

涉及到的配置及脚本有以下几个文件

- env.json
- dockerScripts/const.sh
- dockerScripts/docker_start.sh
- dockerScripts/make.sh

#### env.json

这里涉及到的是数据库相关信息的配置，若使用项目提供的 mysql 镜像，则需要和 mysql 容器的数据库信息相匹配，若使用服务器上的数据库信息，则配置对应的 database, password 等信息，重新执行 `sh make_web.sh` 构建 web 镜像。
`env.json` 文件修改后，都需要重新构建镜像，不推荐。

#### dockerScripts/const.sh

- `image_mysql`: mysql 镜像名
- `image_web`: web 镜像名
- `version`: 镜像版本号
- `mysql_pwd`: mysql 容器默认设置的 root 账号密码(需和 env.json 中 mysql password 保持一致)
- `v_path`: mysql 数据存储路径

#### dockerScripts/docker_start.sh

**传参详解**
容器启动脚本，支持两个传参

- `$1`: web / mysql，用于区分启动容器类型
- `$2`: -volume，用于初始化数据库表结构
  执行该命令，会启动 web 容器

```bash
sh docker_start.sh web
```

执行该命令，会启动 mysql 容器，并初始化数据库表结构

```bash
sh docker_start.sh mysql -volume
```

**启动命令详解**

```bash
 docker run -d \
    --name="doraemon_mysql" \
    -v $v_path:/var/lib/mysql \
    -e MYSQL_ROOT_HOST=% \
    -e MYSQL_ROOT_PASSWORD=$mysql_pwd \
    -p 3302:3306 \
    $imageName
```

- `-v`: `-v <宿主存储路径>:<容器内部路径>`
- `-e`: 指定 root 的 password
- `-p`: `-p <宿主端口>:<容器端口>` 此处对外映射 3302 端口

#### dockerScripts/make_web.sh

该脚本执行了两个操作 `docker build`, `docker push`。可根据实际需求处理。
