import {Widget, Inject} from 'interstellar-core';
import BigNumber from 'bignumber.js';
import _ from 'lodash';
import LedgerTransport from '@ledgerhq/hw-transport-u2f';
import LedgerStr from '@ledgerhq/hw-app-str';

@Widget('balance', 'BalanceWidgetController', 'interstellar-basic-client/balance-widget')
@Inject("$scope", "$rootScope", "$http", "interstellar-core.Config", "interstellar-sessions.Sessions", "interstellar-network.Server")
export default class BalanceWidgetController {
  constructor($scope, $rootScope, $http, Config, Sessions, Server) {
    if (!Sessions.hasDefault()) {
      console.error('No session. This widget should be used with active session.');
      return;
    }

    this.$scope = $scope;
    this.$rootScope = $rootScope;
    this.Server = Server;
    let session = Sessions.default;
    this.address = session.getAddress();
    this.balanceLoaded = false;
    this.showRefreshButton = false;
    this.accountNotFound = false;

    if (session.data && session.data['useLedger'] && session.data['ledgerAppVersion']) {
      let ledgerAppMajorVersion = Number(session.data['ledgerAppVersion'].substring(0, session.data['ledgerAppVersion'].indexOf('.')));
      this.checkAddressAvailable =  ledgerAppMajorVersion > 1;
    }
    this.bip32Path = session.data && session.data['bip32Path'];
    this.monitorImage = require('../images/monitor.png');

    this.$rootScope.$on('account-viewer.transaction-success', () => {
      this.invite = null;
    });

    Server.accounts()
      .accountId(this.address)
      .stream({
        onmessage: account => this.onBalanceChange.call(this, account.balances),
        onerror: error => {
          this.onStreamError.call(this, error)
        }
      });

    Server.operations()
      .forAccount(this.address)
      .call()
      .then(operations => {
        // Merged_back = 2ops: create_account, account_merge
        if (operations.records.length <= 2) {
          $http({
            method: 'GET',
            url: Config.get("inviteServer")+'/account-viewer/check?id='+this.address
          }).then(response => {
            this.invite = response.data;

            if (this.invite.state == "queued") {
              // Not `merged_back` and operations.records.length > 1 = transaction sent
              if (operations.records.length > 1) {
                this.invite = null;
                return;
              }

              var claimedAt = new Date(this.invite.claimed_at);
              var days = 7-Math.floor((new Date() - claimedAt) / (1000*60*60*24));
              var daysString;
              if (days <= 0) {
                 daysString = "less than a day";
              } else if (days == 1) {
                daysString = "1 day";
              } else {
                daysString = days+" days";
              }
              this.invite.days = daysString;
            }
          }, response => {});
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
    } else {
      this.loadAccount();
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
    if (balances === null) {
        this.accountNotFound = true;
    } else {
        this.accountNotFound = false;
    }

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

  checkAddress() {
    try {
      LedgerTransport.create().then((transport) =>{
        new LedgerStr(transport).getPublicKey(this.bip32Path, false, true);
      });
    } catch (err) {
      console.log('error checking address');
      console.log(err);
    }
  }
}
