import copy, os, yaml, json
from pathlib import Path


def load_yaml(file_path):
    """Load a YAML file"""
    with open(file_path, "r") as f:
        return yaml.safe_load(f)


def merge_docs_to_swagger():
    """merge split OpenAPI files back into a single file ../swagger.json"""

    # Load the base file
    base = load_yaml("openapi-source.yaml")

    # Initialize the merged structure with all fields from base
    merged = {
        "openapi": base["openapi"],
        "info": base["info"],
        "servers": base["servers"],
        "paths": {},
        "components": {"schemas": {}, "securitySchemes": {}},
    }

    # Preserve any custom/extension fields from base (x-* fields)
    for key, value in base.items():
        if key.startswith("x-"):
            merged[key] = value

    # Merge all path files
    paths_dir = Path("paths")
    paths = sorted(paths_dir.glob("*.yaml"))

    # Merge all path files (symplectic is ignored)
    # paths_for_swagger = [p for p in paths if p.name != 'symplectic.yaml']
    # merged_for_swagger = copy.deepcopy(merged)

    for path_file in paths:
        data = load_yaml(path_file)
        if "paths" in data:
            merged["paths"].update(data["paths"])

    # Merge schemas
    schemas_file = Path("components/schemas.yaml")
    if schemas_file.exists():
        schemas_data = load_yaml(schemas_file)
        if "schemas" in schemas_data:
            merged["components"]["schemas"] = schemas_data["schemas"]

    # Merge security schemes
    security_file = Path("components/security.yaml")
    if security_file.exists():
        security_data = load_yaml(security_file)
        if "securitySchemes" in security_data:
            merged["components"]["securitySchemes"] = security_data["securitySchemes"]

    # Save as JSON with proper formatting (4 spaces indent to match original)
    output_json = "../swagger.json"
    with open(output_json, "w") as f:
        json.dump(merged, f, indent=4, ensure_ascii=False)


if __name__ == "__main__":
    # Change to the script's directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    merge_docs_to_swagger()
