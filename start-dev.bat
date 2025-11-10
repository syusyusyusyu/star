@echo off
REM 開発環境用起動スクリプト（Windows用）

echo 開発環境を起動しています...
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
docker-compose -f docker-compose.dev.yml down

echo.
echo 開発環境をビルド・起動しています...
echo 初回起動時は数分かかる場合があります
echo.

REM 開発環境を起動
docker-compose -f docker-compose.dev.yml up --build
