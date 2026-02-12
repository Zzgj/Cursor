# Ollama 模型管理指南

本文档介绍如何在 1Panel 容器中管理 Ollama 模型，包括模型的卸载/删除以及切换到云端模型的方法。

> 官方文档：https://docs.ollama.com/

---

## 目录

- [1. 模型基本管理命令](#1-模型基本管理命令)
- [2. 卸载（删除）已下载的模型](#2-卸载删除已下载的模型)
- [3. 切换到云端模型](#3-切换到云端模型)
- [4. 常见问题](#4-常见问题)

---

## 1. 模型基本管理命令

首先通过 `/bin/sh` 进入 1Panel 中 Ollama 容器的终端：

```bash
# 查看已下载的所有模型
ollama list

# 查看正在运行的模型
ollama ps

# 查看某个模型的详细信息
ollama show deepseek-r1:1.5b
```

---

## 2. 卸载（删除）已下载的模型

### 2.1 删除指定模型

使用 `ollama rm` 命令删除不需要的模型：

```bash
# 删除 deepseek-r1:1.5b 模型
ollama rm deepseek-r1:1.5b
```

执行后，该模型的所有文件（权重、配置等）将从本地磁盘中移除。

### 2.2 验证模型已删除

```bash
# 再次查看模型列表，确认模型已被移除
ollama list
```

### 2.3 停止正在运行的模型

如果模型正在运行中，需要先停止它：

```bash
# 停止指定模型
ollama stop deepseek-r1:1.5b

# 然后再删除
ollama rm deepseek-r1:1.5b
```

### 2.4 批量删除模型

如果需要删除多个模型，可以逐个执行 `ollama rm`：

```bash
ollama rm deepseek-r1:1.5b
ollama rm llama3:8b
ollama rm qwen2:7b
```

### 2.5 清理模型存储目录（高级）

Ollama 模型默认存储在容器内的 `/root/.ollama/models` 目录下。如果需要彻底清理空间：

```bash
# 查看模型占用的磁盘空间
du -sh /root/.ollama/models

# 危险操作：删除所有模型数据（请谨慎）
# rm -rf /root/.ollama/models/*
```

---

## 3. 切换到云端模型

Ollama 本身是一个 **本地模型运行框架**，它不直接提供云端模型服务。要使用云端模型，您有以下几种方案：

### 方案一：通过 Ollama 下载并运行其他模型（仍为本地）

Ollama 支持从其模型库中拉取不同的模型，本质上是下载到本地运行：

```bash
# 拉取并运行其他模型（会自动下载）
ollama run llama3:8b
ollama run qwen2:7b
ollama run gemma2:9b
ollama run phi3:mini

# 仅下载模型，不立即运行
ollama pull llama3:8b
```

可用模型列表请参考：https://ollama.com/library

### 方案二：使用云端 API 服务替代 Ollama

如果您希望使用云端大模型（不占用本地资源），建议使用以下云端 API 服务：

| 服务商 | 模型 | API 兼容性 | 官网 |
|--------|------|-----------|------|
| **DeepSeek** | DeepSeek-R1, DeepSeek-V3 | OpenAI 兼容 | https://platform.deepseek.com |
| **OpenAI** | GPT-4o, GPT-4o-mini | OpenAI 原生 | https://platform.openai.com |
| **阿里云百炼** | Qwen 系列 | OpenAI 兼容 | https://dashscope.aliyun.com |
| **智谱 AI** | GLM-4 系列 | OpenAI 兼容 | https://open.bigmodel.cn |
| **硅基流动 (SiliconFlow)** | 多种开源模型 | OpenAI 兼容 | https://siliconflow.cn |
| **月之暗面** | Kimi (Moonshot) | OpenAI 兼容 | https://platform.moonshot.cn |

这些服务都提供与 OpenAI 兼容的 API 接口，可以在您的应用中直接替换 Ollama 的地址。

### 方案三：Ollama + 云端 API 共存（推荐）

许多工具（如 Open WebUI、Chatbox、Cherry Studio 等）同时支持 Ollama 本地模型和云端 API。您可以：

1. **保留 Ollama** 用于运行小型本地模型（低延迟、隐私保护）
2. **配置云端 API** 用于运行大型模型（效果更好、不占本地资源）

#### 示例：在应用中同时配置 Ollama 和云端 API

```yaml
# 示例配置（以常见的 AI 客户端为例）

# Ollama 本地模型配置
ollama:
  base_url: "http://your-ollama-host:11434"  # Ollama API 地址
  model: "deepseek-r1:1.5b"

# 云端模型配置（以 DeepSeek 为例）
cloud:
  base_url: "https://api.deepseek.com"
  api_key: "your-api-key-here"
  model: "deepseek-reasoner"
```

### 方案四：使用 LiteLLM 作为统一代理

[LiteLLM](https://github.com/BerriAI/litellm) 可以将多个模型提供商（包括 Ollama）统一为一个 OpenAI 兼容的 API 接口：

```bash
# 安装 LiteLLM
pip install litellm

# 启动代理，同时支持 Ollama 本地模型和云端模型
litellm --model ollama/deepseek-r1:1.5b
```

---

## 4. 常见问题

### Q: 删除模型后磁盘空间没有释放？

在 Docker 容器中，删除模型后可能需要重启容器才能完全释放空间：

```bash
# 在 1Panel 中重启 Ollama 容器，或使用 Docker 命令
docker restart ollama
```

### Q: Ollama API 地址是什么？

Ollama 默认监听 `11434` 端口，API 地址为：

```
http://localhost:11434
```

在 1Panel 中部署时，确保该端口已映射到宿主机。

### Q: 如何让 Ollama 监听所有网络接口？

设置环境变量：

```bash
OLLAMA_HOST=0.0.0.0:11434
```

在 1Panel 的容器环境变量中添加即可。

### Q: 如何查看 Ollama 支持的所有模型？

```bash
# 在终端中无法直接搜索，请访问官方模型库
# https://ollama.com/library
```

### Q: 云端 API 如何调用？

以 DeepSeek 云端 API 为例（兼容 OpenAI 格式）：

```bash
curl https://api.deepseek.com/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "deepseek-reasoner",
    "messages": [
      {"role": "user", "content": "你好"}
    ]
  }'
```

---

## 总结

| 操作 | 命令/方法 |
|------|----------|
| 查看已下载模型 | `ollama list` |
| 删除指定模型 | `ollama rm deepseek-r1:1.5b` |
| 停止运行中的模型 | `ollama stop deepseek-r1:1.5b` |
| 下载新模型 | `ollama pull <模型名>` |
| 运行模型 | `ollama run <模型名>` |
| 切换到云端模型 | 使用云端 API 服务（见方案二） |
