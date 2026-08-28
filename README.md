# tabby-session-log

Tabby 会话日志插件：按 CRT 风格自定义文件名模板、剥离控制序列、可选行级毫秒时间戳，写失败时弹出提示。可作为 `tabby-save-output` 的替代（避免与旧插件同时启用以免双写）。

## 功能

- **自动保存**：`off` / `on` / `ssh`（仅 SSH）
- **文件名模板**（CRT 风格），默认：`%Y%M%D-%h%m%s-%S.txt`
- 剥离 ANSI / OSC（含窗口标题序列）等控制字符
- 每行前可选时间戳：`YYYY-MM-DD HH:mm:ss.SSS`
- 同名文件追加或覆盖
- 写入失败时 Toast 提示
- 终端右键菜单可手动开始/停止记录
- 设置页标题：**会话日志**

## 文件名占位符

| 占位符 | 含义 |
|--------|------|
| `%Y` `%M` `%D` | 年 / 月 / 日 |
| `%h` `%m` `%s` | 时 / 分 / 秒 |
| `%S` | 会话标题 |
| `%P` | Profile 名 |
| `%H` | 主机名 |
| `%%` | 字面量 `%` |

## 依赖

- [Tabby](https://tabby.sh/)

> 包名必须以 `tabby-` 开头，否则 Tabby 不会加载。

## 安装

```bash
git clone git@github.com:huangtingzhong/tabby-session-log.git
cd tabby-session-log
./install.sh
```

脚本会：

1. `npm install` + `npm run build`
2. **实拷**到 `~/Library/Application Support/tabby/plugins/node_modules/tabby-session-log/`
3. 从 plugins 依赖中移除旧的 `tabby-save-output`（若存在）
4. 若尚无 `sessionLog` 配置，尝试从旧 `saveOutput` 迁移到 `config.yaml`（会先备份）

然后 **完全退出** Tabby（`Cmd+Q`）再重新打开，在 **设置 → 会话日志** 中调整选项。

## 配置

`~/Library/Application Support/tabby/config.yaml` 示例：

```yaml
sessionLog:
  autoSave: ssh                 # off | on | ssh
  directory: null               # null 则用用户主目录；也可写绝对路径
  filenamePattern: '%Y%M%D-%h%m%s-%S.txt'
  append: true
  stripControls: true
  lineTimestamp: true
```

安装脚本若检测到旧插件，会把 `saveOutput.autoSave` 设为 `off`，避免双份日志。

## 开发

```bash
npm install
npm run build
npm run watch
./install.sh
```

## License

MIT
