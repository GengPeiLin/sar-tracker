#!/usr/bin/env bash
# =============================================================================
# deploy_to_github.sh
# SAR Monitor — 一鍵上架到 GitHub Pages
# 帳號：GengPeiLin
# =============================================================================
set -euo pipefail

C_CYAN='\033[0;36m'; C_GREEN='\033[0;32m'; C_YELLOW='\033[1;33m'
C_RED='\033[0;31m';  C_BOLD='\033[1m';     C_RESET='\033[0m'

log()  { echo -e "${C_CYAN}[SAR]${C_RESET} $*"; }
ok()   { echo -e "${C_GREEN}[OK ]${C_RESET} $*"; }
warn() { echo -e "${C_YELLOW}[WARN]${C_RESET} $*"; }
die()  { echo -e "${C_RED}[ERR ]${C_RESET} $*" >&2; exit 1; }
hr()   { echo -e "${C_CYAN}────────────────────────────────────────────────${C_RESET}"; }

GH_USER="GengPeiLin"
REPO_NAME="sar-tracker"
BRANCH="main"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}"

hr
echo -e "${C_BOLD}  SAR Monitor — GitHub Pages 部署腳本${C_RESET}"
echo -e "  帳號：${C_CYAN}${GH_USER}${C_RESET}　Repo：${C_CYAN}${REPO_NAME}${C_RESET}"
hr

# ═══════════════════════════════════════════════════════════════════
# STEP 1：檢查必要工具，偵測真正的 GitHub CLI
# ═══════════════════════════════════════════════════════════════════
log "STEP 1 / 6  檢查必要工具…"

command -v git  &>/dev/null || die "找不到 git。請先安裝：https://git-scm.com/downloads"
ok "  git ✓  ($(git --version))"

command -v curl &>/dev/null || die "找不到 curl。請安裝：brew install curl 或 sudo apt install curl"
ok "  curl ✓"

# ── 偵測「真正的 GitHub CLI」──────────────────────────────────────
# 真正的 GitHub CLI (cli.github.com) 的 --version 輸出格式：
#   gh version 2.x.x (2024-xx-xx)
# 其他同名工具（如 Python gh、老舊工具等）不會有這個格式。

HAS_GH_CLI=false
GH_CMD=""

# 先找 /usr/local/bin/gh 或 PATH 裡的 gh
for candidate in \
    "$(command -v gh 2>/dev/null || true)" \
    "/usr/local/bin/gh" \
    "/opt/homebrew/bin/gh" \
    "$HOME/.local/bin/gh"; do
  [[ -z "$candidate" || ! -x "$candidate" ]] && continue
  # 用 --version 判斷是否為真正的 GitHub CLI
  if "$candidate" --version 2>&1 | grep -qE '^gh version [0-9]+\.[0-9]+'; then
    HAS_GH_CLI=true
    GH_CMD="$candidate"
    GH_VER=$("$GH_CMD" --version 2>&1 | head -1)
    ok "  GitHub CLI ✓  ($GH_VER)"
    ok "  路徑：$GH_CMD"
    break
  fi
done

if ! $HAS_GH_CLI; then
  warn "  未找到真正的 GitHub CLI (cli.github.com)"
  # 如果 PATH 裡有 gh 但不是 GitHub CLI，說明一下
  if command -v gh &>/dev/null; then
    GH_FAKE_VER=$(gh --version 2>&1 | head -1 || true)
    warn "  注意：PATH 中的 gh 不是 GitHub CLI（輸出：${GH_FAKE_VER}）"
    warn "  這可能是另一個叫 gh 的工具，無法用於 GitHub 操作"
    echo ""
  fi
  echo -e "  ${C_BOLD}安裝 GitHub CLI 的方法：${C_RESET}"
  echo ""
  echo -e "  ${C_CYAN}macOS（Homebrew）：${C_RESET}"
  echo -e "    brew install gh"
  echo ""
  echo -e "  ${C_CYAN}Ubuntu / Debian：${C_RESET}"
  echo -e "    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \\"
  echo -e "      | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg"
  echo -e "    echo \"deb [arch=\$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] \\"
  echo -e "      https://cli.github.com/packages stable main\" \\"
  echo -e "      | sudo tee /etc/apt/sources.list.d/github-cli.list"
  echo -e "    sudo apt update && sudo apt install gh"
  echo ""
  echo -e "  ${C_CYAN}Windows（winget）：${C_RESET}"
  echo -e "    winget install --id GitHub.cli"
  echo ""
  echo -e "  安裝後執行：${C_BOLD}gh auth login${C_RESET}  完成登入，再重新執行此腳本。"
  echo ""
  echo -e "  ${C_YELLOW}─── 或者，選擇不安裝 gh，改用手動模式 ───${C_RESET}"
  read -rp "  以手動模式繼續？（需要自行在 GitHub 網頁操作）[y/N] " USE_MANUAL
  if [[ "$USE_MANUAL" =~ ^[Yy]$ ]]; then
    HAS_GH_CLI=false
  else
    die "請先安裝 GitHub CLI 後再執行此腳本"
  fi
fi

# ═══════════════════════════════════════════════════════════════════
# STEP 2：GitHub 認證
# ═══════════════════════════════════════════════════════════════════
log "STEP 2 / 6  驗證 GitHub 認證…"

if $HAS_GH_CLI; then
  if ! "$GH_CMD" auth status &>/dev/null; then
    echo ""
    log "  尚未登入 GitHub CLI，開始登入…"
    echo -e "  ${C_YELLOW}提示：登入時建議選擇「Login with a web browser」${C_RESET}"
    echo ""
    "$GH_CMD" auth login --hostname github.com --git-protocol https \
      || die "GitHub 登入失敗。請手動執行：$GH_CMD auth login"
  fi

  GH_ACTUAL_USER=$("$GH_CMD" api user --jq '.login' 2>/dev/null || echo "")
  if [[ -z "$GH_ACTUAL_USER" ]]; then
    die "無法取得 GitHub 使用者名稱，請確認已正確登入：$GH_CMD auth status"
  fi
  ok "  已登入：${GH_ACTUAL_USER}"

  if [[ "$GH_ACTUAL_USER" != "$GH_USER" ]]; then
    warn "  目前登入帳號 (${GH_ACTUAL_USER}) 與腳本設定帳號 (${GH_USER}) 不同"
    read -rp "  以 ${GH_ACTUAL_USER} 部署到 ${GH_ACTUAL_USER}/${REPO_NAME}？[y/N] " CONT
    [[ "$CONT" =~ ^[Yy]$ ]] || die "已中止。如需切換帳號：$GH_CMD auth switch"
    GH_USER="$GH_ACTUAL_USER"
  fi
else
  # 手動模式：用 HTTPS + token 或 SSH
  echo ""
  echo -e "  ${C_BOLD}手動模式：設定 git 認證${C_RESET}"
  echo ""
  echo -e "  選項 A — Personal Access Token（推薦）："
  echo -e "    1. 前往 ${C_CYAN}https://github.com/settings/tokens/new${C_RESET}"
  echo -e "    2. 勾選 repo、workflow 權限，生成 token"
  echo -e "    3. push 時在密碼欄輸入 token（不是 GitHub 密碼）"
  echo ""
  echo -e "  選項 B — SSH 金鑰（已設定者可直接使用）"
  echo ""
  read -rp "  按 Enter 繼續（git push 時會要求輸入帳號/token）…"
fi

REPO_URL="https://github.com/${GH_USER}/${REPO_NAME}.git"

# ═══════════════════════════════════════════════════════════════════
# STEP 3：建立 GitHub Repository
# ═══════════════════════════════════════════════════════════════════
log "STEP 3 / 6  建立 GitHub Repository…"

if $HAS_GH_CLI; then
  if "$GH_CMD" repo view "${GH_USER}/${REPO_NAME}" &>/dev/null; then
    ok "  Repo 已存在：${REPO_URL}"
  else
    log "  建立 public repo：${GH_USER}/${REPO_NAME}…"
    "$GH_CMD" repo create "${GH_USER}/${REPO_NAME}" \
      --public \
      --description "SAR 衛星動態監測 · 台灣取像儀表板（每週自動更新）" \
      --homepage "https://${GH_USER}.github.io/${REPO_NAME}/" \
      || die "建立 repo 失敗"
    ok "  Repo 建立完成"
    sleep 3
  fi
else
  echo ""
  echo -e "  ${C_BOLD}請手動建立 repo：${C_RESET}"
  echo -e "  1. 前往 ${C_CYAN}https://github.com/new${C_RESET}"
  echo -e "  2. Repository name：${C_BOLD}${REPO_NAME}${C_RESET}"
  echo -e "  3. 選擇 ${C_BOLD}Public${C_RESET}"
  echo -e "  4. ${C_RED}不要${C_RESET}勾選 Add README / .gitignore（保持空白）"
  echo -e "  5. 點擊 Create repository"
  echo ""
  read -rp "  建立完成後按 Enter 繼續…"
fi

# ═══════════════════════════════════════════════════════════════════
# STEP 4：初始化 git 並推送
# ═══════════════════════════════════════════════════════════════════
log "STEP 4 / 6  初始化 git 並推送到 GitHub…"

cd "$PROJECT_DIR"

# 確認必要檔案
REQUIRED=("index.html" "fetch_sar_data.py" ".github/workflows/update.yml" "data/sar_status.json")
for f in "${REQUIRED[@]}"; do
  [[ -f "$f" ]] || die "找不到必要檔案：${PROJECT_DIR}/${f}\n  請確認在正確的目錄執行腳本"
done
ok "  所有必要檔案已確認（${#REQUIRED[@]} 個）"

# Git init
if [[ ! -d ".git" ]]; then
  git init
  git checkout -b "${BRANCH}" 2>/dev/null || git branch -M "${BRANCH}"
  ok "  git init → branch: ${BRANCH}"
else
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  [[ "$CURRENT_BRANCH" != "$BRANCH" ]] && git branch -M "${BRANCH}"
  ok "  git repo 已存在 → branch: ${BRANCH}"
fi

# Git config
[[ -z "$(git config user.name 2>/dev/null)" ]]  && git config user.name  "${GH_USER}"
[[ -z "$(git config user.email 2>/dev/null)" ]] && git config user.email "${GH_USER}@users.noreply.github.com"

# .gitignore
cat > .gitignore << 'GITIGNORE'
__pycache__/
*.pyc
*.pyo
.env
.DS_Store
Thumbs.db
*.log
node_modules/
GITIGNORE

git add -A

if git diff --staged --quiet; then
  ok "  無新變更，略過 commit"
else
  git commit -m "init: SAR Monitor 部署 $(date '+%Y-%m-%d')"
  ok "  Commit 完成"
fi

# Remote
if git remote get-url origin &>/dev/null 2>&1; then
  CURRENT_REMOTE=$(git remote get-url origin)
  if [[ "$CURRENT_REMOTE" != "$REPO_URL" ]]; then
    git remote set-url origin "${REPO_URL}"
    ok "  Remote origin 已更新 → ${REPO_URL}"
  else
    ok "  Remote origin 已設定"
  fi
else
  git remote add origin "${REPO_URL}"
  ok "  Remote origin 已設定 → ${REPO_URL}"
fi

# Push
log "  推送到 GitHub…"
if ! git push -u origin "${BRANCH}" --force-with-lease 2>/dev/null; then
  if ! git push -u origin "${BRANCH}" --force 2>/dev/null; then
    echo ""
    die "Push 失敗。請確認：
  1. repo 名稱正確（${GH_USER}/${REPO_NAME}）
  2. 已設定 SSH 金鑰 或 Personal Access Token
     token 申請：https://github.com/settings/tokens/new
     勾選 repo + workflow 權限
  3. 如果是密碼欄，請輸入 token（不是 GitHub 密碼）"
  fi
fi
ok "  推送成功 → ${REPO_URL}"

# ═══════════════════════════════════════════════════════════════════
# STEP 5：啟用 GitHub Pages（Source: GitHub Actions）
# ═══════════════════════════════════════════════════════════════════
log "STEP 5 / 6  啟用 GitHub Pages…"

if $HAS_GH_CLI; then
  sleep 3  # 等 GitHub 後端同步

  # 先嘗試建立，失敗（409 已存在）則改用 PUT 更新
  HTTP_STATUS=$("$GH_CMD" api \
    --method POST \
    --silent \
    -H "Accept: application/vnd.github+json" \
    "/repos/${GH_USER}/${REPO_NAME}/pages" \
    -f "build_type=workflow" \
    -f "source[branch]=${BRANCH}" \
    -f "source[path]=/" \
    --include 2>&1 | grep -m1 "^HTTP" | awk '{print $2}' || echo "0")

  if [[ "$HTTP_STATUS" == "201" ]]; then
    ok "  GitHub Pages 已啟用（GitHub Actions 模式）"
  else
    # 已存在，改用 PUT 更新設定
    "$GH_CMD" api \
      --method PUT \
      -H "Accept: application/vnd.github+json" \
      "/repos/${GH_USER}/${REPO_NAME}/pages" \
      -f "build_type=workflow" \
      &>/dev/null 2>&1 || true
    ok "  GitHub Pages 設定已確認/更新"
  fi
else
  echo ""
  echo -e "  ${C_BOLD}請手動啟用 GitHub Pages：${C_RESET}"
  echo -e "  1. 前往 ${C_CYAN}https://github.com/${GH_USER}/${REPO_NAME}/settings/pages${C_RESET}"
  echo -e "  2. Build and deployment → Source 選：${C_BOLD}GitHub Actions${C_RESET}"
  echo -e "  3. 點擊 Save"
  echo ""
  read -rp "  完成後按 Enter 繼續…"
fi

# ═══════════════════════════════════════════════════════════════════
# STEP 6：觸發第一次資料更新 Workflow
# ═══════════════════════════════════════════════════════════════════
log "STEP 6 / 6  觸發第一次資料更新 Workflow…"

if $HAS_GH_CLI; then
  log "  等待 GitHub 識別 workflow 檔案（10 秒）…"
  sleep 10

  TRIGGERED=false
  for attempt in 1 2 3; do
    if "$GH_CMD" workflow run "update.yml" \
        --repo "${GH_USER}/${REPO_NAME}" \
        --ref "${BRANCH}" \
        &>/dev/null 2>&1; then
      TRIGGERED=true
      ok "  Workflow 已觸發（第 ${attempt} 次嘗試）"
      break
    fi
    [[ $attempt -lt 3 ]] && { warn "  第 ${attempt} 次觸發失敗，5 秒後重試…"; sleep 5; }
  done

  if $TRIGGERED; then
    sleep 4
    RUN_URL=$("$GH_CMD" run list \
      --repo "${GH_USER}/${REPO_NAME}" \
      --workflow "update.yml" \
      --limit 1 \
      --json url \
      --jq '.[0].url' 2>/dev/null || echo "")
    [[ -n "$RUN_URL" ]] && ok "  執行中：${RUN_URL}"
  else
    warn "  自動觸發失敗，請手動執行（見下方說明）"
  fi
else
  echo ""
  echo -e "  ${C_BOLD}請手動觸發第一次資料更新：${C_RESET}"
  echo -e "  1. 前往 ${C_CYAN}https://github.com/${GH_USER}/${REPO_NAME}/actions${C_RESET}"
  echo -e "  2. 左側選「每週更新 SAR 取像資料」"
  echo -e "  3. 右側點「Run workflow」→「Run workflow」"
  echo ""
  read -rp "  按 Enter 繼續（不需等 workflow 跑完）…"
fi

# ═══════════════════════════════════════════════════════════════════
# 完成
# ═══════════════════════════════════════════════════════════════════
hr
echo ""
echo -e "${C_BOLD}${C_GREEN}  ✓ 部署完成！${C_RESET}"
echo ""
printf "  %-10s %s\n" "Repo："    "${C_CYAN}https://github.com/${GH_USER}/${REPO_NAME}${C_RESET}"
printf "  %-10s %s\n" "Actions：" "${C_CYAN}https://github.com/${GH_USER}/${REPO_NAME}/actions${C_RESET}"
printf "  %-10s %s\n" "網頁："    "${C_CYAN}https://${GH_USER}.github.io/${REPO_NAME}/${C_RESET}"
echo ""
echo -e "  ${C_YELLOW}Actions 約需 2–5 分鐘完成，之後網頁才會顯示取像資料。${C_RESET}"
echo -e "  之後每週一 10:00（台灣時間）自動更新。"
echo ""
hr

if $HAS_GH_CLI; then
  echo ""
  echo -e "${C_BOLD}  常用指令：${C_RESET}"
  echo ""
  echo -e "  ${C_CYAN}# 查看最近執行狀態${C_RESET}"
  echo -e "  $GH_CMD run list --repo ${GH_USER}/${REPO_NAME} --limit 5"
  echo ""
  echo -e "  ${C_CYAN}# 手動觸發更新（查詢過去 14 天）${C_RESET}"
  echo -e "  $GH_CMD workflow run update.yml --repo ${GH_USER}/${REPO_NAME} -f days_back=14"
  echo ""
  echo -e "  ${C_CYAN}# 即時監看執行進度${C_RESET}"
  echo -e "  $GH_CMD run watch --repo ${GH_USER}/${REPO_NAME}"
  echo ""
fi
hr
