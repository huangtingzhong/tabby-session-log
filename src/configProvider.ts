import { ConfigProvider } from 'tabby-core'

/** 会话日志配置, 写入 config.yaml 的 sessionLog 段 */
export interface SessionLogConfig {
    /** off | on | ssh */
    autoSave?: 'off' | 'on' | 'ssh'
    /** 日志目录, 空则用用户主目录 */
    directory?: string | null
    /**
     * 文件名模板 (CRT 风格).
     * %Y%M%D 年月日, %h%m%s 时分秒, %S 会话标题, %P profile, %H 主机, %% 字面量 %
     */
    filenamePattern?: string
    /** 同名文件追加; false 则覆盖 */
    append?: boolean
    /** 剥离 ANSI/OSC 控制序列 */
    stripControls?: boolean
    /** 每行前添加毫秒时间戳 */
    lineTimestamp?: boolean
}

export const DEFAULT_FILENAME_PATTERN = '%Y%M%D-%h%m%s-%S.txt'

export class SessionLogConfigProvider extends ConfigProvider {
    defaults = {
        sessionLog: {
            autoSave: 'ssh',
            directory: null,
            filenamePattern: DEFAULT_FILENAME_PATTERN,
            append: true,
            stripControls: true,
            lineTimestamp: true,
        } as SessionLogConfig,
        // 关闭旧插件默认, 避免双写 (旧插件若仍安装)
        saveOutput: {
            autoSave: 'off',
            autoSaveDirectory: null,
        },
    }
}
