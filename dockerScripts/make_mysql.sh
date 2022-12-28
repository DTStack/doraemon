#!/bin/bash
source ./const.sh
source ./utils.sh

imageName=$image_mysql:$version

# 停止并删除原有容器和镜像
rmContainer $image_mysql $version

docker build -t $imageName ../sql

docker push $imageName