import {Widget, Inject} from 'interstellar-core';
import _ from 'lodash';

@Widget('balance', 'BalanceWidgetController', 'interstellar-basic-client/balance-widget')
@Inject("$scope", "interstellar-sessions.Sessions", "interstellar-network.AccountObservable", "interstellar-network.Server")
export default class BalanceWidgetController {
  constructor($scope, Sessions, AccountObservable, Server) {
    if (!Sessions.hasDefault()) {
      console.error('No session. This widget should be used with active session.');
      return;
    }

    this.$scope = $scope;
    this.Server = Server;

    let session = Sessions.default;
    this.address = session.getAddress();
    this.balanceLoaded = false;
    AccountObservable.getBalances(this.address)
      .then(balances => this.onBalanceChange.call(this, balances));
    AccountObservable.registerBalanceChangeListener(this.address, balances => this.onBalanceChange.call(this, balances));
  }

  onBalanceChange(balances) {
    if (_.isArray(balances) && balances.length > 0) {
      let nativeBalance = _(balances).find(balance => balance.asset_type === 'native');
      if (nativeBalance) {
        this.balance = nativeBalance.balance;
      } else {
        this.balance = 0;
      }
    } else {
      this.balance = 0;
    }
    this.balanceLoaded = true;
    this.$scope.$apply();
  }
}
