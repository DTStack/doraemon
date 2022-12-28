#!/bin/bash
source ./const.sh
source ./utils.sh

imageName=$image_web:$version

# 停止并删除原有容器和镜像
rmContainer $image_web $version
# 构建镜像
docker build -t $imageName ../
# 推到仓库
docker push $imageName
