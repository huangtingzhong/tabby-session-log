/** 清理终端输出中的控制序列, 并可选为每行添加毫秒时间戳 */

const CSI_MISC =
    /[\x08\x1b]((\[\??\d+[hl])|([=<>a-kzNM78])|([()\]][a-b0-2])|(\[\d{0,2}\w)|(\[\d+;\d+[hfy]?)|(\[;?[hf])|(#[3-68])|([01356]n)|(O[mlnp-z]?)|(\/Z)|(\d+)|(\[\?\d;\d0c)|(\d;\dR))/gi

const ANSI_COLOR =
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g

/** OSC 如 ESC]0;title BEL */
const OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g

const CTRL = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g

export function cleanupOutput (data: string, enabled = true): string {
    if (!enabled || typeof data !== 'string') {
        return data
    }
    let out = data.replace(OSC, '')
    out = out.replace(CSI_MISC, '')
    out = out.replace(ANSI_COLOR, '')
    out = out.replace(CTRL, '')
    return out
}

/** 格式: YYYY-MM-DD HH:mm:ss.SSS */
export function formatTimestampMs (d = new Date()): string {
    const p = (n: number, w = 2) => String(n).padStart(w, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
        `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}

/**
 * 为完整行添加行首时间戳. 跨 chunk 的半行由 LineTimestampBuffer 处理.
 */
export function stampCompleteLines (text: string, stamp: () => string): string {
    if (!text) {
        return text
    }
    const parts = text.split('\n')
    const last = parts.pop() as string
    const stamped = parts.map(line => {
        // 保留 \r 结尾的行内容, 时间戳加在可视内容前
        const body = line.replace(/\r$/, '')
        const cr = line.endsWith('\r') ? '\r' : ''
        return `${stamp()} ${body}${cr}`
    })
    if (parts.length === 0) {
        return last
    }
    return stamped.join('\n') + '\n' + last
}

/** 跨数据包缓冲, 保证只在整行结束时打时间戳 */
export class LineTimestampBuffer {
    private pending = ''

    push (chunk: string, enabled: boolean): string {
        if (!enabled) {
            return chunk
        }
        const data = this.pending + chunk
        const lines = data.split('\n')
        this.pending = lines.pop() as string
        if (lines.length === 0) {
            return ''
        }
        return lines.map(line => {
            const body = line.replace(/\r$/, '')
            const cr = line.endsWith('\r') ? '\r' : ''
            return `${formatTimestampMs()} ${body}${cr}`
        }).join('\n') + '\n'
    }

    /** 会话结束时冲刷未完成行 */
    flush (enabled: boolean): string {
        if (!enabled || !this.pending) {
            const left = this.pending
            this.pending = ''
            return left
        }
        const body = this.pending.replace(/\r$/, '')
        this.pending = ''
        if (!body) {
            return ''
        }
        return `${formatTimestampMs()} ${body}\n`
    }
}

export function sanitizeFilename (name: string): string {
    return name
        .replace(/[/?<>\\:*|"]/g, '_')
        .replace(/[\x00-\x1f\x80-\x9f]/g, '')
        .replace(/^\.+/, '_')
        .replace(/[. ]+$/g, '')
        .slice(0, 200) || 'session'
}

export interface FilenameContext {
    title?: string
    profileName?: string
    host?: string
    now?: Date
}

/** 按 CRT 风格模板展开文件名 */
export function expandFilenamePattern (pattern: string, ctx: FilenameContext): string {
    const d = ctx.now || new Date()
    const pad = (n: number, w = 2) => String(n).padStart(w, '0')
    const vars: Record<string, string> = {
        Y: String(d.getFullYear()),
        M: pad(d.getMonth() + 1),
        D: pad(d.getDate()),
        h: pad(d.getHours()),
        m: pad(d.getMinutes()),
        s: pad(d.getSeconds()),
        S: sanitizeFilename(ctx.title || 'Untitled'),
        P: sanitizeFilename(ctx.profileName || ctx.title || 'profile'),
        H: sanitizeFilename(ctx.host || 'host'),
    }

    let out = ''
    for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] === '%' && i + 1 < pattern.length) {
            const key = pattern[i + 1]
            if (key === '%') {
                out += '%'
                i++
                continue
            }
            if (Object.prototype.hasOwnProperty.call(vars, key)) {
                out += vars[key]
                i++
                continue
            }
        }
        out += pattern[i]
    }
    return sanitizeFilename(out)
}
