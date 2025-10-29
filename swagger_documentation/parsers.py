import json, os, sys
from collections import OrderedDict
from lxml import html
from lxml.etree import tostring


class SwaggerParser:
    """Parser for Swagger/OpenAPI JSON files"""

    def __init__(self, input_file="swagger.json"):
        self.input_file = input_file
        self.swagger_data = None

    def json_read(self, path):
        """Read JSON file and return OrderedDict"""
        with open(path, "r") as f:
            return json.loads(f.read(), object_pairs_hook=OrderedDict)

    def json_write(self, path, data):
        """Write data to JSON file"""
        with open(path, "w") as outfile:
            json.dump(data, outfile, indent=4)

    def parse_models(self, models):
        """Parse and merge model schemas with allOf references"""
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

    def parse_paths(self, paths):
        """Parse paths and merge path-level parameters into method-level parameters"""
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

    def parse(self, output_file="swagger_parsed.json", copy_file="swagger.json"):
        """Main parsing method"""
        # Read swagger JSON
        self.swagger_data = self.json_read(self.input_file)

        # Write copy of original
        self.json_write(copy_file, self.swagger_data)

        # Parse models if they exist
        if "components" in self.swagger_data and "schemas" in self.swagger_data["components"]:
            self.swagger_data["components"]["schemas"] = self.parse_models(self.swagger_data["components"]["schemas"])

        # Parse paths if they exist
        if "paths" in self.swagger_data:
            self.swagger_data["paths"] = self.parse_paths(self.swagger_data["paths"])

        # Write parsed output
        self.json_write(output_file, self.swagger_data)

        return self.swagger_data


class ClientSampleCodeParser:
    """Parser for client sample code from generated HTML documentation"""

    def __init__(self, input_html="clients_generated_samples/index.html"):
        self.input_html = input_html
        self.sample_code = {}

    def get_api_operation_id(self, name):
        """Extract operation ID from element name"""
        name = name[: len(name) - 2]
        name = name[name.rfind("-") + 1 :]
        return name

    def parse(self, output_file="sample_code.json"):
        """Parse HTML and extract sample code for each API operation"""
        # Read HTML file
        with open(self.input_html, "r") as f:
            page = f.read()

        # Parse HTML
        tree = html.fromstring(page)
        sections = tree.get_element_by_id("sections")

        # Extract sample code from each section
        for section in sections.findall("section"):
            for div in section.findall("div/article"):
                operation_id = self.get_api_operation_id(div.attrib["id"])
                nav_tab = div.find_class("nav-tabs-examples")[0]
                tab_content = div.find_class("tab-content")[0]
                self.sample_code[operation_id] = (tostring(nav_tab).decode(), tostring(tab_content).decode())

        # Write to JSON file
        with open(output_file, "w") as outfile:
            json.dump(self.sample_code, outfile)

        return self.sample_code


if __name__ == "__main__":
    command = sys.argv[1]

    if command == "swagger":
        swagger_parser = SwaggerParser(input_file="swagger.json")
        swagger_parser.parse(output_file="swagger_parsed.json", copy_file="swagger.json")

    if command == "client_samples":
        client_parser = ClientSampleCodeParser(input_html="clients_generated_samples/index.html")
        client_parser.parse(output_file="sample_code.json")
