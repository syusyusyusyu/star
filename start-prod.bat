@echo off
REM 本番環境用起動スクリプト（Windows用）

echo 本番環境を起動しています...
echo.

REM Dockerが起動しているか確認
docker info >nul 2>&1
if errorlevel 1 (
    echo エラー: Dockerが起動していません
    echo Docker Desktopを起動してから再度実行してください
    pause
    exit /b 1
)

echo Dockerが起動しています
echo.

REM 既存のコンテナを停止
echo 既存のコンテナを停止しています...
docker-compose down

echo.
echo 本番環境をビルド・起動しています...
echo 初回起動時は数分かかる場合があります
echo.

REM 本番環境を起動
docker-compose up --build -d

echo.
echo 起動完了！
echo.
echo アクセスURL: http://localhost:3000
echo.
echo ログを確認: docker-compose logs -f
echo 停止: docker-compose down
echo.
pause
