import {Widget, Inject} from 'interstellar-core';
import BigNumber from 'bignumber.js';
import _ from 'lodash';

@Widget('balance', 'BalanceWidgetController', 'interstellar-basic-client/balance-widget')
@Inject("$scope", "interstellar-sessions.Sessions", "interstellar-network.Server")
export default class BalanceWidgetController {
  constructor($scope, Sessions, Server) {
    if (!Sessions.hasDefault()) {
      console.error('No session. This widget should be used with active session.');
      return;
    }

    this.$scope = $scope;
    let session = Sessions.default;
    this.address = session.getAddress();
    this.balanceLoaded = false;

    Server.accounts()
      .address(this.address)
      .stream({
        onmessage: account => this.onBalanceChange.call(this, account.balances)
      });
  }

  onBalanceChange(balances) {
    let balance;
    if (_.isArray(balances) && balances.length > 0) {
      let nativeBalance = _(balances).find(balance => balance.asset_type === 'native');
      if (nativeBalance) {
        balance = nativeBalance.balance;
      } else {
        balance = 0;
      }
    } else {
      balance = 0;
    }
    this.balance = new BigNumber(balance).toFormat();
    this.balanceLoaded = true;
    this.$scope.$apply();
  }
}
