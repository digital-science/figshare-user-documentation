ARG registry=942286566325.dkr.ecr.eu-west-1.amazonaws.com
FROM ${registry}/figshare/debian:11 AS build
LABEL org.opencontainers.image.source https://github.com/figshare/user_documentation

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-dev \
    python3-pip \
    python3-venv \
    openjdk-17-jre \
    build-essential \
    libxml2-dev \
    libxslt-dev \
    zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /virtualenv
ENV PATH="/virtualenv/bin:$PATH"

# Install Python dependencies
RUN pip install --no-cache-dir mkdocs black

# Install additional dependencies for swagger documentation
RUN make install
RUN make swagger_install

FROM build as development

# Make the swagger documentation
RUN make build
RUN make swagger_build

# Expose port 8000 for the server
EXPOSE 8000

# Set the default command to run when the container starts
CMD ["make", "server"]

FROM ${registry}/figshare/nginx:1.18 AS deployment

# Copy the built documentation from the build stage
COPY --from=development /app /app
