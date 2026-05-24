Remove-Item -Recurse -Force -ErrorAction SilentlyContinue app\service
Remove-Item -Force -ErrorAction SilentlyContinue app\brd_api*.js
git checkout .
