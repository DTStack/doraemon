#!/bin/bash
source ./const.sh

imageName=$image_web:$version

docker build -t $imageName ../

docker push $imageName
