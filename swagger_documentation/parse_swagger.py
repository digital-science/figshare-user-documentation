import json
import os
import sys
from collections import OrderedDict


def json_read(path):
    return json.loads(open(path).read(), object_pairs_hook=OrderedDict)


def json_write(path, data):
    with open(os.getcwd() + path, "w") as outfile:
        json.dump(data, outfile, indent=4)


def parse_models(models):
    for model_name in list(models.keys()):
        model = models[model_name]
        new_model = model
        if "allOf" in list(model.keys()):
            # Ensure new_model has properties key before trying to update it
            if "properties" not in new_model:
                new_model["properties"] = OrderedDict()

            for reference in model["allOf"]:
                if "$ref" in reference:
                    ref_name = reference["$ref"]
                    ref_name = ref_name[ref_name.rfind("/") + 1 :]
                    # Only update if the referenced model has properties
                    if ref_name in models and "properties" in models[ref_name]:
                        new_model["properties"].update(OrderedDict(models[ref_name]["properties"]))
                # Handle inline schemas in allOf
                elif "properties" in reference:
                    new_model["properties"].update(OrderedDict(reference["properties"]))
        models[model_name] = new_model
    return models


def parse_paths(paths):
    for path_name in list(paths.keys()):
        path = paths[path_name]
        if "parameters" in list(path.keys()):
            additional_params = path["parameters"]
            methods = ["get", "post", "put", "delete"]
            for method in methods:
                if method in list(path.keys()):
                    if "parameters" in list(path[method].keys()):
                        path[method]["parameters"].extend(additional_params)
                    else:
                        path[method]["parameters"] = additional_params
        paths[path_name] = path
    return paths


def main(argv):
    swagger = json_read("swagger.json")
    swagger["servers"] = [{"url": f"{argv[1]}://{argv[0]}"}]

    json_write("/swagger.json", swagger)

    if "components" in swagger and "schemas" in swagger["components"]:
        swagger["components"]["schemas"] = parse_models(swagger["components"]["schemas"])

    if "paths" in swagger:
        swagger["paths"] = parse_paths(swagger["paths"])

    json_write("/swagger_parsed.json", swagger)


if __name__ == "__main__":
    main(sys.argv[1:])
