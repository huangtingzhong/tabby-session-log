import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'tabby-settings'
import { SessionLogSettingsTabComponent } from './settingsTab.component'

/** 设置页: 会话日志 */
@Injectable()
export class SessionLogSettingsTabProvider extends SettingsTabProvider {
    id = 'session-log'
    icon = 'download'
    title = '会话日志'

    getComponentType (): any {
        return SessionLogSettingsTabComponent
    }
}
