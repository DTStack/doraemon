source ./const.sh

# 导入 sql 文件
soucreSql() {
    containerId=$(docker ps -a | grep $image_mysql | awk '{print $1}')
    docker exec -i $containerId mysql -uroot -p$mysql_pwd <<EOF
    source $mysql_path;
    ALTER USER 'root' IDENTIFIED WITH mysql_native_password BY '$mysql_pwd';
    FLUSH PRIVILEGES;
EOF
}

# 启动容器
reRunContainer() {
    imageName=$1:$version

    # 停止容器并删除
    containerId=$(docker ps -a | grep $imageName | awk '{print $1}')
    if [[ $containerId ]]; then
        docker stop $containerId
        docker rm $containerId
    fi

    # 删除老镜像
    imageId=$(docker images | grep $1 | awk '{print $3}')
    if [[ $imageId ]]; then
        docker rmi $imageId
    fi

    # 拉取镜像
    docker image pull $imageName

    # 启动
    if [[ $imageName =~ $image_web ]]; then
        docker run -d --link doraemon_mysql:doraemon_mysql -p 7001:7001 $imageName
    else
        mkdir -p $v_path
        docker run -d --name="doraemon_mysql" -v $v_path:/var/lib/mysql -e MYSQL_ROOT_HOST=% -e MYSQL_ROOT_PASSWORD=$mysql_pwd -p 3302:3306 $imageName
        sleep 11
        soucreSql
    fi
}

# reRunContainer $image_mysql
reRunContainer $image_web
