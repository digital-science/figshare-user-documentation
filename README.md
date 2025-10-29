# figshare API User Documentation

The home of figshare's API user documentation.

During the evolution of the API documentation there have been various iterations
and in this latest form we use Swagger to generate the pages and examples.

This system requires the `swagger.json` file (which can be found in the _swagger_documentation_
directory) to be in sync with the one found in the [Rest API](https://github.com/figshare/apiv1)
repository at `figshare_api2/api_docs/`.


## Contributing

In order to contribute you need to send a [pull request](https://help.github.com/articles/using-pull-requests/).

### Git workflow

Any development will be done on the developer branch which should follow
the `developer/feature` naming format. Feature identifier should contain only
words split with `'-'` (ex. `greatest-feature-ever-whatever`).

Code will be sent to be reviewed before merging it to `master` by other
colleagues and _Approved_ by at least two.

The description of a git commit should look like the following:

    FIG-12345: Commit message

The **FIG-12345** part is the JIRA FIG number. This should generally not be missing.
The commit message should describe the feature you're working on.


#### Merging into master

To merge into master you need to keep the following in mind:

* code review needs to be done with two _Approves_ at least
* code needs to be formatted with `make format`
* tests need to pass
* commits need to be rebased on the latest master

Merging into master has to be done with `--ff-only`:

    git merge --ff-only <branch>

## Development

To be able to build the documentation one needs to install the necessary
dependencies:

    $ make swagger_install

To build the documentation:

    $ make swagger_build

To check the generated documentation:

    $ make server

and open http://localhost:8000/ in your browser.

Finally, when the documentation needs to be deployed to various instances we have
various Jenkins jobs to do that.

:warning: Before creating the pull request make sure you have built
the documentation.


## Versioned Documentation

The documentation system supports multiple API versions with version-specific schemas and paths.

### Directory Structure

```
swagger_documentation/docs/
├── swagger-source.yaml           # Base OpenAPI definition
├── versions_config.yaml          # Version configuration
├── paths/
│   ├── v2.0/                    # Version 2.0 paths (base)
│   │   ├── articles.yaml
│   │   └── ...
│   ├── v2.1/                    # Version 2.1 paths
│   │   ├── exclusions.yaml      # Paths to exclude from v2.0
│   │   └── articles.yaml        # Override v2.0 paths
│   └── v2.3/                    # Version 2.3 paths
│       └── ...
└── components/
    ├── v2.0/                    # Version 2.0 components (base)
    │   ├── schemas.yaml
    │   └── security.yaml
    ├── v2.1/                    # Version 2.1 components
    │   ├── exclusions.yaml      # Schemas to exclude from v2.0
    │   └── schemas.yaml         # Override/add schemas
    └── v2.3/                    # Version 2.3 components
        └── ...
```

### Schema Operations

You can perform three operations on schemas across versions:

#### 1. **Override** - Replace a schema from the base version

In `components/v2.1/schemas.yaml`:
```yaml
schemas:
  Article:  # This overrides the Article schema from v2.0
    type: object
    properties:
      id:
        type: integer
      title:
        type: string
      created:  # Changed from 'created_date' in v2.0
        type: string
        format: date-time
```

#### 2. **Add** - Define new schemas not in the base version

In `components/v2.1/schemas.yaml`:
```yaml
schemas:
  NewFeature:  # This schema only exists in v2.1+
    type: object
    properties:
      feature_id:
        type: integer
```

#### 3. **Remove** - Exclude schemas from the base version

In `components/v2.1/exclusions.yaml`:
```yaml
exclude_schemas:
  - LegacyMetadata        # Remove specific schema
  - OldArticleFormat      # Remove another schema
  - Legacy*               # Remove all schemas starting with "Legacy"
```

### Path Operations

Similar operations apply to paths:

- **Override**: Define the same path in version-specific directory
- **Add**: Use `inclusions.yaml` or define new paths
- **Remove**: Use `exclusions.yaml` with path patterns

Example `paths/v2.1/exclusions.yaml`:
```yaml
exclude_paths:
  - /articles/legacy_format
  - /articles/*/download_legacy
  - /legacy/*                    # Exclude all paths under /legacy/
```

### Example Files

Reference these example files for guidance:
- `swagger_documentation/docs/paths/legacy.yaml.example`
- `swagger_documentation/docs/components/schemas.yaml.example`
- `swagger_documentation/docs/components/exclusions.yaml.example`
