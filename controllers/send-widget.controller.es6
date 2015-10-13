import {Widget, Inject, Intent} from 'interstellar-core';
import {Alert, AlertGroup} from 'interstellar-ui-messages';
import {Account, Asset, Keypair, Operation, TransactionBuilder} from 'stellar-base';

@Widget('send', 'SendWidgetController', 'interstellar-basic-client/send-widget')
@Inject("$scope", "interstellar-sessions.Sessions", "interstellar-network.Server", "interstellar-ui-messages.Alerts")
export default class SendWidgetController {
  constructor($scope, Sessions, Server, Alerts) {
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

    this.Sessions.loadDefaultAccount()
      .then(() => {
        if (!this.session.getAccount()) {
          let alert = new Alert({
            title: 'Account not funded.',
            text: 'You account is not funded.',
            type: Alert.TYPES.ERROR
          });
          this.amomuntAlertGroup.show(alert);
          return;
        }
        // TODO check balance
        this.showView('sendConfirm');
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
          // Account exist does not exist. Send create_account operation.
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
    let transaction = new TransactionBuilder(this.session.getAccount())
      .addOperation(operation)
      .addSigner(Keypair.fromSeed(this.session.getSecret()))
      .build();

    return this.Server.submitTransaction(transaction)
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
