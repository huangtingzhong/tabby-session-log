import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import TabbyCoreModule, { ConfigProvider } from 'tabby-core'
import { TerminalContextMenuItemProvider, TerminalDecorator } from 'tabby-terminal'
import { SettingsTabProvider } from 'tabby-settings'

import { SessionLogConfigProvider } from './configProvider'
import { SessionLogContextMenu } from './contextMenu'
import { SessionLogDecorator } from './decorator'
import { SessionLogSettingsTabProvider } from './settings'
import { SessionLogSettingsTabComponent } from './settingsTab.component'

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TabbyCoreModule,
    ],
    providers: [
        { provide: ConfigProvider, useClass: SessionLogConfigProvider, multi: true },
        { provide: SettingsTabProvider, useClass: SessionLogSettingsTabProvider, multi: true },
        { provide: TerminalContextMenuItemProvider, useClass: SessionLogContextMenu, multi: true },
        { provide: TerminalDecorator, useClass: SessionLogDecorator, multi: true },
    ],
    declarations: [
        SessionLogSettingsTabComponent,
    ],
})
export default class SessionLogModule {
    constructor () {
        // eslint-disable-next-line no-console
        console.info('[tabby-session-log] module loaded')
    }
}
