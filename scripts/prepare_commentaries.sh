#!/bin/bash
set -euo pipefail

# Directory where the database will be extracted
DATA_DIR="public/Commentaries-Database-master"
JSON_FILE="public/commentaries.json"

# Clean previous data if present
rm -rf "$DATA_DIR" "$JSON_FILE"

# Download the latest database source
TMP_DIR=$(mktemp -d)
ZIP_FILE="$TMP_DIR/commentaries.zip"

curl -L "https://github.com/HistoricalChristianFaith/Commentaries-Database/archive/refs/heads/master.zip" -o "$ZIP_FILE"
unzip -q "$ZIP_FILE" -d "$TMP_DIR"

# Compile the toml files into JSON
cd "$TMP_DIR/Commentaries-Database-master"

if ! python3 -c 'import rtoml' >/dev/null 2>&1; then
    echo "rtoml Python package required. Install with: pip install rtoml" >&2
    exit 1
fi

python3 compile_data.py json -o data.json

# Move results into the repository
mkdir -p "$OLDPWD/public"
mv data.json "$OLDPWD/$JSON_FILE"
mv "$PWD" "$OLDPWD/$DATA_DIR"
cd "$OLDPWD"

rm -rf "$TMP_DIR"
echo "Commentaries prepared at $JSON_FILE"
