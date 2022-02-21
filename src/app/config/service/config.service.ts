import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {map} from "rxjs/operators";
import {
  AppType,
  ConfigState,
  InitialisationData,
  AriesCommandData
} from '../../../server/config'

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

  uploadInitialConfig(
    {
      tailsServerUrl,
      index,
      appPort
    }: {
      tailsServerUrl: string,
      index: number,
      appPort: number
    })
  {
    const data: AriesCommandData = {
      tailsServerUrl,
      inboundPort: 8000 + index,
      walletKey: 'walletKey' + index.toString(),
      walletName: 'wallet' + index.toString(),
      genesisUrl: 'http://host.docker.internal:9000/genesis',
      adminPort: 10000 + index,
      advertisedEndpoint: 'http://host.docker.internal:800' + index.toString(),
      webhookURL: `http://host.docker.internal:` + appPort.toString() + '/webhook'
    }
    return this.httpClient.post<{state: ConfigState}>('/api/config/initialConfig', data)
  }

  getAriesTerminalCommand() {
    return this.httpClient.get<{ command: string }>('/api/config/aries/command').pipe(
      map(res => res.command)
    )
  }

  connectToAries(url: string) {
    return this.httpClient.post('/api/config/aries/connect', {url}, {responseType: 'text'})
  }

  createPublicDID() {
    return this.httpClient.post<{did: string, verkey: string}>('/api/config/publicDID/generate', {})
  }

  submitPublicDID(did: string) {
    return this.httpClient.post('/api/config/publicDID/set', {did}, {responseType: 'text'})
  }

  initialise(data: InitialisationData) {
    return this.httpClient.post('/api/config/initialise', data, {responseType: 'text'})
  }
}
