import {Component, OnInit} from '@angular/core';
import {ConfigService} from "./service/config.service";
import {Router} from "@angular/router";
import {AppType, ConfigState, DidDetails} from '../../server-old/system'

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss']
})
export class ConfigComponent implements OnInit {
  get appTypes() {
    return AppType
  }
  get states() {
    return ConfigState
  }

  private _state:  ConfigState | undefined
  get state() { return this._state }

  appType: AppType = AppType.USER
  tailsServerUrl = ''
  index = 0
  appPort = 0
  masterServerDID = ''
  label = ''

  private _ariesTerminalCommand = ''
  get ariesTerminalCommand() {
    return this._ariesTerminalCommand
  }

  private did_details: DidDetails|undefined
  get publicDID() {
    return this.did_details?.did || ''
  }
  get publicDIDVerkey() {
    return this.did_details?.verkey || ''
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly router: Router
  ) { }

  ngOnInit(): void {
    this.refresh()
  }

  refresh() {
    this.configService.getConfigState().subscribe(state => {
      this._state = state
      switch (state) {
        case ConfigState.ARIES_NOT_CONNECTED:
          this.getAriesTerminalCommand()
          break
        case ConfigState.PUBLIC_DID_NOT_REGISTERED:
          this.generatePublicDID()
          break
        case ConfigState.COMPLETE:
          this.router.navigateByUrl('/').then()
      }
    })
  }

  submitInitialConfig() {
    this.configService.uploadInitialConfig(this.appType, this.tailsServerUrl, this.index, this.appPort, this.masterServerDID, this.label)
      .subscribe(() => this.refresh())
  }

  private getAriesTerminalCommand() {
    this.configService.getAriesTerminalCommand().subscribe(command => this._ariesTerminalCommand = command)
  }

  ariesIsRunning() {
    this.configService.ariesIsRunning().subscribe(() => this.refresh())
  }

  private generatePublicDID() {
    this.configService.generatePublicDID().subscribe(details => {
      this.did_details = details
    })
  }

  submitPublicDID() {
    this.configService.submitPublicDID(this.publicDID).subscribe(() => this.refresh())
  }
}
