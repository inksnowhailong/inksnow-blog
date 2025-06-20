---
title: 中文Windows系统下程序输出重定向乱码问题解决方案
date: 2025-6-20
categories:
  - 编程
tags:
  - 实验
---

## 导言
最近我在用 Rust 开发时，遇到了一个让人头疼的问题：运行 `cargo run -- version Cargo.toml > output.txt` 将输出重定向到文件后，打开 `output.txt` 却发现里面全是乱码！我的程序确实是UTF8但是输出的文件却是UTF16LE编码的。特别是在中文 Windows 系统上，这个问题尤为明显。
经过一番折腾和向 AI 求助，我终于搞清楚了问题的根源，并找到了一个简单有效的解决方案。这篇博客将记录我的问题、分析过程和解决办法，希望能帮到遇到同样困扰的你。

---

## 问题的表象
事情是这样的：我在中文 Windows 系统上用 PowerShell 运行了一个 Rust 命令，想把输出保存到文件里：
```powershell
cargo run -- version Cargo.toml > output.txt
```
命令运行没问题，但打开 `output.txt` 后，里面的内容不是我期待的版本信息，而是一堆乱码。哪怕改为UTF8编码打开，也是乱码。这让我百思不得其解——明明在控制台直接运行时输出是正常的，为什么重定向到文件就出问题了呢？

---

## 问题的根源
经过研究，我发现问题的核心在于编码的不一致。整个过程可以看作三个人在用不同语言对话。让我们把这三个环节拆开来看：

### 1. Rust 程序（`cargo run`）
- **它的语言**：Rust 程序默认用 UTF-8 编码输出内容。这是现代编程语言的“母语”，简单高效，全球通用。

### 2. PowerShell 的管道（`|` 或 `>`）
- **它的“听力”**：PowerShell 负责接收外部程序（如 Rust）的输出，并试图理解这些内容。它的“听力”模式由 `[Console]::OutputEncoding` 设置决定。
- **关键区别**：
  - 在**英文版 Windows** 上，默认是 Code Page 437（一种扩展 ASCII 编码）。
  - 在**中文版 Windows** 上，默认是 Code Page 936（也就是 GBK 编码）。
- 这就埋下了隐患：Rust 说的是 UTF-8，而 PowerShell 听的是 GBK 或 CP 437，两者不匹配就会“听不懂”。

### 3. PowerShell 的文件输出（`>`）
- **它的“笔”**：PowerShell 在理解了内容后，会把结果写到文件里。在 PowerShell 5.1 中，默认使用 UTF-16 LE 编码。
- 如果前面“听”的环节已经出了乱码，后面再怎么写也救不回来。

---

## 解决方案
明白了问题根源后，解决办法就很简单了：让 PowerShell 的“听力”也用 UTF-8，这样就能和 Rust 程序无缝对话。具体操作是通过修改 PowerShell 的配置文件（Profile），让它启动时自动设置 `[Console]::OutputEncoding` 为 UTF-8。

### 具体步骤
#### 第 1 步：找到并打开你的 Profile 文件
1. 打开 PowerShell 窗口。
2. 运行以下命令检查配置文件是否存在：
   ```powershell
   Test-Path $PROFILE
   ```
   - 如果返回 `True`，说明已有配置文件。
   - 如果返回 `False`，需要创建。
3. 用以下命令创建（如果需要）并打开配置文件：
   ```powershell
   if (!(Test-Path $PROFILE)) { New-Item -Path $PROFILE -ItemType File -Force }
   code $PROFILE
   ```
   > **提示**：没装 VS Code？可以用 `notepad $PROFILE` 用记事本打开。

#### 第 2 步：将编码命令写入 Profile
在打开的配置文件（通常是 `Microsoft.PowerShell_profile.ps1`）中，添加这一行：
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```
保存并关闭文件。

#### 第 3 步：重启 PowerShell 并验证
关闭当前 PowerShell 窗口，重新打开一个新的。然后再试试：
```powershell
cargo run -- version Cargo.toml > output.txt
```
这次打开 `output.txt`，内容应该完美显示，不再有乱码！

---

## 结语
通过这次探索，我不仅解决了 Rust 输出乱码的问题，还深入理解了 PowerShell 管道中的编码机制。这个方案简单实用，适用于所有 Windows 系统，尤其是在中文环境下，能极大提升开发体验。如果你也遇到类似问题，不妨试试这个方法——让编码一致，乱码自然无处藏身！
