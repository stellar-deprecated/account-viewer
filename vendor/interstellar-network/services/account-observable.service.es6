import {Inject, Service} from 'interstellar-core';
import {contains, cloneDeep} from 'lodash';
import Promise from 'bluebird';

@Service('AccountObservable')
@Inject('interstellar-network.Server')
export default class AccountObservable {
  constructor(Server) {
    this.Server = Server;
    this.streamingAddresses = [];
    this.paymentListeners = {};
    this.balanceChangeListeners = {};
    this.balances = {};
  }

  _setupStreaming(address) {
    if (!contains(this.streamingAddresses, address)) {
      this.streamingAddresses.push(address);
      this.paymentListeners[address] = [];
      this.balanceChangeListeners[address] = [];

      this.Server.payments()
        .forAccount(address)
        .stream({
          onmessage: payment => this._onPayment.call(this, address, payment)
        });
    }
  }

  getPayments(address) {
    return this.Server.payments()
      .forAccount(address)
      .order('desc')
      .call()
      .then(payments => {
        return cloneDeep(payments);
      });
  }

  getBalances(address) {
    if (this.balances[address]) {
      return Promise.resolve(cloneDeep(this.balances[address]));
    } else {
      return this._getBalances(address)
        .then(balances => {
          this.balances[address] = balances;
          return cloneDeep(balances);
        });
    }
  }

  registerPaymentListener(address, listener) {
    this._setupStreaming(address);
    this.paymentListeners[address].push(listener);
  }

  registerBalanceChangeListener(address, listener) {
    this._setupStreaming(address);
    this.balanceChangeListeners[address].push(listener);
  }

  _getBalances(address) {
    return this.Server.accounts()
      .address(address)
      .call()
      .then(account => Promise.resolve(account.balances))
      .catch(e => {
        if (e.name === 'NotFoundError') {
          return [];
        } else {
          throw e;
        }
      });
  }

  _onPayment(address, payment) {
    if (this.paymentListeners[address]) {
      for (var listener of this.paymentListeners[address]) {
        listener(cloneDeep(payment));
      }
    }

    if (this.balanceChangeListeners[address]) {
      this._getBalances(address)
        .then(balances => {
          this.balances[address] = balances;
          for (var listener of this.balanceChangeListeners[address]) {
            listener(cloneDeep(balances));
          }
        });
    }
  }
}
