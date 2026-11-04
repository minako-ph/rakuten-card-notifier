#!/usr/bin/env bash
# コードを push し、既存の Web アプリ（LINE Webhook）デプロイを最新バージョンに更新する
# NOTE: clasp push だけでは Web アプリのデプロイは更新されない
set -eu

yarn push

# @HEAD 以外（= Web アプリ）のデプロイ ID を取得する
DEPLOYMENT_ID=$( yarn -s clasp deployments | grep -v '@HEAD' | grep -oE '^- [A-Za-z0-9_-]+' | head -1 | sed 's/^- //' )

if [ -z "$DEPLOYMENT_ID" ]; then
  echo "Web アプリのデプロイが見つかりません。初回は yarn clasp deploy -d \"line webhook\" を実行してください" >&2
  exit 1
fi

yarn clasp deploy --deploymentId "$DEPLOYMENT_ID" -d "line webhook"
