source ./const.sh

imageName=$image_mysql:$version

docker build -t $imageName ../

docker push $imageName
