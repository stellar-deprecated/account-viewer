import {Intent} from "interstellar-core";
import {Controller, Inject} from "interstellar-core";
import {isArray, sortBy} from "lodash";

@Controller("HeaderController")
@Inject("$scope", "interstellar-core.IntentBroadcast", "interstellar-network.AccountObservable", "interstellar-sessions.Sessions", "interstellar-network.Server")
export default class HeaderController {
  constructor($scope, IntentBroadcast, AccountObservable, Sessions, Server) {
    this.$scope = $scope;
    this.IntentBroadcast = IntentBroadcast;
    this.Server = Server;

    if (Sessions.hasDefault()) {
      let session = Sessions.default;
      this.username = session.getUsername();
      this.address = session.getAddress();
      AccountObservable.getBalances(this.address)
        .then(balances => this.onBalanceChange.call(this, balances));
      AccountObservable.registerBalanceChangeListener(this.address, balances => this.onBalanceChange.call(this, balances));
    }
  }

  onBalanceChange(balances) {
    if (isArray(balances) && balances.length > 0) {
      this.balances = sortBy(balances, balance => balance.currency_type !== 'native');
      this.balances[0].balance = Math.floor(this.balances[0].balance/1000000);
      this.balances[0].currency_code = 'XLM';
      this.balanceXLM = this.balances[0].balance;
    } else {
      this.balances = [{balance: 0, currency_code: 'XLM'}];
      this.balanceXLM = 0;
    }
    this.$scope.$apply();
  }

  logout() {
    this.IntentBroadcast.sendBroadcast(new Intent(Intent.TYPES.LOGOUT));
  }
}
