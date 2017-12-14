import {Widget, Inject} from 'interstellar-core';
import BigNumber from 'bignumber.js';
import _ from 'lodash';

@Widget('history', 'HistoryWidgetController', 'interstellar-basic-client/history-widget')
@Inject("$scope", "interstellar-sessions.Sessions", "interstellar-network.Server")
export default class HistoryWidgetController {
  constructor($scope, Sessions, Server) {
    if (!Sessions.hasDefault()) {
      console.error('No session. This widget should be used with active session.');
      return;
    }

    this.$scope = $scope;
    this.Server = Server;
    let session = Sessions.default;
    this.address = session.getAddress();
    this.payments = [];
    this.loading = true;
    this.showLengthLimitAlert = false;

    this.loadPayments();
  }

  loadPayments() {
    return this.Server.payments()
      .forAccount(this.address)
      .order('desc')
      .limit(100)
      .call()
      .then(payments => {
        this.payments = _.map(payments.records, payment => {
          return this._transformPaymentFields(payment);
        });

        if (this.payments.length >= 100) {
          this.showLengthLimitAlert = true;
        }

        this.setupSteaming();
      })
      .catch(e => {
        if (e.name === 'NotFoundError') {
          setTimeout(() => {
            this.loadPayments();
          }, 10*1000);
        } else {
          throw e;
        }
      })
      .finally(() => {
        this.loading = false;
        this.$scope.$apply();
      });
  }

  setupSteaming() {
    // Setup event stream
    let cursor;
    if (this.payments.length > 0) {
      cursor = this.payments[0].paging_token;
    } else {
      cursor = 'now';
    }

    this.Server.payments()
      .forAccount(this.address)
      .cursor(cursor)
      .stream({
        onmessage: payment => this.onNewPayment.call(this, payment)
      });
  }

  onNewPayment(payment) {
    this.payments.unshift(this._transformPaymentFields(payment));
  }

  _transformPaymentFields(payment) {
    if (payment.type === 'create_account') {
      payment.from   = payment.funder;
      payment.to     = payment.account;
      payment.amount = payment.starting_balance;
    }

    if (payment.type === 'account_merge') {
      payment.direction = (payment.account === this.address) ? 'out' : 'in';
      payment.display_address = (payment.account === this.address) ? payment.into : payment.account;
      let sign = payment.direction === 'in' ? '+' : '-';
      payment.display_amount = '[account merge]';
    } else {
      payment.direction = (payment.from === this.address) ? 'out' : 'in';
      payment.display_address = (payment.from === this.address) ? payment.to : payment.from;
      let sign = payment.direction === 'in' ? '+' : '-';
      let formattedAmount = new BigNumber(payment.amount).toFormat();
      payment.display_amount = `${sign}${formattedAmount}`;

      if (payment.asset_code) {
        payment.display_asset_code = payment.asset_code;
      } else {
        payment.display_asset_code = 'XLM';
      }
    }

    payment.link = payment._links.self.href;

    this._getMemoForPayment(payment)
      .then(memoObj => {
        payment.memo_type = memoObj.memoType;
        payment.memo = memoObj.memo;
      });

    return payment;
  }

  _getMemoForPayment(payment) {
    return payment.transaction()
      .then(transaction => {
        let memoType = transaction.memo_type;
        let memo = transaction.memo;
        return {memoType, memo};
      });
  }
}
