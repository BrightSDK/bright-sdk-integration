#!/bin/sh
# Remove downloaded SDK files to reset the example to a clean state
cd "$(dirname "$0")/.." && rm -rf BrightSDK && git checkout app
