import {Inject, Service} from 'interstellar-core'
import {Server as LibServer} from 'stellar-sdk';

@Service('Server')
@Inject('interstellar-core.Config')
export default class Server {
  constructor(Config) {
    return new LibServer(Config.get('modules.interstellar-network.horizon'));
  }
}
