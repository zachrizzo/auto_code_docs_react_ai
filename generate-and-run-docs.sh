#!/usr/bin/env bash
set -e

# First generate the documentation using rdocs
npx rdocs "$@" --start-ui=false

# Then start the documentation server using our new docs-server command
npx docs-server --docs-data-dir="$(pwd)/documentation/docs-data" "$@"