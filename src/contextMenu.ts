import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { Injectable } from '@angular/core'
import { ToastrService } from 'ngx-toastr'
import { ConfigService, MenuItemOptions } from 'tabby-core'
import { ElectronService, ElectronHostWindow } from 'tabby-electron'
import { BaseTerminalTabComponent, TerminalContextMenuItemProvider } from 'tabby-terminal'
import { SessionLogConfig, DEFAULT_FILENAME_PATTERN } from './configProvider'
import { cleanupOutput, expandFilenamePattern, LineTimestampBuffer } from './util'

/** 右键菜单: 手动开始录制到指定文件 */
@Injectable()
export class SessionLogContextMenu extends TerminalContextMenuItemProvider {
    weight = 1

    constructor (
        private toastr: ToastrService,
        private electron: ElectronService,
        private hostWindow: ElectronHostWindow,
        private config: ConfigService,
    ) {
        super()
    }

    private cfg (): SessionLogConfig {
        return this.config.store.sessionLog || {}
    }

    async getItems (tab: BaseTerminalTabComponent): Promise<MenuItemOptions[]> {
        return [{
            label: 'Start session log...',
            click: () => {
                setTimeout(() => this.start(tab))
            },
        }]
    }

    start (tab: BaseTerminalTabComponent): void {
        if ((tab as any)._sessionLogManual) {
            return
        }

        const c = this.cfg()
        const suggested = expandFilenamePattern(
            c.filenamePattern || DEFAULT_FILENAME_PATTERN,
            {
                title: (tab as any).customTitle || tab.title || 'Untitled',
                profileName: (tab as any).profile?.name,
                host: (tab as any).profile?.options?.host,
            },
        )
        const defaultDir = c.directory || os.homedir()
        let filePath: string
        try {
            filePath = this.electron.dialog.showSaveDialogSync(
                this.hostWindow.getWindow(),
                { defaultPath: path.join(defaultDir, suggested) },
            )
        } catch (err: any) {
            this.toastr.error(`Save dialog failed: ${err?.message || err}`, 'Session Log')
            return
        }
        if (!filePath) {
            return
        }

        let stream: fs.WriteStream
        try {
            fs.mkdirSync(path.dirname(filePath), { recursive: true })
            stream = fs.createWriteStream(filePath, {
                flags: c.append !== false ? 'a' : 'w',
                encoding: 'utf8',
            })
        } catch (err: any) {
            this.toastr.error(`Session log open failed: ${err?.message || err}`, 'Session Log')
            return
        }

        stream.on('error', err => {
            this.toastr.error(`Session log write failed: ${err?.message || err}`, 'Session Log')
        })

        const strip = c.stripControls !== false
        const withTs = c.lineTimestamp !== false
        const lineBuf = new LineTimestampBuffer()
        const sub = tab.output$.subscribe(data => {
            try {
                let text = cleanupOutput(String(data), strip)
                text = lineBuf.push(text, withTs)
                if (text) {
                    stream.write(text, 'utf8')
                }
            } catch (err: any) {
                this.toastr.error(`Session log write failed: ${err?.message || err}`, 'Session Log')
            }
        })

        ;(tab as any)._sessionLogManual = true

        const ui = document.createElement('div')
        ui.style.cssText = 'position:absolute;right:20px;top:20px;z-index:5;background:rgba(0,0,0,.8);padding:5px 10px;border-radius:3px;display:inline-flex;align-items:center;gap:8px;color:#fff;font-size:12px;'
        ui.innerHTML = '<span>Recording session log</span><button type="button" style="margin-left:8px">Stop</button>'
        const content = tab.element.nativeElement.querySelector('.content')
        content?.appendChild(ui)

        ui.querySelector('button')?.addEventListener('click', () => {
            ;(tab as any)._sessionLogManual = false
            const rest = lineBuf.flush(withTs)
            if (rest) {
                try {
                    stream.write(rest, 'utf8')
                } catch { /* ignore */ }
            }
            sub.unsubscribe()
            stream.end()
            ui.remove()
            this.toastr.info('Session log saved', 'Session Log')
        })
    }
}
