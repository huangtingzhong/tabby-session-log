import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { Injectable } from '@angular/core'
import { ToastrService } from 'ngx-toastr'
import { ConfigService } from 'tabby-core'
import { TerminalDecorator, BaseTerminalTabComponent, BaseSession } from 'tabby-terminal'
import { SSHTabComponent } from 'tabby-ssh'
import { SessionLogConfig, DEFAULT_FILENAME_PATTERN } from './configProvider'
import { cleanupOutput, expandFilenamePattern, LineTimestampBuffer } from './util'

/** 自动将会话输出写入日志文件 */
@Injectable()
export class SessionLogDecorator extends TerminalDecorator {
    constructor (
        private config: ConfigService,
        private toastr: ToastrService,
    ) {
        super()
    }

    private cfg (): SessionLogConfig {
        const c = this.config.store.sessionLog || {}
        const legacyDir = this.config.store.saveOutput?.autoSaveDirectory
        return {
            autoSave: c.autoSave ?? 'ssh',
            directory: c.directory ?? legacyDir ?? null,
            filenamePattern: c.filenamePattern || DEFAULT_FILENAME_PATTERN,
            append: c.append !== false,
            stripControls: c.stripControls !== false,
            lineTimestamp: c.lineTimestamp !== false,
        }
    }

    attach (tab: BaseTerminalTabComponent): void {
        const mode = this.cfg().autoSave
        if (mode === 'off') {
            return
        }
        if (mode === 'ssh' && !(tab instanceof SSHTabComponent)) {
            return
        }

        if ((tab as any).sessionChanged$) {
            ;(tab as any).sessionChanged$.subscribe((session: BaseSession | null) => {
                if (session) {
                    this.attachToSession(session, tab)
                }
            })
        }
        if (tab.session) {
            this.attachToSession(tab.session as BaseSession, tab)
        }
    }

    private attachToSession (session: BaseSession, tab: BaseTerminalTabComponent): void {
        if ((session as any)._sessionLogAttached) {
            return
        }
        ;(session as any)._sessionLogAttached = true

        let outputPath = this.buildPath(tab)
        let stream: fs.WriteStream
        try {
            this.ensureDir(path.dirname(outputPath))
            stream = fs.createWriteStream(outputPath, {
                flags: this.cfg().append ? 'a' : 'w',
                encoding: 'utf8',
            })
        } catch (err: any) {
            this.toastError(`Session log open failed: ${err?.message || err}`)
            return
        }

        stream.on('error', (err) => {
            this.toastError(`Session log write failed: ${err?.message || err}`)
        })

        let dataLength = 0
        const strip = this.cfg().stripControls !== false
        const withTs = this.cfg().lineTimestamp !== false
        const lineBuf = new LineTimestampBuffer()

        setTimeout(() => {
            const next = this.buildPath(tab)
            if (next === outputPath) {
                return
            }
            try {
                stream.close()
                fs.renameSync(outputPath, next)
                outputPath = next
                stream = fs.createWriteStream(outputPath, {
                    flags: this.cfg().append ? 'a' : 'w',
                    encoding: 'utf8',
                })
                stream.on('error', (err) => {
                    this.toastError(`Session log write failed: ${err?.message || err}`)
                })
            } catch {
                try {
                    stream = fs.createWriteStream(outputPath, {
                        flags: 'a',
                        encoding: 'utf8',
                    })
                } catch (err: any) {
                    this.toastError(`Session log reopen failed: ${err?.message || err}`)
                }
            }
        }, 3000)

        session.output$.subscribe(data => {
            try {
                let text = cleanupOutput(String(data), strip)
                text = lineBuf.push(text, withTs)
                if (!text) {
                    return
                }
                dataLength += text.length
                if (!stream.destroyed) {
                    stream.write(text, 'utf8')
                }
            } catch (err: any) {
                this.toastError(`Session log write failed: ${err?.message || err}`)
            }
        })

        session.destroyed$.subscribe(() => {
            try {
                const rest = lineBuf.flush(withTs)
                if (rest && !stream.destroyed) {
                    stream.write(rest, 'utf8')
                    dataLength += rest.length
                }
                stream.end()
                if (!dataLength) {
                    fs.unlink(outputPath, () => null)
                }
            } catch {
                // ignore
            }
        })
    }

    private buildPath (tab: BaseTerminalTabComponent): string {
        const c = this.cfg()
        const dir = c.directory || os.homedir()
        const profile = (tab as any).profile
        const title = (tab as any).customTitle || tab.title || 'Untitled'
        const profileName = profile?.name || title
        let host = ''
        const opts = profile?.options
        if (opts?.host) {
            host = String(opts.host)
        } else if (typeof title === 'string' && title.includes('@')) {
            host = title.split('@').pop() || ''
        }
        const name = expandFilenamePattern(c.filenamePattern || DEFAULT_FILENAME_PATTERN, {
            title,
            profileName,
            host,
        })
        return path.join(dir, name)
    }

    private ensureDir (dir: string): void {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
    }

    private toastError (msg: string): void {
        try {
            this.toastr.error(msg, 'Session Log')
        } catch {
            console.error('[tabby-session-log]', msg)
        }
    }
}
