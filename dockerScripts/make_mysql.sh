source ./const.sh

imageName=$image_mysql:$version

docker build -t $imageName ../sql

docker push $imageName