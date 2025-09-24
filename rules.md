# Claude Code Rule: Next.js 高度自動化的簡潔程式碼與 TDD 規則

## 🎯 核心目標 (Core Goal)

此規則旨在為 Next.js 專案建立一個全自動化的開發流程，以 **測試驅動開發 (TDD)**
為核心原則。目標是產出 **最簡潔 (Concise)**、**可維護 (Maintainable)** 且
**經過完整測試 (Fully-Tested)**
的高品質 TypeScript/JavaScript 程式碼。所有程式碼的變更都會觸發即時的格式化、風格檢查、型別檢查與單元測試。

## 🔬 核心哲學：紅-綠-重構 (Red-Green-Refactor)

整個開發流程將嚴格遵守 TDD 循環，特別是在開發 React 元件和業務邏輯時：

1.  **紅 (Red)**：先使用 `Write` 或 `Edit` 工具，利用 **Jest** 和 **React Testing Library**
    編寫一個**會失敗的測試**案例，精確定義新功能或元件的預期行為。
2.  **綠 (Green)**：使用 `Edit` 或 `Write`
    編寫**最精簡**的產品程式碼 (例如 React 元件或 Hook)，剛好能讓測試通過即可。
3.  **重構 (Refactor)**：在測試的保護下，使用 `MultiEdit`、`Grep`
    等工具重構程式碼，提升可讀性與簡潔性，並確保所有測試依然通過。

---

## 🛠️ 工具方案與工作流程 (Tooling & Workflow)

### 步驟 1：理解需求與規劃 (UserPromptSubmit)

當使用者提出新功能或修改需求時，自動執行以下動作：

1.  **分析上下文**: 使用 `Glob('**/*.{ts,tsx,js,jsx}')` 了解專案結構，並用 `Grep`
    搜尋相關關鍵字，理解現有元件與邏輯。
2.  **制定 TDD 計劃**: 明確規劃出 "紅-綠-重構" 的步驟。
    - **計劃範例**: "好的，我將首先在 `components/Button/Button.test.tsx`
      中新增一個測試來驗證點擊後的新行為。確認它失敗後，我會修改 `components/Button/Button.tsx`
      來實現這個功能，最後進行重構。"

### 步驟 2：建立失敗的測試 (Red Phase)

1.  **定位測試檔案**: 通常測試檔案會與原始碼檔案放在一起，例如 `[ComponentName].test.tsx`。使用
    `Glob` 尋找。
2.  **編寫測試**: 使用 `Write` 或 `Edit` 新增一個測試案例。利用 `@testing-library/react` 的 `render`
    和 `screen` 來操作和斷言元件的行為。
3.  **驗證失敗**: 使用 `Bash` 執行測試，並預期看到失敗結果。
    - **指令**: `npm test -- [test_file_path]` (或 `yarn test`, `pnpm test`)

### 步驟 3：撰寫產品程式碼 (Green Phase)

1.  **實作功能**: 使用 `Edit` 或 `Write`
    編寫最少的 React 元件或函式程式碼，讓剛剛的測試轉為**通過**。
2.  **不追求完美**: 在此階段，首要目標是讓測試通過，而不是寫出最優雅的程式碼。

### 步驟 4：自動化即時回饋 (PostToolUse)

這是此規則的核心。每當 `.ts`, `.tsx`, `.js`, 或 `.jsx` 檔案被修改後，自動觸發一系列品質保證動作。

- **觸發條件**: 在 `Edit`, `MultiEdit`, `Write`
  工具成功執行後，如果目標檔案是 JavaScript/TypeScript 相關檔案。
- **自動化流程**:
  1.  **自動格式化 (Prettier)**: 使用 `Bash` 執行 Prettier，確保程式碼風格一致。
      - **指令**: `prettier --write [modified_file_path]`
  2.  **語法風格修復 (ESLint)**: 使用 `Bash` 執行 ESLint，找出並自動修復潛在問題。
      - **指令**: `eslint --fix [modified_file_path]`
  3.  **執行相關測試 (Jest)**: 使用 `Bash` 執行與變更檔案相關的測試，獲得快速回饋。
      - **指令**: `npm test -- --findRelatedTests [modified_file_path]`
  4.  **型別檢查 (TypeScript)**: 執行 TypeScript 編譯器進行靜態型別檢查，確保沒有型別錯誤。
      - **指令**: `tsc --noEmit`

### 步驟 5：重構與簡化 (Refactor Phase)

1.  **尋找優化機會**: 在測試通過的基礎上，使用 `Grep`
    尋找重複的程式碼、過於複雜的元件或需要拆分的自訂 Hooks (Custom Hooks)。
2.  **安全重構**: 使用 `Edit` 或 `MultiEdit` 進行重構。由於 `PostToolUse`
    會在每次修改後自動執行測試，這確保了重構過程的安全性。
3.  **尋求最佳實踐**: 若不確定如何簡化，可使用 `WebSearch` 查詢 "React hooks best
    practices" 或 "Next.js performance optimization" 來尋找更佳實踐。

### 步驟 6：最終驗證 (Stop)

當所有開發工作完成，準備交付時，執行最終的全面檢查。

1.  **運行完整測試套件**: 使用 `Bash` 執行專案的**所有測試**。
    - **指令**: `npm test -- --coverage` (執行所有測試並生成覆蓋率報告)
2.  **最終型別與風格檢查**: 對整個專案執行 ESLint 和 TypeScript 檢查。
    - **指令**: `eslint .` 和 `tsc --noEmit`
3.  **執行生產環境建置**: 執行 `next build`
    確保專案可以成功建置，這能捕捉到一些僅在建置時期才會出現的錯誤。
    - **指令**: `npm run build`
4.  **提交總結**: 提供本次修改的摘要，並附上測試結果與覆蓋率數據。

---

## ⚙️ 執行點配置 (Execution Point Configuration)

**1. `PostToolUse`**

- **Condition**:
  `tool_name in ['Edit', 'MultiEdit', 'Write'] and any(file.path.endswith(('.ts', '.tsx', '.js', '.jsx')) for file in modified_files)`
- **Actions (in order)**:
  1.  `Bash('prettier --write [file_path]')`
  2.  `Bash('eslint --fix [file_path]')`
  3.  `Bash('npm test -- --findRelatedTests [file_path]')`
  4.  `Bash('tsc --noEmit')`

**2. `Stop`**

- **Condition**: `task_status == 'completed'`
- **Actions**:
  1.  `Bash('npm test -- --coverage')`
  2.  `Bash('eslint .')`
  3.  `Bash('npm run build')`
  4.  Generate a summary of changes, test results, and coverage report.

**3. `UserPromptSubmit`**

- **Condition**: `true` (Always active)
- **Actions**:
  1.  Analyze prompt for intent (new component, API route, page, refactor).
  2.  Formulate and state a TDD-based plan.
  3.  Use `Glob` and `Grep` to gather initial context.

## ✨ 總結優勢 (Summary of Benefits)

- **極致的簡潔性**:
  TDD 確保只撰寫必要程式碼，而 Prettier 和 ESLint 的自動化則保證了程式碼的高度一致性與可讀性。
- **完整的測試性**: 確保核心邏輯與 UI 元件都有對應的測試，`Stop`
  階段的全量測試、覆蓋率報告和生產建置則提供了最終保障。
- **即時回饋**: 在儲存檔案的**瞬間**就能知道程式碼是否符合規範、是否存在型別錯誤、是否破壞了既有功能。
- **前端開發信心**: 自動化的測試與檢查流程，讓開發者可以自信地進行重構或新增功能，尤其是在複雜的 React 元件狀態管理中。
- **團隊協作一致性**: 強制性的格式化與風格檢查，確保團隊成員提交的程式碼風格保持一致。
