#!/bin/bash
source ./const.sh
source ./utils.sh

# 导入 sql 文件
soucreSql() {
    containerId=$(docker ps -a | grep $image_mysql | awk '{print $1}')
    mysql_path=/app/doraemon/doraemon.sql
    docker exec -i $containerId mysql -uroot -p$mysql_pwd <<EOF
    source $mysql_path;
    ALTER USER 'root' IDENTIFIED WITH mysql_native_password BY '$mysql_pwd';
    FLUSH PRIVILEGES;
EOF
}

# 启动容器
reRunContainer() {
    imageName=$1:$version

    # 停止并删除原有容器和镜像
    rmContainer $1 $version

    # 拉取镜像
    docker image pull $imageName

    # 启动
    if [[ $imageName =~ $image_web ]]; then
        docker run -d --net=host $imageName
    else
        docker run -d \
            --name="doraemon_mysql" \
            -v $v_path:/var/lib/mysql \
            -e MYSQL_ROOT_HOST=% \
            -e MYSQL_ROOT_PASSWORD=$mysql_pwd \
            -p 3302:3306 \
            $imageName

        sleep 11
        if [[ $2 == '-volume' ]]; then
            mkdir -p $v_path
            soucreSql
        fi
    fi
}

if [[ $1 == 'web' ]]; then
    reRunContainer $image_web
elif [[ $1 == 'mysql' ]]; then
    reRunContainer $image_mysql $2
fi
