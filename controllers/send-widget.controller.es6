import _ from 'lodash';
import BigNumber from 'bignumber.js';
import {Widget, Inject, Intent} from 'interstellar-core';
import {Alert, AlertGroup} from 'interstellar-ui-messages';
import {Account, Asset, Keypair, Memo, Operation, TransactionBuilder} from 'stellar-base';
import BasicClientError from '../errors';

@Widget('send', 'SendWidgetController', 'interstellar-basic-client/send-widget')
@Inject("$scope", "$rootScope", '$sce', "interstellar-sessions.Sessions", "interstellar-network.Server", "interstellar-ui-messages.Alerts")
export default class SendWidgetController {
  constructor($scope, $rootScope, $sce, Sessions, Server, Alerts) {
    if (!Sessions.hasDefault()) {
      console.error('No session');
      return;
    }

    this.view = 'sendSetup';
    this.$scope = $scope;
    this.$rootScope = $rootScope;
    this.Server = Server;
    this.Sessions = Sessions;
    this.session = Sessions.default;
    this.rocketImage = require('../images/sending.gif');
    this.memo = false;
    this.memoType = null;
    this.memoValue = null;

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

    this.memoAlertGroup = new AlertGroup();
    this.memoAlertGroup.registerUpdateListener(alerts => {
      this.memoAlerts = alerts;
    });
    Alerts.registerGroup(this.memoAlertGroup);
  }

  showMemo($event) {
    $event.preventDefault();
    this.memo = true;
    this.memoType = 'MEMO_TEXT';
  }

  hideMemo($event) {
    $event.preventDefault();
    this.memoAlertGroup.clear();
    this.memo = false;
    this.memoType = null;
    this.memoValue = null;
  }

  showView(v) {
    this.view = v;
  }

  send() {
    this.sending = true;
    this.addressAlertGroup.clear();
    this.amountAlertGroup.clear();
    this.memoAlertGroup.clear();

    if (!Account.isValidAddress(this.destinationAddress)) {
      let alert = new Alert({
        title: 'Invalid public key.',
        text: 'Public keys are uppercase and begin with the letter "G."',
        type: Alert.TYPES.ERROR
      });
      this.addressAlertGroup.show(alert);
    }

    if (this.destinationAddress === this.session.address) {
      let alert = new Alert({
        title: 'Can\'t send to yourself.',
        text: "Enter a different public key.",
        type: Alert.TYPES.ERROR
      });
      this.addressAlertGroup.show(alert);
    }

    // Check if amount is valid
    if (!Operation.isValidAmount(this.amount)) {
      let alert = new Alert({
        title: '',
        text: 'This amount is invalid.',
        type: Alert.TYPES.ERROR
      });
      this.amountAlertGroup.show(alert);
    }

    if (this.memo) {
      let memo, memoError;
      try {
        switch (this.memoType) {
          case 'MEMO_TEXT':
            memoError = 'MEMO_TEXT must contain a maximum of 28 characters';
            memo = Memo.text(this.memoValue);
            break;
          case 'MEMO_ID':
            memoError = 'MEMO_ID must be a valid 64 bit unsigned integer';
            memo = Memo.id(this.memoValue);
            break;
          case 'MEMO_HASH':
            memoError = 'MEMO_HASH must be a 32 byte hash represented in hexadecimal (A-Z0-9)';
            memo = Memo.hash(this.memoValue);
            break;
          case 'MEMO_RETURN':
            memoError = 'MEMO_RETURN must be a 32 byte hash represented in hexadecimal (A-Z0-9)';
            memo = Memo.returnHash(this.memoValue);
            break;
        }
      } catch (error) {
        let alert = new Alert({
          title: 'Invalid memo.',
          text: memoError,
          type: Alert.TYPES.ERROR
        });
        this.memoAlertGroup.show(alert);
      }
    }

    if (this.addressAlerts.length || this.amountAlerts.length || this.memoAlerts.length) {
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
      .then(() => {
        this.displayedAmount = new BigNumber(this.amount).toFormat();
        this.showView('sendConfirm');
      })
      .catch(err => {
        let alert;
        switch (err.name) {
          case 'NotFoundError':
            alert = new Alert({
              title: '',
              text: 'Your account isn\'t funded.',
              type: Alert.TYPES.ERROR
            });
            break;
          case 'InsufficientBalanceError':
            alert = new Alert({
              title: 'Insufficient balance.',
              text:
                `To maintain your <a href="https://www.stellar.org/developers/learn/concepts/fees.html#minimum-balance" target="_blank">minimum balance</a>, the most you can currently send is ${err.data.maxSend}.`,
              type: Alert.TYPES.ERROR
            });
            break;
          case 'DestinationAccountNotExistError':
            alert = new Alert({
              title: 'Destination account doesn\'t exist.',
              text: 'You account must send at least 20 lumens to create an account.',
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
        let memo = Memo.none();

        if (this.memo) {
          switch (this.memoType) {
            case 'MEMO_TEXT':
              memo = Memo.text(this.memoValue);
              break;
            case 'MEMO_ID':
              memo = Memo.id(this.memoValue);
              break;
            case 'MEMO_HASH':
              memo = Memo.hash(this.memoValue);
              break;
            case 'MEMO_RETURN':
              memo = Memo.returnHash(this.memoValue);
              break;
          }
        }

        let transaction = new TransactionBuilder(this.session.getAccount())
          .addOperation(operation)
          .addMemo(memo)
          .addSigner(Keypair.fromSeed(this.session.getSecret()))
          .build();

        return this.Server.submitTransaction(transaction);
      })
      .then(() => {
        this.success = true;
        this.destinationAddress = null;
        this.amount = null;
        this.$rootScope.$broadcast('account-viewer.transaction-success');
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
