import {Inject, Service} from 'interstellar-core'
import {Server as LibServer, Network} from 'stellar-sdk';

@Service('Server')
@Inject('interstellar-core.Config')
export default class Server {
  constructor(Config) {
    Network.use(new Network(Config.get('modules.interstellar-network.networkPassphrase')));
    return new LibServer(Config.get('modules.interstellar-network.horizon'));
  }
}
