DOCKER_EXE:=docker
DOCKER_BUILD_EXTRA_PARAMS:=
DOCKER_BUILD_PARAMS:=--ssh default ${DOCKER_BUILD_EXTRA_PARAMS}
CIMAGE_DEPLOYMENT_TAG:=figshare/user_documentation:deployment
CIMAGE_LATEST_TAG:=figshare/user_documentation:latest

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
	${DOCKER_EXE} build ${DOCKER_BUILD_PARAMS} -t ${CIMAGE_DEPLOYMENT_TAG} --target deployment .
	${DOCKER_EXE} build ${DOCKER_BUILD_PARAMS} -t ${CIMAGE_LATEST_TAG} .
.PHONY: container_images

container-build:
	${DOCKER_EXE} run --rm -v $(PWD):/app ${CIMAGE_DEPLOYMENT_TAG} make build
	${DOCKER_EXE} run --rm -v $(PWD):/app ${CIMAGE_DEPLOYMENT_TAG} make swagger_build
.PHONY: container_build
