import json, shutil, socket, subprocess, sys, time
from pathlib import Path

from lxml import html
from playwright.sync_api import sync_playwright

# Run from swagger_documentation/ (the Makefile `docs` target cd's there first), same as how
# merge_docs_to_swagger.py runs from swagger_documentation/docs/. Depends on docs/versions_manifest.json
# already existing, so it must run after merge_docs_to_swagger.py.
MANIFEST_PATH = Path("docs/versions_manifest.json")
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


class Server:
    """Minimal context manager around `python -m http.server`, serving swagger_documentation/."""

    def __enter__(self):
        self.port = self._free_port()
        self.process = subprocess.Popen(
            [sys.executable, "-m", "http.server", str(self.port)],
            cwd=".",
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        self._wait_until_up()
        return self

    def __exit__(self, *exc_info):
        self.process.terminate()
        self.process.wait(timeout=10)

    def _free_port(self):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("127.0.0.1", 0))
            return s.getsockname()[1]

    def _wait_until_up(self, timeout=10):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex(("127.0.0.1", self.port)) == 0:
                    return
            time.sleep(0.1)
        raise RuntimeError("dev server did not start in time")


def render_version(base_url, version):
    """Load the page with ?version= pinned, wait for rendering to fully settle, return the HTML."""
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()
        page.goto(f"{base_url}/?version={version}")
        page.wait_for_function("() => window.__figshareDocsReady === true", timeout=30000)
        content = page.content()
        browser.close()
        return content


def post_process(raw_html, version, major):
    """Strip the other version's sidebar entries and now-dead source fragments, bake in the
    fixed version/spec constants and title, and absolutize asset references."""
    tree = html.fromstring(raw_html)

    script = html.fromstring(
        f'<script>window.FIGSHARE_DOC_VERSION = "{version}"; '
        f'window.FIGSHARE_SPEC_URL = "/docs/versions/swagger_v{version}.json";</script>'
    )
    index_js = tree.xpath('//script[contains(@src, "index.js")]')
    if index_js:
        index_js[0].addprevious(script)

    title = tree.xpath("//title")
    if title:
        title[0].text = f"Figshare API v{major}"

    for li in tree.xpath(f'//li[@data-guide-version and @data-guide-version != "{major}"]'):
        li.getparent().remove(li)

    for storage in tree.xpath('//*[@id="guide-content-storage"]'):
        storage.getparent().remove(storage)

    # page.content() serializes attributes, not live IDL properties -- version-manager.js sets
    # option.selected as a property while populating the dropdown, which never gets reflected
    # back as a "selected" attribute in the captured markup. Left alone, neither <option> in the
    # snapshot ends up marked selected, so a real browser parsing this HTML defaults to selecting
    # the *first* option (the newest version, per the manifest's sort) before version-manager.js
    # re-populates the dropdown and corrects it moments later -- a visible flash of the wrong
    # version. Fix the attribute directly so the correct option is selected from first paint.
    for option in tree.xpath('//select[@id="apiVersionSelect"]/option'):
        if "selected" in option.attrib:
            del option.attrib["selected"]
    for option in tree.xpath(f'//select[@id="apiVersionSelect"]/option[@value="{version}"]'):
        option.set("selected", "selected")

    # The snapshot is taken after Swagger UI has fully rendered (that's what the ready signal
    # waits for), so swagger-ui-content is captured full of rendered operations markup -- easily
    # over half the file's weight. It gets fully replaced by React the instant a real page loads
    # regardless of what's shipped here, so ship it empty instead of dead-on-arrival bulk.
    for content in tree.xpath('//*[@id="swagger-ui-content"]'):
        for child in list(content):
            content.remove(child)
        content.text = None

    # Exact matches (index.css, index.js, docs/version-manager.js) get a straight "/" prefix;
    # the images/ prefix covers every relative image reference (logo, loader gif, ...) at once.
    for tag, attr, prefix in ASSET_REWRITES:
        for el in tree.xpath(f'//{tag}[starts-with(@{attr}, "{prefix}")]'):
            el.set(attr, "/" + el.get(attr))

    return html.tostring(tree, doctype="<!DOCTYPE html>", encoding="unicode")


def main():
    """Generate a static dist/v{major}/index.html bundle for every version in the manifest."""
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    # Start clean so a version removed from the manifest doesn't leave a stale bundle behind.
    shutil.rmtree(DIST_DIR, ignore_errors=True)

    with Server() as server:
        base_url = f"http://localhost:{server.port}"
        for version_info in manifest["versions"]:
            version = version_info["version"]
            major = version.split(".")[0]
            print(f"Generating dist/v{major} for version {version}...")

            raw_html = render_version(base_url, version)
            final_html = post_process(raw_html, version, major)

            out_dir = DIST_DIR / f"v{major}"
            out_dir.mkdir(parents=True, exist_ok=True)
            (out_dir / "index.html").write_text(final_html, encoding="utf-8")

    print(f"\nGenerated {len(manifest['versions'])} version bundle(s) in dist/")


if __name__ == "__main__":
    main()
