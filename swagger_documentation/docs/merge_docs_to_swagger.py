import copy, os, yaml, json, sys, re
from pathlib import Path
from typing import Dict, Any


class SwaggerDocsMerger:
    """Merges split OpenAPI YAML files into a single swagger.json file with version support"""

    def __init__(self):
        self.api_url = os.getenv("API_URL")
        self.api_scheme = os.getenv("API_SCHEME", "https")
        self.merged = {}
        self.versions_config = self._load_versions_config()

    def _load_versions_config(self) -> Dict[str, Any]:
        """Load version configuration from versions_config.yaml"""
        config_file = Path("versions_config.yaml")
        if not config_file.exists():
            print("Warning: versions_config.yaml not found, using default configuration")
            return {
                "default_version": "2.0",
                "versions": {"2.0": {"deprecated": False, "description": "Current API version"}},
            }

        with open(config_file, "r") as f:
            return yaml.safe_load(f)

    def load_yaml(self, file_path):
        """Load a YAML file"""
        with open(file_path, "r") as f:
            return yaml.safe_load(f)

    def merge_docs_to_swagger(self, output_file="../swagger.json"):
        """Merge split OpenAPI files back into a single file and generate versioned files"""

        # Generate all versioned documentation files
        versions = self.versions_config.get("versions", {})
        default_version = self.versions_config.get("default_version", "2.0")

        # Create versions directory if it doesn't exist
        versions_dir = Path("versions")
        versions_dir.mkdir(exist_ok=True)

        # Generate a swagger file for each version in the versions/ directory
        for version in versions.keys():
            print(f"Generating documentation for version {version}...")
            version_output_file = f"versions/swagger_v{version}.json"
            self._merge_version_docs(version, version_output_file)

        # Create the default swagger.json from the default_version
        print(f"Generating default swagger.json (version {default_version})...")
        self.merged = self._merge_version_docs(default_version, output_file)

        # Create a versions manifest file
        self._create_versions_manifest()

        print(f"\nSuccessfully generated documentation for {len(versions)} version(s)")
        print(f"Versioned files are in: docs/versions/")
        print(f"Default file (v{default_version}): swagger_documentation/swagger.json")

        return self.merged

    def _merge_version_docs(self, version: str, output_file: str):
        """Merge documentation for a specific version"""

        # Load the base file
        base = self.load_yaml("swagger-source.yaml")

        # Construct servers from API_URL and API_SCHEME if provided
        servers = []
        if self.api_url and self.api_scheme:
            servers = [{"url": f"{self.api_scheme}://{self.api_url}/v2"}]
        elif "servers" in base:
            servers = base["servers"]

        # Update version info in the documentation
        version_info = self.versions_config.get("versions", {}).get(version, {})
        info = copy.deepcopy(base.get("info", {}))
        info["version"] = version

        # Add deprecation notice to description if version is deprecated
        if version_info.get("deprecated"):
            deprecation_notice = f"\n\n**DEPRECATED**: This version is deprecated"
            if version_info.get("sunset"):
                deprecation_notice += f" and will be sunset on {version_info['sunset']}"
            if version_info.get("successor"):
                deprecation_notice += f". Please migrate to version {version_info['successor']}"
            deprecation_notice += "."

            info["description"] = info.get("description", "") + deprecation_notice

        # Initialize the merged structure
        merged = {
            "openapi": base["openapi"],
            "info": info,
            "servers": servers,
            "paths": {},
            "components": {
                "schemas": {},
                "securitySchemes": {},
                "parameters": {},
                "requestBodies": {},
                "responses": {},
                "headers": {},
                "examples": {},
                "links": {},
                "callbacks": {},
            },
        }

        # Preserve any custom/extension fields from base (x-* fields)
        for key, value in base.items():
            if key.startswith("x-"):
                merged[key] = value

        # Set x-original-swagger-version to the current version being generated
        merged["x-original-swagger-version"] = version

        # Merge base paths first
        self._merge_paths_versioned(merged, version)

        # Merge base schemas
        self._merge_schemas_versioned(merged, version)

        # Merge security schemes
        self._merge_security_versioned(merged, version)

        # Merge parameters
        self._merge_parameters_versioned(merged, version)

        # Merge request bodies
        self._merge_request_bodies_versioned(merged, version)

        # Merge responses
        self._merge_responses_versioned(merged, version)

        # Merge headers
        self._merge_headers_versioned(merged, version)

        # Merge examples
        self._merge_examples_versioned(merged, version)

        # Merge links
        self._merge_links_versioned(merged, version)

        # Merge callbacks
        self._merge_callbacks_versioned(merged, version)

        # Note: x-internal operations are kept in the spec for server-side validation.
        # They are hidden from the Swagger UI via a client-side plugin.

        # Save as JSON
        self._save_json_versioned(merged, output_file)

        return merged

    def _merge_paths_versioned(self, merged: Dict[str, Any], version: str):
        """Merge path files with version-specific overrides and exclusions"""
        paths_dir = Path("paths")

        # Load v2.0 as the baseline for all versions
        base_version = "2.0"
        base_paths_dir = paths_dir / f"v{base_version}"

        if base_paths_dir.exists():
            base_paths = sorted(base_paths_dir.glob("*.yaml"))
            for path_file in base_paths:
                # Skip example files
                if path_file.name.endswith(".example"):
                    continue
                data = self.load_yaml(path_file)
                if "paths" in data:
                    merged["paths"].update(data["paths"])
        else:
            # Fallback to legacy non-versioned paths directory
            paths = sorted(paths_dir.glob("*.yaml"))
            for path_file in paths:
                if path_file.name.endswith(".example"):
                    continue
                data = self.load_yaml(path_file)
                if "paths" in data:
                    merged["paths"].update(data["paths"])
            return

        # If the requested version is not 2.0, apply version-specific changes
        if version != base_version:
            version_paths_dir = paths_dir / f"v{version}"
            excluded_paths = set()
            if version_paths_dir.exists():
                exclusions_file = version_paths_dir / "exclusions.yaml"
                if exclusions_file.exists():
                    exclusions_data = self.load_yaml(exclusions_file)
                    if "exclude_paths" in exclusions_data:
                        # Remove excluded path patterns
                        for pattern in exclusions_data["exclude_paths"]:
                            # Convert wildcard pattern to regex
                            regex_pattern = pattern.replace("*", "[^/]+")
                            # If ends with /*, match everything after the prefix
                            if pattern.endswith("/*"):
                                regex_pattern = pattern[:-2] + "/.*"

                            # Compile regex
                            regex = re.compile(f"^{regex_pattern}$")

                            # Find matching paths
                            matching_paths = [path for path in merged["paths"].keys() if regex.match(path)]
                            excluded_paths.update(matching_paths)

                        # Remove excluded paths
                        for path in excluded_paths:
                            merged["paths"].pop(path, None)

                # Then, load version-specific paths which override or add to base paths
                # First load inclusions.yaml if it exists (version-specific additions)
                inclusions_file = version_paths_dir / "inclusions.yaml"
                if inclusions_file.exists():
                    inclusions_data = self.load_yaml(inclusions_file)
                    if "paths" in inclusions_data:
                        # Add version-specific paths
                        merged["paths"].update(inclusions_data["paths"])

                # Then load other yaml files (overrides)
                version_paths = sorted(version_paths_dir.glob("*.yaml"))
                for path_file in version_paths:
                    # Skip exclusions, inclusions, and example files
                    if path_file.name in ["exclusions.yaml", "inclusions.yaml"] or path_file.name.endswith(".example"):
                        continue

                    data = self.load_yaml(path_file)
                    if "paths" in data:
                        # Version-specific paths override base paths
                        merged["paths"].update(data["paths"])

    def _merge_schemas_versioned(self, merged: Dict[str, Any], version: str):
        """Merge schema components with version-specific overrides and exclusions"""

        # Load v2.0 as the baseline for all versions
        base_version = "2.0"
        base_schemas_file = Path(f"components/v{base_version}/schemas.yaml")

        if base_schemas_file.exists():
            schemas_data = self.load_yaml(base_schemas_file)
            if "schemas" in schemas_data:
                merged["components"]["schemas"] = schemas_data["schemas"]
        else:
            # Fallback to legacy non-versioned schemas file
            legacy_schemas_file = Path("components/schemas.yaml")
            if legacy_schemas_file.exists():
                schemas_data = self.load_yaml(legacy_schemas_file)
                if "schemas" in schemas_data:
                    merged["components"]["schemas"] = schemas_data["schemas"]
            return

        # If the requested version is not 2.0, apply version-specific schema changes
        if version != base_version:
            version_components_dir = Path(f"components/v{version}")

            if version_components_dir.exists():
                # First, handle exclusions (remove schemas)
                exclusions_file = version_components_dir / "exclusions.yaml"
                if exclusions_file.exists():
                    exclusions_data = self.load_yaml(exclusions_file)
                    if "exclude_schemas" in exclusions_data:
                        for schema_name in exclusions_data["exclude_schemas"]:
                            # Support wildcard patterns
                            if "*" in schema_name:
                                # Convert wildcard to regex
                                regex_pattern = schema_name.replace("*", ".*")
                                regex = re.compile(f"^{regex_pattern}$")

                                # Find matching schemas
                                matching_schemas = [
                                    name for name in merged["components"]["schemas"].keys() if regex.match(name)
                                ]

                                # Remove matched schemas
                                for name in matching_schemas:
                                    merged["components"]["schemas"].pop(name, None)
                            else:
                                # Direct schema name removal
                                merged["components"]["schemas"].pop(schema_name, None)

                # Second, handle inclusions (add new components)
                inclusions_file = version_components_dir / "inclusions.yaml"
                if inclusions_file.exists():
                    inclusions_data = self.load_yaml(inclusions_file)
                    if "schemas" in inclusions_data:
                        # Add new schemas from inclusions
                        merged["components"]["schemas"].update(inclusions_data["schemas"])

                # Third, handle consolidated overrides (modify existing components)
                overrides_file = version_components_dir / "overrides.yaml"
                if overrides_file.exists():
                    overrides_data = self.load_yaml(overrides_file)
                    if "schemas" in overrides_data:
                        # Merge/override base schemas with consolidated overrides
                        merged["components"]["schemas"].update(overrides_data["schemas"])

                # Fourth, handle component-specific overrides (modify existing components)
                version_schemas_file = version_components_dir / "schemas.yaml"
                if version_schemas_file.exists():
                    version_schemas_data = self.load_yaml(version_schemas_file)
                    if "schemas" in version_schemas_data:
                        # Merge/override with component-specific file (takes precedence)
                        merged["components"]["schemas"].update(version_schemas_data["schemas"])

    def _merge_security_versioned(self, merged: Dict[str, Any], version: str):
        """Merge security scheme components with version-specific overrides and exclusions"""
        # Load base version security schemes
        base_version = "2.0"
        security_file = Path(f"components/v{base_version}/security.yaml")

        if security_file.exists():
            security_data = self.load_yaml(security_file)
            if "securitySchemes" in security_data:
                merged["components"]["securitySchemes"] = security_data["securitySchemes"]
        else:
            # Fallback to legacy non-versioned security file
            legacy_security_file = Path("components/security.yaml")
            if legacy_security_file.exists():
                security_data = self.load_yaml(legacy_security_file)
                if "securitySchemes" in security_data:
                    merged["components"]["securitySchemes"] = security_data["securitySchemes"]
            return

        # If the requested version is not 2.0, apply version-specific changes
        if version != base_version:
            version_components_dir = Path(f"components/v{version}")

            if version_components_dir.exists():
                # First, handle exclusions (remove security schemes)
                exclusions_file = version_components_dir / "exclusions.yaml"
                if exclusions_file.exists():
                    exclusions_data = self.load_yaml(exclusions_file)
                    if "exclude_security_schemes" in exclusions_data:
                        for scheme_name in exclusions_data["exclude_security_schemes"]:
                            # Support wildcard patterns
                            if "*" in scheme_name:
                                # Convert wildcard to regex
                                regex_pattern = scheme_name.replace("*", ".*")
                                regex = re.compile(f"^{regex_pattern}$")

                                # Find matching schemes
                                matching_schemes = [
                                    name for name in merged["components"]["securitySchemes"].keys() if regex.match(name)
                                ]

                                # Remove matched schemes
                                for name in matching_schemes:
                                    merged["components"]["securitySchemes"].pop(name, None)
                            else:
                                # Direct scheme name removal
                                merged["components"]["securitySchemes"].pop(scheme_name, None)

                # Second, handle inclusions (add new components)
                inclusions_file = version_components_dir / "inclusions.yaml"
                if inclusions_file.exists():
                    inclusions_data = self.load_yaml(inclusions_file)
                    if "securitySchemes" in inclusions_data:
                        # Add new security schemes from inclusions
                        merged["components"]["securitySchemes"].update(inclusions_data["securitySchemes"])

                # Third, handle consolidated overrides (modify existing components)
                overrides_file = version_components_dir / "overrides.yaml"
                if overrides_file.exists():
                    overrides_data = self.load_yaml(overrides_file)
                    if "securitySchemes" in overrides_data:
                        # Merge/override base security schemes with consolidated overrides
                        merged["components"]["securitySchemes"].update(overrides_data["securitySchemes"])

                # Fourth, handle component-specific overrides (modify existing components)
                version_security_file = version_components_dir / "security.yaml"
                if version_security_file.exists():
                    version_security_data = self.load_yaml(version_security_file)
                    if "securitySchemes" in version_security_data:
                        # Merge/override with component-specific file (takes precedence)
                        merged["components"]["securitySchemes"].update(version_security_data["securitySchemes"])

    def _merge_component_type_versioned(
        self, merged: Dict[str, Any], version: str, component_type: str, yaml_key: str, exclusion_key: str
    ):
        """Generic method to merge any component type with version-specific overrides and exclusions"""
        base_version = "2.0"
        component_file = Path(f"components/v{base_version}/{component_type}.yaml")

        if component_file.exists():
            component_data = self.load_yaml(component_file)
            if yaml_key in component_data:
                merged["components"][yaml_key] = component_data[yaml_key]
        else:
            # Fallback to legacy non-versioned file
            legacy_component_file = Path(f"components/{component_type}.yaml")
            if legacy_component_file.exists():
                component_data = self.load_yaml(legacy_component_file)
                if yaml_key in component_data:
                    merged["components"][yaml_key] = component_data[yaml_key]
            return

        # If the requested version is not 2.0, apply version-specific changes
        if version != base_version:
            version_components_dir = Path(f"components/v{version}")

            if version_components_dir.exists():
                # First, handle exclusions
                exclusions_file = version_components_dir / "exclusions.yaml"
                if exclusions_file.exists():
                    exclusions_data = self.load_yaml(exclusions_file)
                    if exclusion_key in exclusions_data:
                        for item_name in exclusions_data[exclusion_key]:
                            # Support wildcard patterns
                            if "*" in item_name:
                                # Convert wildcard to regex
                                regex_pattern = item_name.replace("*", ".*")
                                regex = re.compile(f"^{regex_pattern}$")

                                # Find matching items
                                matching_items = [
                                    name for name in merged["components"][yaml_key].keys() if regex.match(name)
                                ]

                                # Remove matched items
                                for name in matching_items:
                                    merged["components"][yaml_key].pop(name, None)
                            else:
                                # Direct item name removal
                                merged["components"][yaml_key].pop(item_name, None)

                # Second, handle inclusions (add new components)
                inclusions_file = version_components_dir / "inclusions.yaml"
                if inclusions_file.exists():
                    inclusions_data = self.load_yaml(inclusions_file)
                    if yaml_key in inclusions_data:
                        # Add new components from inclusions
                        merged["components"][yaml_key].update(inclusions_data[yaml_key])

                # Third, handle consolidated overrides (modify existing components)
                overrides_file = version_components_dir / "overrides.yaml"
                if overrides_file.exists():
                    overrides_data = self.load_yaml(overrides_file)
                    if yaml_key in overrides_data:
                        # Merge/override with consolidated overrides
                        merged["components"][yaml_key].update(overrides_data[yaml_key])

                # Fourth, handle component-specific overrides (modify existing components)
                version_component_file = version_components_dir / f"{component_type}.yaml"
                if version_component_file.exists():
                    version_component_data = self.load_yaml(version_component_file)
                    if yaml_key in version_component_data:
                        # Merge/override with component-specific file (takes precedence)
                        merged["components"][yaml_key].update(version_component_data[yaml_key])

    def _merge_parameters_versioned(self, merged: Dict[str, Any], version: str):
        """Merge parameter components with version-specific overrides and exclusions"""
        self._merge_component_type_versioned(merged, version, "parameters", "parameters", "exclude_parameters")

    def _merge_request_bodies_versioned(self, merged: Dict[str, Any], version: str):
        """Merge request body components with version-specific overrides and exclusions"""
        self._merge_component_type_versioned(
            merged, version, "requestBodies", "requestBodies", "exclude_request_bodies"
        )

    def _merge_responses_versioned(self, merged: Dict[str, Any], version: str):
        """Merge response components with version-specific overrides and exclusions"""
        self._merge_component_type_versioned(merged, version, "responses", "responses", "exclude_responses")

    def _merge_headers_versioned(self, merged: Dict[str, Any], version: str):
        """Merge header components with version-specific overrides and exclusions"""
        self._merge_component_type_versioned(merged, version, "headers", "headers", "exclude_headers")

    def _merge_examples_versioned(self, merged: Dict[str, Any], version: str):
        """Merge example components with version-specific overrides and exclusions"""
        self._merge_component_type_versioned(merged, version, "examples", "examples", "exclude_examples")

    def _merge_links_versioned(self, merged: Dict[str, Any], version: str):
        """Merge link components with version-specific overrides and exclusions"""
        self._merge_component_type_versioned(merged, version, "links", "links", "exclude_links")

    def _merge_callbacks_versioned(self, merged: Dict[str, Any], version: str):
        """Merge callback components with version-specific overrides and exclusions"""
        self._merge_component_type_versioned(merged, version, "callbacks", "callbacks", "exclude_callbacks")

    def _save_json_versioned(self, data: Dict[str, Any], output_file: str):
        """Save merged data as JSON"""
        output_path = Path(output_file)
        with open(output_path, "w") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

    def _create_versions_manifest(self):
        """Create a manifest file listing all available versions"""
        versions = self.versions_config.get("versions", {})
        default_version = self.versions_config.get("default_version", "2.0")

        manifest = {"default_version": default_version, "versions": []}

        for version, info in versions.items():
            version_entry = {
                "version": version,
                "file": f"docs/versions/swagger_v{version}.json",
                "deprecated": info.get("deprecated", False),
                "description": info.get("description", f"API version {version}"),
            }

            # Add optional fields
            if info.get("sunset"):
                version_entry["sunset"] = info["sunset"]
            if info.get("successor"):
                version_entry["successor"] = info["successor"]
            if info.get("doc_url"):
                version_entry["doc_url"] = info["doc_url"]

            manifest["versions"].append(version_entry)

        # Sort versions in reverse order (newest first)
        manifest["versions"].sort(key=lambda x: x["version"], reverse=True)

        # Save manifest in docs directory
        manifest_path = Path("versions_manifest.json")
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=4, ensure_ascii=False)

    def _filter_internal_operations(self, merged: Dict[str, Any]):
        """Remove operations with x-internal: true from the merged spec.

        If all HTTP methods on a path are internal, the entire path entry is removed.
        Schemas that are no longer referenced anywhere in the spec are also pruned.
        """
        http_methods = ["get", "post", "put", "delete", "patch", "options", "head", "trace"]
        paths_to_remove = []

        for path, path_item in merged.get("paths", {}).items():
            methods_to_remove = [
                method for method in http_methods if method in path_item and path_item[method].get("x-internal") is True
            ]
            for method in methods_to_remove:
                del path_item[method]

            # Remove the path entirely if no HTTP methods remain
            if not any(m in path_item for m in http_methods):
                paths_to_remove.append(path)

        for path in paths_to_remove:
            del merged["paths"][path]

        # Remove schemas that are no longer referenced anywhere in the remaining spec
        self._prune_unreferenced_schemas(merged)

    def _prune_unreferenced_schemas(self, merged: Dict[str, Any]):
        """Remove component schemas that have no $ref pointing to them in the spec.

        Schemas referenced only by other schemas (cross-schema $ref) are kept because
        we serialise the full spec, which includes the schemas section itself.
        """
        schemas = merged.get("components", {}).get("schemas", {})
        if not schemas:
            return

        # Serialise the entire spec including schemas so that cross-schema $refs
        # (e.g. CollectionUpdate -> RelatedMaterial) are included in the search.
        import json as _json

        spec_str = _json.dumps(merged)

        schemas_to_remove = [name for name in schemas if f'"#/components/schemas/{name}"' not in spec_str]
        for name in schemas_to_remove:
            del schemas[name]

    # Legacy methods for backward compatibility
    def _merge_paths(self):
        """Legacy method - merge all path YAML files (non-versioned)"""
        paths_dir = Path("paths")
        paths = sorted(paths_dir.glob("*.yaml"))

        for path_file in paths:
            data = self.load_yaml(path_file)
            if "paths" in data:
                self.merged["paths"].update(data["paths"])

    def _merge_schemas(self):
        """Legacy method - merge schema components (non-versioned)"""
        schemas_file = Path("components/schemas.yaml")
        if schemas_file.exists():
            schemas_data = self.load_yaml(schemas_file)
            if "schemas" in schemas_data:
                self.merged["components"]["schemas"] = schemas_data["schemas"]

    def _merge_security(self):
        """Legacy method - merge security scheme components (non-versioned)"""
        security_file = Path("components/security.yaml")
        if security_file.exists():
            security_data = self.load_yaml(security_file)
            if "securitySchemes" in security_data:
                self.merged["components"]["securitySchemes"] = security_data["securitySchemes"]

    def _save_json(self, output_file):
        """Legacy method - save merged data as JSON"""
        with open(output_file, "w") as f:
            json.dump(self.merged, f, indent=4, ensure_ascii=False)


if __name__ == "__main__":
    merger = SwaggerDocsMerger()
    merger.merge_docs_to_swagger()
