import { Component } from '@angular/core'
import { ConfigService } from 'tabby-core'
import { ElectronHostWindow, ElectronService } from 'tabby-electron'
import { DEFAULT_FILENAME_PATTERN } from './configProvider'

/** 会话日志设置页 UI */
@Component({
    template: `
<h3>会话日志</h3>
<p class="text-muted">CRT 风格会话录制: 自定义文件名、写失败提示、行首毫秒时间戳。</p>

<div class="form-line">
  <div class="header">
    <div class="title">自动保存新标签输出</div>
    <div class="description">将会话完整输出写入目录</div>
  </div>
  <select class="form-control" [(ngModel)]="config.store.sessionLog.autoSave" (ngModelChange)="save()">
    <option ngValue="on">全部开启</option>
    <option ngValue="ssh">仅 SSH</option>
    <option ngValue="off">关闭</option>
  </select>
</div>

<div class="form-line" *ngIf="config.store.sessionLog.autoSave !== 'off'">
  <div class="header">
    <div class="title">日志目录</div>
    <div class="description">日志文件存放路径</div>
  </div>
  <div class="input-group">
    <input class="form-control" type="text" placeholder="Home directory"
           [(ngModel)]="config.store.sessionLog.directory" (ngModelChange)="save()">
    <div class="input-group-append">
      <button class="btn btn-secondary" type="button" (click)="pickDirectory()">
        <i class="fas fa-folder-open"></i>
      </button>
    </div>
  </div>
</div>

<div class="form-line" *ngIf="config.store.sessionLog.autoSave !== 'off'">
  <div class="header">
    <div class="title">文件名模板</div>
    <div class="description">
      CRT 风格变量: %Y%M%D 年月日, %h%m%s 时分秒, %S 会话标题, %P profile, %H 主机, %% 百分号.
      示例: {{ defaultPattern }}
    </div>
  </div>
  <input class="form-control" type="text"
         [(ngModel)]="config.store.sessionLog.filenamePattern" (ngModelChange)="save()"
         [placeholder]="defaultPattern">
</div>

<div class="form-line" *ngIf="config.store.sessionLog.autoSave !== 'off'">
  <div class="header">
    <div class="title">同名文件</div>
    <div class="description">追加到已有文件, 或覆盖</div>
  </div>
  <select class="form-control" [(ngModel)]="appendMode" (ngModelChange)="onAppendChange($event)">
    <option [ngValue]="true">追加</option>
    <option [ngValue]="false">覆盖</option>
  </select>
</div>

<div class="form-line" *ngIf="config.store.sessionLog.autoSave !== 'off'">
  <div class="header">
    <div class="title">剥离控制字符</div>
    <div class="description">去掉 ANSI/OSC (窗口标题等), 生成可读纯文本</div>
  </div>
  <div class="checkbox">
    <label>
      <input type="checkbox" [(ngModel)]="config.store.sessionLog.stripControls" (ngModelChange)="save()">
      启用
    </label>
  </div>
</div>

<div class="form-line" *ngIf="config.store.sessionLog.autoSave !== 'off'">
  <div class="header">
    <div class="title">行首时间戳</div>
    <div class="description">每行前添加本地时间, 精确到毫秒, 格式 YYYY-MM-DD HH:mm:ss.SSS</div>
  </div>
  <div class="checkbox">
    <label>
      <input type="checkbox" [(ngModel)]="config.store.sessionLog.lineTimestamp" (ngModelChange)="save()">
      启用
    </label>
  </div>
</div>
`,
})
export class SessionLogSettingsTabComponent {
    defaultPattern = DEFAULT_FILENAME_PATTERN

    constructor (
        public config: ConfigService,
        private electron: ElectronService,
        private hostWindow: ElectronHostWindow,
    ) {
        this.ensureStore()
    }

    get appendMode (): boolean {
        return this.config.store.sessionLog?.append !== false
    }

    set appendMode (_v: boolean) {
        // handled by onAppendChange
    }

    onAppendChange (v: boolean): void {
        this.ensureStore()
        this.config.store.sessionLog.append = !!v
        this.save()
    }

    async pickDirectory (): Promise<void> {
        this.ensureStore()
        const result = await this.electron.dialog.showOpenDialog(
            this.hostWindow.getWindow(),
            { properties: ['openDirectory', 'showHiddenFiles', 'createDirectory'] },
        )
        const paths = result?.filePaths || []
        if (paths[0]) {
            this.config.store.sessionLog.directory = paths[0]
            await this.save()
        }
    }

    async save (): Promise<void> {
        this.ensureStore()
        await this.config.save()
    }

    private ensureStore (): void {
        if (!this.config.store.sessionLog) {
            this.config.store.sessionLog = {
                autoSave: 'ssh',
                directory: this.config.store.saveOutput?.autoSaveDirectory || null,
                filenamePattern: DEFAULT_FILENAME_PATTERN,
                append: true,
                stripControls: true,
                lineTimestamp: true,
            }
        }
        if (this.config.store.sessionLog.lineTimestamp === undefined) {
            this.config.store.sessionLog.lineTimestamp = true
        }
        if (!this.config.store.sessionLog.filenamePattern) {
            this.config.store.sessionLog.filenamePattern = DEFAULT_FILENAME_PATTERN
        }
    }
}
