import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {
  AppType,
  InitialConfig,
  ConfigState,
  DidDetails
} from '../../../server-old/system'
import {map} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor(
    private readonly httpClient: HttpClient
  ) { }

  getConfigState() {
    return this.httpClient.get<{ state: ConfigState }>('/api/config/state').pipe(
      map(res => res.state)
    )
  }

  uploadInitialConfig(appType: AppType, tailsServerUrl: string, index: number, appPort: number, masterServerDID: string, label: string) {
    const base_config = {
      tailsServerUrl,
      inboundPort: 8000 + index,
      walletKey: 'walletKey' + index.toString(),
      walletName: 'wallet' + index.toString(),
      genesisUrl: 'http://host.docker.internal:9000/genesis',
      adminPort: 10000 + index,
      advertisedEndpoint: 'http://host.docker.internal:800' + index.toString(),
      agentAPI: 'http://0.0.0.0:1000' + index.toString(),
      webhookURL: `http://host.docker.internal:` + appPort.toString() + '/webhook'
    }
    const config: InitialConfig = appType === AppType.MASTER ?
      {...base_config, appType} :
      {...base_config, appType, masterServerDID, label}

    return this.httpClient.post('/api/config/initialise', config, {responseType: 'text'})
  }

  getAriesTerminalCommand() {
    return this.httpClient.get<{ command: string }>('/api/config/ariesAgent/terminalCommand').pipe(
      map(res => res.command)
    )
  }

  ariesIsRunning() {
    return this.httpClient.post('/api/config/ariesAgent/running', {}, {responseType: 'text'})
  }

  generatePublicDID() {
    return this.httpClient.post<DidDetails>('/api/config/publicDID/generate', {})
  }

  submitPublicDID(did: string) {
    return this.httpClient.post('/api/config/publicDID', {did}, {responseType: 'text'})
  }
}
