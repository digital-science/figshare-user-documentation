import copy, os, yaml, json, sys
from pathlib import Path


class SwaggerDocsMerger:
    """Merges split OpenAPI YAML files into a single swagger.json file"""

    def __init__(self):
        self.api_url = os.getenv("API_URL", "api.figsh.com")
        self.api_scheme = os.getenv("API_SCHEME", "https")
        self.merged = {}

    def load_yaml(self, file_path):
        """Load a YAML file"""
        with open(file_path, "r") as f:
            return yaml.safe_load(f)

    def merge_docs_to_swagger(self, output_file="../swagger.json"):
        """Merge split OpenAPI files back into a single file"""

        # Load the base file
        base = self.load_yaml("swagger-source.yaml")

        # Construct servers from API_URL and API_SCHEME if provided, otherwise use base servers if available
        servers = []
        if self.api_url and self.api_scheme:
            servers = [{"url": f"{self.api_scheme}://{self.api_url}/v2"}]
        elif "servers" in base:
            servers = base["servers"]

        # Initialize the merged structure with all fields from base
        self.merged = {
            "openapi": base["openapi"],
            "info": base["info"],
            "servers": servers,
            "paths": {},
            "components": {"schemas": {}, "securitySchemes": {}},
        }

        # Preserve any custom/extension fields from base (x-* fields)
        for key, value in base.items():
            if key.startswith("x-"):
                self.merged[key] = value

        # Merge all path files
        self._merge_paths()

        # Merge schemas
        self._merge_schemas()

        # Merge security schemes
        self._merge_security()

        # Save as JSON with proper formatting (4 spaces indent to match original)
        self._save_json(output_file)

        return self.merged

    def _merge_paths(self):
        """Merge all path YAML files"""
        paths_dir = Path("paths")
        paths = sorted(paths_dir.glob("*.yaml"))

        for path_file in paths:
            data = self.load_yaml(path_file)
            if "paths" in data:
                self.merged["paths"].update(data["paths"])

    def _merge_schemas(self):
        """Merge schema components"""
        schemas_file = Path("components/schemas.yaml")
        if schemas_file.exists():
            schemas_data = self.load_yaml(schemas_file)
            if "schemas" in schemas_data:
                self.merged["components"]["schemas"] = schemas_data["schemas"]

    def _merge_security(self):
        """Merge security scheme components"""
        security_file = Path("components/security.yaml")
        if security_file.exists():
            security_data = self.load_yaml(security_file)
            if "securitySchemes" in security_data:
                self.merged["components"]["securitySchemes"] = security_data["securitySchemes"]

    def _save_json(self, output_file):
        """Save merged data as JSON"""
        with open(output_file, "w") as f:
            json.dump(self.merged, f, indent=4, ensure_ascii=False)


if __name__ == "__main__":
    merger = SwaggerDocsMerger()
    merger.merge_docs_to_swagger()
