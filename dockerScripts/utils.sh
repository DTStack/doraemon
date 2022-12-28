rmContainer () {
    imageName=$1:$2
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
}
export -f rmContainer