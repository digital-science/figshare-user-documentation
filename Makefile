DOCKER_EXE:=docker
DOCKER_BUILD_EXTRA_PARAMS:=
DOCKER_BUILD_PARAMS:=--ssh default ${DOCKER_BUILD_EXTRA_PARAMS}
CIMAGE_DEPLOYMENT_TAG:=figshare/user_documentation:deployment
CIMAGE_LATEST_TAG:=figshare/user_documentation:latest


install:
	cd swagger_documentation && pip install -r requirements.txt
.PHONY: install

format:
	black -l 120 -t py39 ./swagger_documentation
.PHONY: format

server:
	cd swagger_documentation && python -m http.server 8000
.PHONY: server

# Swagger/OpenAPI targets
swagger:
	cd swagger_documentation && python parsers.py swagger
.PHONY: swagger

docs:
	cd swagger_documentation/docs && python merge_docs_to_swagger.py
.PHONY: docs

client_samples_generate:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g html2 -o clients_generated_samples/
.PHONY: client_samples_generate

client_samples_parse:
	cd swagger_documentation && python parsers.py client_samples
.PHONY: client_samples_parse

client_samples:
	make client_samples_generate client_samples_parse
.PHONY: client_samples

swagger_build:
	make docs swagger client_samples clients
.PHONY: swagger_build

# Client generation targets
generate_client_go:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g go -o clients/go/
generate_client_java:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g java -o clients/java/
generate_client_csharp:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g csharp -o clients/csharp/
generate_client_php:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g php -o clients/php/
generate_client_perl:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g perl -o clients/perl/
generate_client_python:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g python -o clients/python/
generate_client_python-flask:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g python-flask -o clients/python-flask/
generate_client_javascript:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g javascript -o clients/javascript/
generate_client_typescript-axios:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g typescript-axios -o clients/typescript-axios/
generate_client_nodejs-server:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g nodejs-express-server -o clients/nodejs-server/
generate_client_ruby:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g ruby -o clients/ruby/
generate_client_html2:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g html2 -o clients/html2/
generate_client_swift:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g swift5 -o clients/swift/
generate_client_kotlin:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g kotlin -o clients/kotlin/
generate_client_rust:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g rust -o clients/rust/
generate_client_clojure:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g clojure -o clients/clojure/
generate_client_haskell:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g haskell-http-client -o clients/haskell/
generate_client_javascript-closure-angular:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g javascript-closure-angular -o clients/javascript-closure-angular/
generate_client_dynamic-html:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g dynamic-html -o clients/dynamic-html/
generate_client_go-server:
	cd swagger_documentation && java -jar openapi-generator-cli.jar generate -i swagger.json -g go-server -o clients/go-server/

# Client zip targets
zip_client_go:
	cd swagger_documentation/clients/go && zip -r ../go.zip *
zip_client_java:
	cd swagger_documentation/clients/java && zip -r ../java.zip *
zip_client_csharp:
	cd swagger_documentation/clients/csharp && zip -r ../csharp.zip *
zip_client_php:
	cd swagger_documentation/clients/php && zip -r ../php.zip *
zip_client_perl:
	cd swagger_documentation/clients/perl && zip -r ../perl.zip *
zip_client_python:
	cd swagger_documentation/clients/python && zip -r ../python.zip *
zip_client_python-flask:
	cd swagger_documentation/clients/python-flask && zip -r ../python-flask.zip *
zip_client_javascript:
	cd swagger_documentation/clients/javascript && zip -r ../javascript.zip *
zip_client_typescript-axios:
	cd swagger_documentation/clients/typescript-axios && zip -r ../typescript-axios.zip *
zip_client_nodejs-server:
	cd swagger_documentation/clients/nodejs-server && zip -r ../nodejs-server.zip *
zip_client_ruby:
	cd swagger_documentation/clients/ruby && zip -r ../ruby.zip *
zip_client_html2:
	cd swagger_documentation/clients/html2 && zip -r ../html2.zip *
zip_client_swift:
	cd swagger_documentation/clients/swift && zip -r ../swift.zip *
zip_client_kotlin:
	cd swagger_documentation/clients/kotlin && zip -r ../kotlin.zip *
zip_client_rust:
	cd swagger_documentation/clients/rust && zip -r ../rust.zip *
zip_client_clojure:
	cd swagger_documentation/clients/clojure && zip -r ../clojure.zip *
zip_client_haskell:
	cd swagger_documentation/clients/haskell && zip -r ../haskell.zip *
zip_client_javascript-closure-angular:
	cd swagger_documentation/clients/javascript-closure-angular && zip -r ../javascript-closure-angular.zip *
zip_client_dynamic-html:
	cd swagger_documentation/clients/dynamic-html && zip -r ../dynamic-html.zip *
zip_client_go-server:
	cd swagger_documentation/clients/go-server && zip -r ../go-server.zip *

# Client delete targets
delete_client_go:
	rm -rf swagger_documentation/clients/go/
delete_client_java:
	rm -rf swagger_documentation/clients/java/
delete_client_csharp:
	rm -rf swagger_documentation/clients/csharp/
delete_client_php:
	rm -rf swagger_documentation/clients/php/
delete_client_perl:
	rm -rf swagger_documentation/clients/perl/
delete_client_python:
	rm -rf swagger_documentation/clients/python/
delete_client_python-flask:
	rm -rf swagger_documentation/clients/python-flask/
delete_client_javascript:
	rm -rf swagger_documentation/clients/javascript/
delete_client_typescript-axios:
	rm -rf swagger_documentation/clients/typescript-axios/
delete_client_nodejs-server:
	rm -rf swagger_documentation/clients/nodejs-server/
delete_client_ruby:
	rm -rf swagger_documentation/clients/ruby/
delete_client_html2:
	rm -rf swagger_documentation/clients/html2/
delete_client_swift:
	rm -rf swagger_documentation/clients/swift/
delete_client_kotlin:
	rm -rf swagger_documentation/clients/kotlin/
delete_client_rust:
	rm -rf swagger_documentation/clients/rust/
delete_client_clojure:
	rm -rf swagger_documentation/clients/clojure/
delete_client_haskell:
	rm -rf swagger_documentation/clients/haskell/
delete_client_javascript-closure-angular:
	rm -rf swagger_documentation/clients/javascript-closure-angular/
delete_client_dynamic-html:
	rm -rf swagger_documentation/clients/dynamic-html/
delete_client_go-server:
	rm -rf swagger_documentation/clients/go-server/

# Aggregate client targets
generate_client_dirs:
	make generate_client_go generate_client_java generate_client_csharp generate_client_php generate_client_perl generate_client_python generate_client_python-flask generate_client_javascript generate_client_typescript-axios generate_client_nodejs-server generate_client_ruby generate_client_html2 generate_client_swift generate_client_kotlin generate_client_rust generate_client_clojure generate_client_haskell generate_client_javascript-closure-angular generate_client_dynamic-html generate_client_go-server
.PHONY: generate_client_dirs

zip_client_dirs:
	make zip_client_go zip_client_java zip_client_csharp zip_client_php zip_client_perl zip_client_python zip_client_python-flask zip_client_javascript zip_client_typescript-axios zip_client_nodejs-server zip_client_ruby zip_client_html2 zip_client_swift zip_client_kotlin zip_client_rust zip_client_clojure zip_client_haskell zip_client_javascript-closure-angular zip_client_dynamic-html zip_client_go-server
.PHONY: zip_client_dirs

delete_client_dirs:
	make delete_client_go delete_client_java delete_client_csharp delete_client_php delete_client_perl delete_client_python delete_client_python-flask delete_client_javascript delete_client_typescript-axios delete_client_nodejs-server delete_client_ruby delete_client_html2 delete_client_swift delete_client_kotlin delete_client_rust delete_client_clojure delete_client_haskell delete_client_javascript-closure-angular delete_client_dynamic-html delete_client_go-server
.PHONY: delete_client_dirs

clean:
	rm -rf swagger_documentation/clients/*
.PHONY: clean

clients:
	make docs generate_client_dirs zip_client_dirs delete_client_dirs
.PHONY: clients

# Docker targets
container-images:
	${DOCKER_EXE} build ${DOCKER_BUILD_PARAMS} -t ${CIMAGE_DEPLOYMENT_TAG} --target deployment .
	${DOCKER_EXE} build ${DOCKER_BUILD_PARAMS} -t ${CIMAGE_LATEST_TAG} .
.PHONY: container_images

container-build:
	${DOCKER_EXE} run --rm -v $(PWD):/app ${CIMAGE_DEPLOYMENT_TAG} make swagger_build
.PHONY: container_build
