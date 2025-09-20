#!/bin/bash
# 照片庫功能 Git Worktree 設置腳本

echo "設置照片庫功能並行開發環境..."

# 確保在主專案目錄
if [ ! -d ".git" ]; then
    echo "錯誤: 請在主專案根目錄執行此腳本"
    exit 1
fi

# 建立worktree目錄
WORKTREE_BASE="../pcm-photo-worktrees"
mkdir -p $WORKTREE_BASE

echo "建立並行開發分支..."

# Group A+C+G: 基礎架構與狀態管理
echo "1. 建立基礎架構分支 (1-1, 3-3, 7-1, 7-2)..."
git worktree add $WORKTREE_BASE/infra feature/photo-infra 2>/dev/null || echo "  分支已存在"

# Group C: UI元件開發
echo "2. 建立UI元件分支 (3-1, 3-2)..."
git worktree add $WORKTREE_BASE/ui feature/photo-ui 2>/dev/null || echo "  分支已存在"

# Group D: 燈箱預覽
echo "3. 建立燈箱預覽分支 (4-1, 4-2)..."
git worktree add $WORKTREE_BASE/lightbox feature/photo-lightbox 2>/dev/null || echo "  分支已存在"

# Group E+F: 下載與搜尋
echo "4. 建立功能分支 (5-1, 5-2, 6-1, 6-2)..."
git worktree add $WORKTREE_BASE/features feature/photo-features 2>/dev/null || echo "  分支已存在"

# Group H: 效能與響應式
echo "5. 建立效能優化分支 (8-1, 8-2)..."
git worktree add $WORKTREE_BASE/performance feature/photo-performance 2>/dev/null || echo "  分支已存在"

# Group I: API開發
echo "6. 建立API分支 (9-1, 9-2)..."
git worktree add $WORKTREE_BASE/api feature/photo-api 2>/dev/null || echo "  分支已存在"

# Group J: 測試開發
echo "7. 建立測試分支 (10-1, 10-2)..."
git worktree add $WORKTREE_BASE/tests feature/photo-tests 2>/dev/null || echo "  分支已存在"

echo ""
echo "✅ Worktree 設置完成！"
echo ""
echo "分支對應任務:"
echo "  $WORKTREE_BASE/infra       -> Tasks: 1-1, 3-3, 7-1, 7-2"
echo "  $WORKTREE_BASE/ui          -> Tasks: 3-1, 3-2"
echo "  $WORKTREE_BASE/lightbox    -> Tasks: 4-1, 4-2"
echo "  $WORKTREE_BASE/features    -> Tasks: 5-1, 5-2, 6-1, 6-2"
echo "  $WORKTREE_BASE/performance -> Tasks: 8-1, 8-2"
echo "  $WORKTREE_BASE/api         -> Tasks: 9-1, 9-2"
echo "  $WORKTREE_BASE/tests       -> Tasks: 10-1, 10-2"
echo ""
echo "查看所有worktrees:"
echo "  git worktree list"
echo ""
echo "開始開發:"
echo "  cd $WORKTREE_BASE/[分支名稱]"
echo "  查看對應任務檔案: .kiro/specs/project-photo-gallery/tasks/"