#!/usr/bin/env bash
set -e

# Build package and launch docs UI with any passed flags
npm run build
npx rdocs "$@"