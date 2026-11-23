#!/usr/bin/env bash
# Pobiera Z-Anatomy (model Blendera + TA2.csv + licencję) w przypiętym commicie do build/source/.
set -euo pipefail
cd "$(dirname "$0")/.."
REPO=https://github.com/Z-Anatomy/Models-of-human-anatomy
COMMIT=e3cf19896db825a5c8a9df461e3cd74c96f94ec3
DEST=build/source
if [ -f "$DEST/Z-Anatomy/Startup.blend" ]; then echo "source already present: $DEST"; exit 0; fi
rm -rf "$DEST"
git clone --filter=blob:none --no-checkout "$REPO" "$DEST"
git -C "$DEST" checkout "$COMMIT" -- Z-Anatomy.zip TA2.csv License.txt
(cd "$DEST" && unzip -q -o Z-Anatomy.zip)
ls -l "$DEST/Z-Anatomy/Startup.blend"
