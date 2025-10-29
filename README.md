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

    $ python3 -m venv myenv
    $ source myenv/bin/activate
    $ make install

To build the documentation:

    $ make swagger_build

To check the generated documentation:

    $ make server

and open http://localhost:8000/ in your browser.

Finally, when the documentation needs to be deployed to various instances we have
various Jenkins jobs to do that.

:warning: Before creating the pull request make sure you have built
the documentation.
