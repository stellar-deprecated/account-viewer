import {Intent} from "interstellar-core";
import {Controller, Inject} from "interstellar-core";
import {isArray, sortBy} from "lodash";

@Controller("HeaderController")
@Inject("interstellar-core.IntentBroadcast")
export default class HeaderController {
  constructor(IntentBroadcast) {
    this.IntentBroadcast = IntentBroadcast;
  }

  logout() {
    this.IntentBroadcast.sendBroadcast(new Intent(Intent.TYPES.LOGOUT));
  }
}
