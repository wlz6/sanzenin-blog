---
title: Neovim 快捷键速查
published: 2026-08-10
description: 基于 LazyVim + 个人自定义配置。 Leader 键为空格键 。 最后更新：2026-08-10 | 模式 | 按键 | 功能 | |------|------|------| | n | | 编译并运行当前文件（C++ / Python / Go） | | n | rr | 运行 CompetiTest |
image: ""
tags:
  - 工具与配置
  - Obsidian
category: 工具与配置
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# Neovim 快捷键速查

> 基于 **LazyVim** + 个人自定义配置。
> Leader 键为空格键 `<Space>`。
> 最后更新：2026-08-10

---

## 一、自定义快捷键（`~/.config/nvim/lua/config/keymaps.lua`）

### 运行与测试

| 模式 | 按键 | 功能 |
|------|------|------|
| `n` | `<F5>` | 编译并运行当前文件（C++ / Python / Go） |
| `n` | `<leader>rr` | 运行 CompetiTest |
| `n` | `<leader>ra` | 添加 CompetiTest 测试用例 |
| `n` | `<leader>re` | 编辑 CompetiTest 测试用例 |
| `n` | `<leader>rd` | 删除 CompetiTest 测试用例 |
| `n` | `<leader>rt` | 切换 CompetiTest UI |
| `n` | `<leader>rc` | 接收 CompetiTest 测试用例 |

### 移动与滚动

| 模式 | 按键 | 功能 |
|------|------|------|
| `n` | `<C-d>` | 半屏向下滚动并居中光标 |
| `n` | `<C-u>` | 半屏向上滚动并居中光标 |
| `n` | `n` | 下一个搜索结果并居中 |
| `n` | `N` | 上一个搜索结果并居中 |
| `v` | `J` | 将选区向下移动一行 |
| `v` | `K` | 将选区向上移动一行 |
| `v` | `<` | 向左缩进并保持选中 |
| `v` | `>` | 向右缩进并保持选中 |

### 终端模式

| 模式 | 按键 | 功能 |
|------|------|------|
| `t` | `<Esc><Esc>` | 退出终端模式 |

---

## 二、补全（`blink.cmp`）

当前使用 `super-tab` preset。

| 模式 | 按键 | 功能 |
|------|------|------|
| `i` / `s` | `<Tab>` | 选择下一个补全项；在 snippet 中跳转到下一占位符 |
| `i` / `s` | `<S-Tab>` | 选择上一个补全项；在 snippet 中跳转到上一占位符 |
| `i` / `s` | `<CR>` | 确认并插入当前补全项 |
| `i` / `s` | `<C-e>` | 取消补全菜单 |
| `i` / `s` | `<C-space>` | 手动触发补全 |
| `i` / `s` | `<C-n>` / `<C-p>` | 下 / 上一个候选 |
| `i` / `s` | `<C-f>` / `<C-b>` | 向下 / 向上滚动文档 |
| `i` / `s` | `<C-k>` | 显示函数签名帮助 |
| `i` / `s` | `<C-s>` | 显示函数签名帮助（LSP） |

---

## 三、文件与搜索

### Snacks Picker / Telescope（LazyVim 默认）

| 模式 | 按键 | 功能 |
|------|------|------|
| `n` | `<leader><Space>` | 查找文件 |
| `n` | `<leader>/` | 全局搜索（live grep） |
| `n` | `<leader>:` | 命令历史 |
| `n` | `<leader>,` | 切换 buffer |
| `n` | `<leader>.` | 切换最近文件 |
| `n` | `<leader>ff` | 查找文件 |
| `n` | `<leader>fg` | 全局搜索 |
| `n` | `<leader>fb` | 查找 buffer |
| `n` | `<leader>fh` | 查找帮助 |
| `n` | `<leader>fr` | 查找最近文件 |
| `n` | `<leader>fk` | 查找 keymaps |
| `n` | `<leader>uC` | 查找并切换 colorscheme |

### 文件树（Neo-tree）

| 模式 | 按键 | 功能 |
|------|------|------|
| `n` | `<leader>e` | 打开/关闭文件树（当前文件定位） |
| `n` | `<leader>E` | 打开文件树并定位到当前文件 |

### Buffer

| 模式 | 按键 | 功能 |
|------|------|------|
| `n` | `<leader>bd` | 删除当前 buffer |
| `n` | `<leader>bD` | 强制删除当前 buffer |
| `n` | `<leader>bp` | 固定当前 buffer |
| `n` | `<leader>bo` | 关闭其他 buffer |
| `n` | `[b` | 上一个 buffer |
| `n` | `]b` | 下一个 buffer |
| `n` | `<S-h>` | 切换到上一个 buffer |
| `n` | `<S-l>` | 切换到下一个 buffer |

---

## 四、LSP（语言服务器）

| 模式 | 按键 | 功能 |
|------|------|------|
| `n` | `gd` | 跳转到定义 |
| `n` | `gD` | 跳转到声明 |
| `n` | `gr` | 显示引用（Telescope） |
| `n` | `gI` | 跳转到实现 |
| `n` | `gy` | 跳转到类型定义 |
| `n` | `K` | 显示悬停文档 |
| `n` | `<leader>ca` | 代码操作（code action） |
| `n` | `<leader>cA` | 范围代码操作 |
| `n` | `<leader>cr` | 重命名 |
| `n` | `<leader>cf` | 格式化 |
| `n` | `<leader>cd` | 显示行内诊断 |
| `n` | `[d` | 上一个诊断 |
| `n` | `]d` | 下一个诊断 |
| `n` | `[D` | 第一个诊断 |
| `n` | `]D` | 最后一个诊断 |
| `n` | `<C-w>d` | 显示光标下诊断 |
| `i` | `<C-k>` | 显示签名帮助 |

---

## 五、代码编辑

### 注释（mini.comment / nvim-ts-context-commentstring）

| 模式 | 按键 | 功能 |
|------|------|------|
| `n` | `gcc` | 切换当前行注释 |
| `n` | `gc` + motion | 切换指定范围注释 |
| `v` | `gc` | 切换选区注释 |

### Surround / Text Objects

| 模式 | 按键 | 功能 |
|------|------|------|
| `n` | `ys` + motion + char | 添加包围符号 |
| `n` | `ds` + char | 删除包围符号 |
| `n` | `cs` + old + new | 修改包围符号 |
| `v` / `x` | `an` / `in` | 选择 treesitter 父/子节点 |
| `o` | `an` / `in` | treesitter 节点 textobject |

### Flash（快速跳转）

| 模式 | 按键 | 功能 |
|------|------|------|
| `n` / `x` / `o` | `s` | 触发 flash 跳转 |
| `n` / `x` / `o` | `S` | 触发 treesitter 选择 |

### 撤销树（undotree）

| 模式 | 按键 | 功能 |
|------|------|------|
| `n` | `<leader>uo` | 打开 undo 树 |

---

## 六、窗口与终端

### 窗口分屏

| 模式 | 按键 | 功能 |
|------|------|------|
| `n` | `<leader>w` | 窗口相关前缀 |
| `n` | `<leader>ww` | 切换到另一个窗口 |
| `n` | `<leader>wd` | 关闭当前窗口 |
| `n` | `<leader>w-` | 水平分割 |
| `n` | `<leader>w\|` | 垂直分割 |
| `n` | `<C-h>` | 移动到左边窗口 |
| `n` | `<C-j>` | 移动到下方窗口 |
| `n` | `<C-k>` | 移动到上方窗口 |
| `n` | `<C-l>` | 移动到右边窗口 |
| `n` | `<C-Up>` | 增加窗口高度 |
| `n` | `<C-Down>` | 减小窗口高度 |
| `n` | `<C-Left>` | 减小窗口宽度 |
| `n` | `<C-Right>` | 增加窗口宽度 |

### 终端

| 模式 | 按键 | 功能 |
|------|------|------|
| `n` | `<leader>ft` | 打开浮动终端 |
| `n` | `<leader>fT` | 打开底部终端 |
| `t` | `<Esc><Esc>` | 退出终端模式（自定义） |

---

## 七、Git

| 模式 | 按键 | 功能 |
|------|------|------|
| `n` | `<leader>gg` | 打开 LazyGit |
| `n` | `<leader>gB` | 打开 Git blame |
| `n` | `<leader>gh` | Git hunk 前缀 |
| `n` | `]h` | 下一个 hunk |
| `n` | `[h` | 上一个 hunk |

---

## 八、LazyVim 自身

| 模式 | 按键 | 功能 |
|------|------|------|
| `n` | `<leader>l` | LazyVim 前缀 |
| `n` | `<leader>ll` | 打开 Lazy 插件管理器 |
| `n` | `<leader>lc` | 打开 LazyVim Changelog |
| `n` | `<leader>u` | UI 相关前缀 |
| `n` | `<leader>uc` | 切换行号 |
| `n` | `<leader>ud` | 切换诊断 |
| `n` | `<leader>ui` | 切换缩进线 |
| `n` | `<leader>un` | 关闭所有通知 |
| `n` | `<leader>up` | 切换 paste 模式 |
| `n` | `<leader>us` | 切换拼写检查 |
| `n` | `<leader>uw` | 切换换行 |
| `n` | `<leader>uz` | 切换 Zen 模式 |

---

## 九、常用 Vim 基础操作

### 移动

| 按键 | 功能 |
|------|------|
| `h` `j` `k` `l` | 左 / 下 / 上 / 右 |
| `w` / `b` / `e` | 下一个词首 / 上一个词首 / 下一个词尾 |
| `0` / `$` | 行首 / 行尾 |
| `gg` / `G` | 文件开头 / 文件末尾 |
| `:{n}` | 跳到第 n 行 |
| `%` | 匹配括号 |
| `*` / `#` | 搜索当前单词下 / 上一个 |

### 编辑

| 按键 | 功能 |
|------|------|
| `i` / `a` | 光标前 / 后插入 |
| `I` / `A` | 行首 / 行尾插入 |
| `o` / `O` | 下方 / 上方插入新行 |
| `dd` | 删除一行 |
| `yy` | 复制一行 |
| `p` / `P` | 在光标后 / 前粘贴 |
| `u` / `<C-r>` | 撤销 / 重做 |
| `x` | 删除光标下字符 |
| `r` | 替换单个字符 |
| `cw` / `ciw` | 修改单词 |
| `dap` | 删除整个段落 |
| `di"` / `di(` / `di{` | 删除引号 / 圆括号 / 花括号内内容 |

### 可视模式

| 按键 | 功能 |
|------|------|
| `v` | 字符选择 |
| `V` | 行选择 |
| `<C-v>` | 块选择 |
| `>` / `<` | 缩进 / 反缩进 |
| `y` / `d` | 复制 / 删除选区 |

---

## 配置文件位置

| 文件 | 作用 |
|------|------|
| `~/.config/nvim/init.lua` | 入口文件 |
| `~/.config/nvim/lua/config/keymaps.lua` | 自定义快捷键 |
| `~/.config/nvim/lua/config/options.lua` | 编辑器选项 |
| `~/.config/nvim/lua/config/autocmds.lua` | 自动命令 |
| `~/.config/nvim/lua/plugins/` | 插件配置目录 |
| `~/.config/nvim/lazyvim.json` | LazyVim extras 配置 |
