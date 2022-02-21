import {Component, OnInit} from '@angular/core';
import {ConfigService} from "./service/config.service";
import {Router} from "@angular/router";
import {ConfigState, AppType} from '../../server/config'

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

  private _did: string|undefined
  get did() {
    return this._did
  }

  private _verkey: string|undefined
  get verkey() {
    return this._verkey
  }

  constructor(
    private readonly configService: ConfigService
  ) { }

  ngOnInit(): void {
    this.refresh()
  }

  refresh() {
    this.configService.getConfigState().subscribe(state => {
      this._state = state
    })
  }

  submitInitialConfig() {
    this.configService.uploadInitialConfig(
      {tailsServerUrl: this.tailsServerUrl, index: this.index, appPort: this.appPort}
    ).subscribe(value => {this._state = value.state})
  }

  getAriesTerminalCommand() {
    this.configService.getAriesTerminalCommand().subscribe(command => this._ariesTerminalCommand = command)
  }

  ariesIsRunning() {
    this.configService.connectToAries('http://0.0.0.0:1000'+this.index.toString()).subscribe(() => this.refresh())
  }

  generateDID() {
    this.configService.createPublicDID().subscribe(value => {
      this._did = value.did
      this._verkey = value.verkey
    })
  }

  submitPublicDID() {
    this.configService.submitPublicDID(this.did as string).subscribe(() => this.refresh())
  }

  initialise() {
    this.configService.initialise({appType: this.appType, label: this.label, masterDID: this.masterServerDID})
      .subscribe()
  }
}
