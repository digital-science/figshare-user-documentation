# Stage 1: Build the static documentation assets
FROM debian:11-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-dev \
    python3-pip \
    python3-venv \
    openjdk-17-jre \
    build-essential \
    libxml2-dev \
    libxslt-dev \
    zip \
    make \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN python3 -m venv /virtualenv
ENV PATH="/virtualenv/bin:$PATH"

ARG ENV_PARAM=development
ARG API_URL=api.figshare.network
ARG API_SCHEME=https

ENV ENV_PARAM=${ENV_PARAM}
ENV API_URL=${API_URL}
ENV API_SCHEME=${API_SCHEME}

RUN pip install --no-cache-dir mkdocs black
RUN make install ENV=${ENV_PARAM}
RUN make swagger_install
RUN make build
RUN make swagger_build API_URL=${API_URL} API_SCHEME=${API_SCHEME} 

# Stage 2: Serve the static site using Nginx
FROM 942286566325.dkr.ecr.eu-west-1.amazonaws.com/figshare/nginx:1.18 AS deployment
COPY --from=build /app/swagger_documentation /usr/share/nginx/html
EXPOSE 80
