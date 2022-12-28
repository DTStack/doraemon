FROM node:14.17.4-slim

RUN mkdir -p /app/doraemon

# RUN set -x && \
#     echo "deb http://mirrors.aliyun.com/debian/ buster main non-free contrib" > /etc/apt/sources.list && \
#     echo "deb-src http://mirrors.aliyun.com/debian/ buster main non-free contrib" >> /etc/apt/sources.list && \
#     apt-get update && apt-get install -y --no-install-recommends \
#     inetutils-ping \
#     iproute2 \
#     vim \
#     ssh \
#     curl \
#     netcat-openbsd \
#     libltdl7 \
#     telnet \
#     net-tools \
#     && \
#     apt-get clean && \
#     rm -rf /var/lib/apt/lists/* 

COPY . /app/doraemon

WORKDIR /app/doraemon

CMD ["yarn", "server:docker"]

EXPOSE 7002