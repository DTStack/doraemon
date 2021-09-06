FROM node:15.12.0

RUN mkdir -p /app/doraemon

COPY . /app/doraemon

WORKDIR /app/doraemon

# RUN ["yarn"]

# RUN ["yarn", "build"]

CMD ["yarn", "server:docker"]

EXPOSE 7002