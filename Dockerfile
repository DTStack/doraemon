FROM node:slim

RUN mkdir -p /app/doraemon

COPY . /app/doraemon

WORKDIR /app/doraemon

CMD ["yarn", "server:docker"]

EXPOSE 7002