DOCKER_EXE:=docker
DOCKER_BUILD_EXTRA_PARAMS:=
DOCKER_BUILD_PARAMS:=--ssh default --build-arg "DEPHASH=${DEPHASH}" ${DOCKER_BUILD_EXTRA_PARAMS}
TESTS_CONTAINER_NAME:=tests.user_documentation
CIMAGE_DEPLOYMENT_TAG:=figshare/user_documentation:deployment
CIMAGE_LATEST_TAG:=figshare/user_documentation:latest
CONFIGS_DIR:=./auto/configs

build:
	mkdocs build
.PHONY: build

publish:
	mkdocs gh-deploy
.PHONY: publish

server:
	cd swagger_documentation && python -m http.server 8000
.PHONY: server

install:
	pip install mkdocs
.PHONY: install

format:
	 black -l 120 -t py39 ./swagger_documentation
.PHONY: format

swagger_build:
	cd swagger_documentation && make documentation
.PHONY: swagger_build

swagger_install:
	cd swagger_documentation && make install
.PHONY: swagger_install

container-images:
	${DOCKER_EXE} build ${DOCKER_BUILD_PARAMS} --target build -t figshare/user_documentation:build .
	${DOCKER_EXE} build ${DOCKER_BUILD_PARAMS} --target development -t ${CIMAGE_LATEST_TAG} .
	${DOCKER_EXE} build ${DOCKER_BUILD_PARAMS} --target deployment -t ${CIMAGE_DEPLOYMENT_TAG} .
.PHONY: container-images

container_build:
	${DOCKER_EXE} run --rm -v $(PWD):/app figshare/user_documentation:build make build
	${DOCKER_EXE} run --rm -v $(PWD):/app figshare/user_documentation:build make swagger_build
.PHONY: container_build
