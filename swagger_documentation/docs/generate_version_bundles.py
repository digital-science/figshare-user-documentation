import json, shutil
from pathlib import Path

from lxml import etree, html

# Run from swagger_documentation/ (the Makefile `docs` target cd's there first), same as how
# merge_docs_to_swagger.py runs from swagger_documentation/docs/. Depends on docs/versions_manifest.json
# already existing, so it must run after merge_docs_to_swagger.py.
MANIFEST_PATH = Path("docs/versions_manifest.json")
SOURCE_HTML = Path("index.html")
DIST_DIR = Path("dist")

# Relative asset references that only resolve correctly when the page is served from the site
# root (as it is today, at /). Once a version's bundle is served from /v2/ or /v3/ instead, these
# need to be root-absolute so they keep resolving against the shared, version-agnostic assets.
# (Favicons already use absolute /images/... paths and need no rewrite.)
ASSET_REWRITES = (
    ("link", "href", "index.css"),
    ("img", "src", "images/"),
    ("script", "src", "index.js"),
    ("script", "src", "docs/version-manager.js"),
)


def post_process(raw_html, version, major):
    """Bake in the fixed version/spec constants and title, strip the other version's sidebar
    entries, and absolutize asset references.

    Ships the source markup otherwise unmodified -- no rendering happens here. The sidebar strip
    below is pure static markup filtering (index.js only ever toggles these <li>s via
    display:none, it doesn't create them), so it's safe to do without a browser and matches what
    index.js's applyVersionDocVisibility() would settle on anyway -- just from first paint instead
    of after onComplete. Guide-text sections and the version selector's `selected` option are left
    for index.js/version-manager.js to resolve live in the visitor's browser, using the
    window.FIGSHARE_DOC_VERSION baked in below -- the same way it always has for a client-rendered
    page (this predates the v2/v3 split; it's not new behavior introduced here)."""
    tree = html.fromstring(raw_html)

    # A bare `html.fromstring("<script>...</script>")` gets auto-wrapped in a synthetic
    # <html><head>...</head></html> (lxml's fragment-parsing heuristic for a lone <script> tag),
    # which `addprevious` would then insert as a stray nested <html> sibling. Building a plain
    # element directly avoids that.
    script = etree.Element("script")
    script.text = (
        f'window.FIGSHARE_DOC_VERSION = "{version}"; '
        f'window.FIGSHARE_SPEC_URL = "/docs/versions/swagger_v{version}.json";'
    )
    index_js = tree.xpath('//script[contains(@src, "index.js")]')
    if index_js:
        index_js[0].addprevious(script)

    title = tree.xpath("//title")
    if title:
        title[0].text = f"Figshare API v{major}"

    for li in tree.xpath(f'//li[@data-guide-version and @data-guide-version != "{major}"]'):
        li.getparent().remove(li)

    # Exact matches (index.css, index.js, docs/version-manager.js) get a straight "/" prefix;
    # the images/ prefix covers every relative image reference (logo, loader gif, ...) at once.
    for tag, attr, prefix in ASSET_REWRITES:
        for el in tree.xpath(f'//{tag}[starts-with(@{attr}, "{prefix}")]'):
            el.set(attr, "/" + el.get(attr))

    return html.tostring(tree, doctype="<!DOCTYPE html>", encoding="unicode")


def main():
    """Generate a static dist/v{major}/index.html bundle for every version in the manifest."""
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    raw_html = SOURCE_HTML.read_text(encoding="utf-8")

    # Start clean so a version removed from the manifest doesn't leave a stale bundle behind.
    shutil.rmtree(DIST_DIR, ignore_errors=True)

    for version_info in manifest["versions"]:
        version = version_info["version"]
        major = version.split(".")[0]
        print(f"Generating dist/v{major} for version {version}...")

        final_html = post_process(raw_html, version, major)

        out_dir = DIST_DIR / f"v{major}"
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "index.html").write_text(final_html, encoding="utf-8")

    print(f"\nGenerated {len(manifest['versions'])} version bundle(s) in dist/")


if __name__ == "__main__":
    main()
