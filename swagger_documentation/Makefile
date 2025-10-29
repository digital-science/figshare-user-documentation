API_URL=api.figinternal.dev
API_SCHEME=https

install:
	pip install -r requirements.txt

swagger:
	python parse_swagger.py ${API_URL} ${API_SCHEME}

client_samples_generate:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g html2 -o html2/
client_samples_parse:
	python parse_client_sample_codes.py
client_samples:
	make client_samples_generate client_samples_parse

documentation_directories:
	cd documentation/ && python generate_dir_from_swagger.py

documentation: swagger client_samples clients


generate_client_go:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g go -o clients/go/
generate_client_java:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g java -o clients/java/
generate_client_csharp:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g csharp -o clients/csharp/
generate_client_php:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g php -o clients/php/
generate_client_perl:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g perl -o clients/perl/
generate_client_python:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g python -o clients/python/
generate_client_python-flask:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g python-flask -o clients/python-flask/
generate_client_javascript:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g javascript -o clients/javascript/
generate_client_typescript-axios:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g typescript-axios -o clients/typescript-axios/
generate_client_nodejs-server:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g nodejs-express-server -o clients/nodejs-server/
generate_client_ruby:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g ruby -o clients/ruby/
generate_client_html2:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g html2 -o clients/html2/
generate_client_swift:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g swift5 -o clients/swift/
generate_client_kotlin:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g kotlin -o clients/kotlin/
generate_client_rust:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g rust -o clients/rust/
generate_client_clojure:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g clojure -o clients/clojure/
generate_client_haskell:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g haskell-http-client -o clients/haskell/
generate_client_javascript-closure-angular:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g javascript-closure-angular -o clients/javascript-closure-angular/
generate_client_dynamic-html:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g dynamic-html -o clients/dynamic-html/
generate_client_go-server:
	java -jar openapi-generator-cli.jar generate -i openapi.json -g go-server -o clients/go-server/


zip_client_go:
	cd clients/go; zip -r ../go.zip *
zip_client_java:
	cd clients/java; zip -r ../java.zip *
zip_client_csharp:
	cd clients/csharp; zip -r ../csharp.zip *
zip_client_php:
	cd clients/php; zip -r ../php.zip *
zip_client_perl:
	cd clients/perl; zip -r ../perl.zip *
zip_client_python:
	cd clients/python; zip -r ../python.zip *
zip_client_python-flask:
	cd clients/python-flask; zip -r ../python-flask.zip *
zip_client_javascript:
	cd clients/javascript; zip -r ../javascript.zip *
zip_client_typescript-axios:
	cd clients/typescript-axios; zip -r ../typescript-axios.zip *
zip_client_nodejs-server:
	cd clients/nodejs-server; zip -r ../nodejs-server.zip *
zip_client_ruby:
	cd clients/ruby; zip -r ../ruby.zip *
zip_client_html2:
	cd clients/html2; zip -r ../html2.zip *
zip_client_swift:
	cd clients/swift; zip -r ../swift.zip *
zip_client_kotlin:
	cd clients/kotlin; zip -r ../kotlin.zip *
zip_client_rust:
	cd clients/rust; zip -r ../rust.zip *
zip_client_clojure:
	cd clients/clojure; zip -r ../clojure.zip *
zip_client_haskell:
	cd clients/haskell; zip -r ../haskell.zip *
zip_client_javascript-closure-angular:
	cd clients/javascript-closure-angular; zip -r ../javascript-closure-angular.zip *
zip_client_dynamic-html:
	cd clients/dynamic-html; zip -r ../dynamic-html.zip *
zip_client_go-server:
	cd clients/go-server; zip -r ../go-server.zip *


delete_client_go:
	rm -r clients/go/
delete_client_java:
	rm -r clients/java/
delete_client_csharp:
	rm -r clients/csharp/
delete_client_php:
	rm -r clients/php/
delete_client_perl:
	rm -r clients/perl/
delete_client_python:
	rm -r clients/python/
delete_client_python-flask:
	rm -r clients/python-flask/
delete_client_javascript:
	rm -r clients/javascript/
delete_client_typescript-axios:
	rm -r clients/typescript-axios/
delete_client_nodejs-server:
	rm -r clients/nodejs-server/
delete_client_ruby:
	rm -r clients/ruby/
delete_client_html2:
	rm -r clients/html2/
delete_client_swift:
	rm -r clients/swift/
delete_client_kotlin:
	rm -r clients/kotlin/
delete_client_rust:
	rm -r clients/rust/
delete_client_clojure:
	rm -r clients/clojure/
delete_client_haskell:
	rm -r clients/haskell/
delete_client_javascript-closure-angular:
	rm -r clients/javascript-closure-angular/
delete_client_dynamic-html:
	rm -r clients/dynamic-html/
delete_client_go-server:
	rm -r clients/go-server/


generate_client_dirs:
	make generate_client_go generate_client_java generate_client_csharp generate_client_php generate_client_perl generate_client_python generate_client_python-flask generate_client_javascript generate_client_typescript-axios generate_client_nodejs-server generate_client_ruby generate_client_html2 generate_client_swift generate_client_kotlin generate_client_rust generate_client_clojure generate_client_haskell generate_client_javascript-closure-angular generate_client_dynamic-html generate_client_go-server
zip_client_dirs:
	make zip_client_go zip_client_java zip_client_csharp zip_client_php zip_client_perl zip_client_python zip_client_python-flask zip_client_javascript zip_client_typescript-axios zip_client_nodejs-server zip_client_ruby zip_client_html2 zip_client_swift zip_client_kotlin zip_client_rust zip_client_clojure zip_client_haskell zip_client_javascript-closure-angular zip_client_dynamic-html zip_client_go-server
delete_client_dirs:
	make delete_client_go delete_client_java delete_client_csharp delete_client_php delete_client_perl delete_client_python delete_client_python-flask delete_client_javascript delete_client_typescript-axios delete_client_nodejs-server delete_client_ruby delete_client_html2 delete_client_swift delete_client_kotlin delete_client_rust delete_client_clojure delete_client_haskell delete_client_javascript-closure-angular delete_client_dynamic-html delete_client_go-server

clean:
	rm -r clients/*

clients:
	make generate_client_dirs zip_client_dirs delete_client_dirs


.PHONY: configure swagger client_samples documentation_directories documentation clients
