import {Widget, Inject} from 'interstellar-core';
import BigNumber from 'bignumber.js';
import _ from 'lodash';

@Widget('balance', 'BalanceWidgetController', 'interstellar-basic-client/balance-widget')
@Inject("$scope", "$rootScope", "interstellar-sessions.Sessions", "interstellar-network.Server")
export default class BalanceWidgetController {
  constructor($scope, $root$Scope, Sessions, Server) {
    if (!Sessions.hasDefault()) {
      console.error('No session. This widget should be used with active session.');
      return;
    }

    this.$scope = $scope;
    this.$rootScope = $root$Scope;
    this.Server = Server;
    let session = Sessions.default;
    this.address = session.getAddress();
    this.balanceLoaded = false;
    this.showRefreshButton = false;

    Server.accounts()
      .accountId(this.address)
      .stream({
        onmessage: account => this.onBalanceChange.call(this, account.balances),
        onerror: error => {
          this.onStreamError.call(this, error)
        }
      });
  }

  onStreamError(error) {
    if (error === 'EventSource not supported') {
      this.showRefreshButton = true;
      this.loadAccount();
      this.$rootScope.$on('account-viewer.transaction-success', () => {
        this.loadAccount();
      });
    }
  }

  loadAccount() {
    return this.Server.accounts()
      .accountId(this.address)
      .call()
      .then(account => this.onBalanceChange.call(this, account.balances))
      .catch(e => {
        if (e.name === 'NotFoundError') {
          this.onBalanceChange.call(this, null);
        } else {
          throw e;
        }
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
