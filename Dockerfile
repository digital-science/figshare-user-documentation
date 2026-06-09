# Stage 1: Build the static documentation assets
FROM debian:11-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jre \
    build-essential \
    libxml2-dev \
    libxslt-dev \
    zip \
    make \
    wget \
    zlib1g-dev libncurses5-dev libgdbm-dev libnss3-dev \
    libreadline-dev libffi-dev libsqlite3-dev libbz2-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Build Python 3.12 from source (Debian 11 ships with Python 3.9)
ENV VIRTUAL_ENV=/virtualenv
ARG PYTHON_VERSION=3.12.3
RUN wget -q https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tgz \
    && tar -xzf Python-${PYTHON_VERSION}.tgz \
    && cd Python-${PYTHON_VERSION} \
    && ./configure --quiet \
    && make -j$(nproc) \
    && make altinstall \
    && cd .. && rm -rf Python-${PYTHON_VERSION} Python-${PYTHON_VERSION}.tgz

RUN python3.12 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN pip install --upgrade "pip==24.0"

COPY . .

ARG ENV_PARAM=development
ARG API_URL=api.figshare.network
ARG API_SCHEME=https

ENV ENV_PARAM=${ENV_PARAM}
ENV API_URL=${API_URL}
ENV API_SCHEME=${API_SCHEME}

RUN make install ENV=${ENV_PARAM}
RUN make swagger_build API_URL=${API_URL} API_SCHEME=${API_SCHEME}

# Stage 2: Serve the static site using Nginx
FROM 942286566325.dkr.ecr.eu-west-1.amazonaws.com/figshare/nginx:1.18 AS deployment
COPY --from=build /app/swagger_documentation /usr/share/nginx/html
EXPOSE 80
