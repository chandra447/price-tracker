FROM alpine:latest

ARG PB_VERSION=0.26.5 # Using a recent stable version, adjust if needed

RUN apk add --no-cache \
    unzip \
    ca-certificates \
    wget # Added wget for healthcheck

# download and unzip PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_arm64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && rm /tmp/pb.zip

# uncomment to copy the local pb_migrations dir into the image
# COPY ./pb_migrations /pb/pb_migrations

# uncomment to copy the local pb_hooks dir into the image
# COPY ./pb_hooks /pb/pb_hooks

EXPOSE 8090

# start PocketBase
# Default command, can be overridden in docker-compose.yml
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
