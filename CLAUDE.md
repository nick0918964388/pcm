# Claude Code Spec-Driven Development

Kiro-style Spec Driven Development implementation using claude code slash commands, hooks and agents.

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`
- Commands: `.claude/commands/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress
- `iphoto-architecture-improvement` - 改善 iPhone 圖片管理的整體架構
- `iphoto2-enhanced-module` - 整合 NFS 儲存的增強型照片管理模組

## Development Guidelines
- 以英文思考，但以繁體中文生成回應（Think in English, generate in Traditional Chinese）

## Workflow

### Phase 0: Steering (Optional)
`/kiro:steering` - Create/update steering documents
`/kiro:steering-custom` - Create custom steering for specialized contexts

Note: Optional for new features or small additions. You can proceed directly to spec-init.

### Phase 1: Specification Creation
1. `/kiro:spec-init [detailed description]` - Initialize spec with detailed project description
2. `/kiro:spec-requirements [feature]` - Generate requirements document
3. `/kiro:spec-design [feature]` - Interactive: "Have you reviewed requirements.md? [y/N]"
4. `/kiro:spec-tasks [feature]` - Interactive: Confirms both requirements and design review

### Phase 2: Progress Tracking
`/kiro:spec-status [feature]` - Check current progress and phases

## Development Rules
1. **Consider steering**: Run `/kiro:steering` before major development (optional for new features)
2. **Follow 3-phase approval workflow**: Requirements → Design → Tasks → Implementation
3. **Approval required**: Each phase requires human review (interactive prompt or manual)
4. **No skipping phases**: Design requires approved requirements; Tasks require approved design
5. **Update task status**: Mark tasks as completed when working on them
6. **Keep steering current**: Run `/kiro:steering` after significant changes
7. **Check spec compliance**: Use `/kiro:spec-status` to verify alignment

## Steering Configuration

### Current Steering Files
Managed by `/kiro:steering` command. Updates here reflect command changes.

### Active Steering Files
- `product.md`: Always included - Product context and business objectives
- `tech.md`: Always included - Technology stack and architectural decisions
- `structure.md`: Always included - File organization and code patterns

### Custom Steering Files
<!-- Added by /kiro:steering-custom command -->
<!-- Format:
- `filename.md`: Mode - Pattern(s) - Description
  Mode: Always|Conditional|Manual
  Pattern: File patterns for Conditional mode
-->

### Inclusion Modes
- **Always**: Loaded in every interaction (default)
- **Conditional**: Loaded for specific file patterns (e.g., "*.test.js")
- **Manual**: Reference with `@filename.md` syntax

## Development Standards

### Core Principles
1. **Fail Fast** - Check critical prerequisites, then proceed
2. **Trust the System** - Don't over-validate things that rarely fail
3. **Clear Errors** - When something fails, say exactly what and how to fix it
4. **Minimal Output** - Show what matters, skip decoration

### Test Execution Rules
- **Always use test-runner agent** from `.claude/agents/test-runner.md`
- **No mocking** - Use real services for accurate results
- **Verbose output** - Capture everything for debugging
- **Check test structure first** - Before assuming code bugs

### Agent Coordination (Parallel Work)
- **File-level parallelism** - Agents working on different files never conflict
- **Explicit coordination** - When same file needed, coordinate explicitly
- **Fail fast** - Surface conflicts immediately, don't try to be clever
- **Human resolution** - Conflicts are resolved by humans, not agents

### Standard Output Formats

#### Success Output
```
✅ {Action} complete
  - {Key result 1}
  - {Key result 2}
Next: {Single suggested action}
```

#### Error Messages
```
❌ {What failed}: {Exact solution}
Example: "❌ Epic not found: Run /pm:prd-parse feature-name"
```

#### Progress Output
```
{Action}... {current}/{total}
```

### File Operations Best Practices
- Don't ask permission, just create what's needed: `mkdir -p .claude/{directory} 2>/dev/null`
- Use fallback patterns for missing files
- Make atomic commits with clear messages
- Pull frequently to stay synchronized

### Common Anti-Patterns to Avoid
- Over-validation (checking every possible condition)
- Verbose output with unnecessary decoration
- Too many interactive prompts
- Force operations (`--force` flags)

## important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

### 工作關鍵字
- **"提交我的變更"**: 執行 `/commit` 命令
- **"commit 並 push"**: 執行 `/commit` 命令
- **"自動提交"**: 執行 `/commit` 命令

### 測試關鍵字
- **"請用playwright測試"