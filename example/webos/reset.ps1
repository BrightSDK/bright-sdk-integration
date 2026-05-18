Remove-Item -Recurse -Force -ErrorAction SilentlyContinue service
Remove-Item -Force -ErrorAction SilentlyContinue app\brd_api*.js
git checkout .
