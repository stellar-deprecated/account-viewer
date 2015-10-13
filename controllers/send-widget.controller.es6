import _ from 'lodash';
import BigNumber from 'bignumber.js';
import {Widget, Inject, Intent} from 'interstellar-core';
import {Alert, AlertGroup} from 'interstellar-ui-messages';
import {Account, Asset, Keypair, Operation, TransactionBuilder} from 'stellar-base';
import BasicClientError from '../errors';

@Widget('send', 'SendWidgetController', 'interstellar-basic-client/send-widget')
@Inject("$scope", '$sce', "interstellar-sessions.Sessions", "interstellar-network.Server", "interstellar-ui-messages.Alerts")
export default class SendWidgetController {
  constructor($scope, $sce, Sessions, Server, Alerts) {
    if (!Sessions.hasDefault()) {
      console.error('No session');
      return;
    }

    this.view = 'sendSetup';
    this.$scope = $scope;
    this.Server = Server;
    this.Sessions = Sessions;
    this.session = Sessions.default;
    this.rocketImage = require('../images/sending.gif');

    this.addressAlertGroup = new AlertGroup();
    this.addressAlertGroup.registerUpdateListener(alerts => {
      this.addressAlerts = alerts;
    });
    Alerts.registerGroup(this.addressAlertGroup);

    this.amountAlertGroup = new AlertGroup();
    this.amountAlertGroup.registerUpdateListener(alerts => {
      // Some amount alert messages contain HTML
      for (let alert of alerts) {
        alert._text = $sce.trustAsHtml(alert._text)
      }
      this.amountAlerts = alerts;
    });
    Alerts.registerGroup(this.amountAlertGroup);
  }

  showView(v) {
    this.view = v;
  }

  send() {
    this.sending = true;
    this.addressAlertGroup.clear();
    this.amountAlertGroup.clear();

    if (!Account.isValidAddress(this.destinationAddress)) {
      let alert = new Alert({
        title: 'Invalid address.',
        text: 'Addresses on the new network are uppercase and begin with the letter "G".',
        type: Alert.TYPES.ERROR
      });
      this.addressAlertGroup.show(alert);
    }

    if (this.destinationAddress === this.session.address) {
      let alert = new Alert({
        title: 'Invalid address.',
        text: "You can't send to yourself.",
        type: Alert.TYPES.ERROR
      });
      this.addressAlertGroup.show(alert);
    }

    // Check if amount is valid
    if (!Operation.isValidAmount(this.amount)) {
      let alert = new Alert({
        title: 'Invalid amount.',
        text: 'This amount is invalid.',
        type: Alert.TYPES.ERROR
      });
      this.amountAlertGroup.show(alert);
    }

    if (this.addressAlerts.length || this.amountAlerts.length) {
      this.sending = false;
      return;
    }

    return this.Server.accounts()
      .address(this.session.address)
      .call()
      .then(account => {
        // Check if sending this transaction would make balance go below minimum balance
        let minimumBalance = 20 + (account.subentry_count) * 10;
        let nativeBalance = _(account.balances).find(balance => balance.asset_type === 'native').balance;
        let maxSend = new BigNumber(nativeBalance).minus(minimumBalance);
        if (maxSend.lt(this.amount)) {
          throw new BasicClientError('InsufficientBalanceError', {maxSend});
        }
      })
      .then(() => {
        // Check if destination account exists. If no, at least 20 XLM must be sent.
        if (new BigNumber(this.amount).gte(20)) {
          return;
        }

        return this.Server.accounts()
          .address(this.destinationAddress)
          .call()
          .catch(err => {
            if (err.name === 'NotFoundError') {
              throw new BasicClientError('DestinationAccountNotExistError');
            }
          });
      })
      .then(() => this.showView('sendConfirm'))
      .catch(err => {
        let alert;
        switch (err.name) {
          case 'NotFoundError':
            alert = new Alert({
              title: 'Account not funded.',
              text: 'Your account is not funded.',
              type: Alert.TYPES.ERROR
            });
            break;
          case 'InsufficientBalanceError':
            alert = new Alert({
              title: 'Insufficient balance.',
              text:
                `Sending this transaction will cause you to go below your
                 <a href="https://www.stellar.org/developers/learn/concepts/fees.html#minimum-balance" target="_blank">minimum balance</a>.
                 The most you can currently send is ${err.data.maxSend}.`,
              type: Alert.TYPES.ERROR
            });
            break;
          case 'DestinationAccountNotExistError':
            alert = new Alert({
              title: 'Destination account does not exist.',
              text: 'You account need to send at least 20 XLM to create an account.',
              type: Alert.TYPES.ERROR
            });
            break;
          default:
            alert = new Alert({
              title: 'Unknown error.',
              text: '',
              type: Alert.TYPES.ERROR
            });
            break;
        }
        this.amountAlertGroup.show(alert);
      })
      .finally(() => {
        this.sending = false;
        this.$scope.$apply();
      });
  }

  confirm() {
    this.showView('sendWaiting');
    return this.Server.accounts()
      .address(this.destinationAddress)
      .call()
      .then(() => {
        // Account exist. Send payment operation.
        let operation = Operation.payment({
          destination: this.destinationAddress,
          asset: Asset.native(),
          amount: this.amount
        });
        return this._submitTransaction(operation);
      })
      .catch(err => {
        if (err.name === 'NotFoundError') {
          // Account does not exist. Send create_account operation.
          let operation = Operation.createAccount({
            destination: this.destinationAddress,
            startingBalance: this.amount
          });
          return this._submitTransaction(operation);
        } else {
          throw err;
        }
      });
  }

  _submitTransaction(operation) {
    return this.Sessions.loadDefaultAccount()
      .then(() => {
        let transaction = new TransactionBuilder(this.session.getAccount())
          .addOperation(operation)
          .addSigner(Keypair.fromSeed(this.session.getSecret()))
          .build();

        return this.Server.submitTransaction(transaction);
      })
      .then(() => {
        this.success = true;
        this.destinationAddress = null;
        this.amount = null;
      })
      .catch(e => {
        this.success = false;
        this.horizonResponse = JSON.stringify(e, null, '  ');
      })
      .finally(() => {
        this.showView('sendOutcome');
        this.$scope.$apply()
      });
  }
}
