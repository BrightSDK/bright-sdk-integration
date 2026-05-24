Remove-Item -Recurse -Force -ErrorAction SilentlyContinue BrightSDK
Remove-Item -Force -ErrorAction SilentlyContinue app/brd_config.json
git checkout brd_sdk.config.json
git checkout app/example.csproj
