#!/usr/bin/env python3
"""Build the Pages artifact with an environment-only browser Maps key."""

import json
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "_site"
# Only these public runtime assets may enter the published artifact.
PUBLIC_FILES = (
    "index.html", "search.html", "place.html", "diagnostics.html",
    "config.js", "data.js", "catalog.js", "explanations.js", "gallery.js",
    "regulations.js", "search.js", "place.js", "ui.js", "diagnostics.js",
    "shared.css", "results.css", "logo-black.png", "logo-white.png",
)
EMPTY_MAPS_KEY = re.compile(r'(\bGOOGLE_MAPS_KEY\s*:\s*)""')


def build():
    key = os.environ.get("GOOGLE_MAPS_BROWSER_KEY", "")
    if not key:
        raise ValueError("GOOGLE_MAPS_BROWSER_KEY is required; no artifact was built.")
    if not re.fullmatch(r"AIza[A-Za-z0-9_-]{35}", key):
        raise ValueError("GOOGLE_MAPS_BROWSER_KEY has an invalid format; no artifact was built.")

    for name in PUBLIC_FILES:
        source = ROOT / name
        if source.is_symlink() or not source.is_file():
            raise ValueError("A required public asset is missing or is a symbolic link.")

    config = (ROOT / "config.js").read_text(encoding="utf-8")
    if len(re.findall(r"\bGOOGLE_MAPS_KEY\s*:", config)) != 1 or len(EMPTY_MAPS_KEY.findall(config)) != 1:
        raise ValueError("Source config.js must contain exactly one empty GOOGLE_MAPS_KEY.")
    deployed_config = EMPTY_MAPS_KEY.sub(lambda match: match[1] + json.dumps(key), config)

    if OUTPUT.is_symlink() or (OUTPUT.exists() and not OUTPUT.is_dir()):
        raise ValueError("The build destination must be a regular directory.")

    with tempfile.TemporaryDirectory(prefix=".pages-build-", dir=ROOT) as temporary:
        stage = Path(temporary) / "site"
        stage.mkdir()
        for name in PUBLIC_FILES:
            if name == "config.js":
                (stage / name).write_text(deployed_config, encoding="utf-8")
            else:
                shutil.copyfile(ROOT / name, stage / name)
        (stage / ".nojekyll").touch()
        if OUTPUT.exists():
            shutil.rmtree(OUTPUT)
        stage.replace(OUTPUT)

    print(f"Pages artifact built: {len(PUBLIC_FILES)} public assets and .nojekyll in _site/.")


if __name__ == "__main__":
    try:
        build()
    except (ValueError, OSError):
        # Never print environment values, source config, or exception details:
        # filesystem error messages can also contain credential-bearing paths.
        print("Pages build failed. Check the browser key format, empty source config, and required assets.", file=sys.stderr)
        sys.exit(1)
