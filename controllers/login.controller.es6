import {Intent} from "interstellar-core";
import {Controller, Inject} from "interstellar-core";
import {Keypair} from 'stellar-sdk';
import {Alert, AlertGroup} from 'interstellar-ui-messages';
import LedgerTransport from '@ledgerhq/hw-transport-u2f';
import LedgerStr from '@ledgerhq/hw-app-str';
import { logEvent } from "../metrics.es6";

@Controller("LoginController")
@Inject("$scope", "interstellar-core.Config", "interstellar-core.IntentBroadcast", "interstellar-sessions.Sessions", "interstellar-ui-messages.Alerts")
export default class LoginController {
  constructor($scope, Config, IntentBroadcast, Sessions, Alerts) {
    this.$scope = $scope;
    this.Config = Config;
    this.IntentBroadcast = IntentBroadcast;
    this.Sessions = Sessions;
    this.failedAttempts = 0;

    if (this.Sessions.hasDefault()) {
      this.broadcastShowDashboardIntent();
    }

    this.alertGroup = new AlertGroup();
    this.alertGroup.registerUpdateListener(alerts => {
      this.alerts = alerts;
    });

    this.ledgerAlertGroup = new AlertGroup();
    this.ledgerAlertGroup.registerUpdateListener(alerts => {
      this.ledgerAlerts = alerts;
    });
    this.bip32Path = "44'/148'/0'";
    this.connectLedger();

    this.infoImage = require('../images/info.png');
    this.showInfo = false;

    Alerts.registerGroup(this.alertGroup);
  }

  broadcastShowDashboardIntent() {
    this.IntentBroadcast.sendBroadcast(
      new Intent(
        Intent.TYPES.SHOW_DASHBOARD
      )
    );
  }

  toggleInfo() {
    this.showInfo = !this.showInfo;
  }

  connectLedger() {
    this.ledgerStatus = 'Not connected';
    LedgerTransport.create().then((transport) => {
      logEvent('login: connect ledger')
      return new LedgerStr(transport).getAppConfiguration().then((result) =>{
        this.ledgerStatus = 'Connected';
        this.ledgerAppVersion = result.version;
        this.$scope.$apply();
      })
    }).catch(err => {
      console.log(err);
      this.ledgerStatus = 'Error: ' + err;
      this.$scope.$apply();

      logEvent('login: connect ledger: error', {
        message: err.message, isHttps: location.protocol === 'https'
      })

      // Try again in 5 seconds if timeout error:
      if (err.message && err.message.indexOf("U2F TIMEOUT") !== -1) {
        console.log("Connecting to Ledger failed. Trying again in 5 seconds...");
        setTimeout(this.connectLedger(), 5*1000);
      }
    });
  }

  proceedWithLedger() {
    try {
      LedgerTransport.create().then((transport) => {
        new LedgerStr(transport).getPublicKey(this.bip32Path).then((result) => {
          let permanent = this.Config.get("permanentSession");
          let data = { useLedger: true, bip32Path: this.bip32Path, ledgerAppVersion: this.ledgerAppVersion };
          let address = result.publicKey;
          this.Sessions.createDefault({address, data, permanent})
            .then(() => this.broadcastShowDashboardIntent());
        });
      }).catch((err) => {
        let alert = new Alert({
          title: 'Failed to connect',
          text: err,
          type: Alert.TYPES.ERROR
        });
        this.ledgerAlertGroup.show(alert);
      });
    } catch (err) {
      let alert = new Alert({
        title: 'Failed to connect',
        text: err,
        type: Alert.TYPES.ERROR
      });
      this.ledgerAlertGroup.show(alert);
    }
  }

  generate() {
    logEvent('login: generate new kepair')
    let keypair = Keypair.random();
    this.newKeypair = {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret()
    };
  }

  submit() {
    this.alertGroup.clear();

    if (this.failedAttempts > 8) {
      logEvent('login: error: rate limited')
      let alert = new Alert({
        title: "You're doing that too much",
        text: 'Please wait a few seconds before attempting to log in again.',
        type: Alert.TYPES.ERROR
      });
      this.alertGroup.show(alert);
      return
    }

    this.processing = true;
    let secret = this.secret;
    try {
      let keypair = Keypair.fromSecret(secret);
      let address = keypair.publicKey();
      let permanent = this.Config.get("permanentSession");
      this.Sessions.createDefault({address, secret, permanent})
        .then(() => {
          logEvent('login: success')
          this.broadcastShowDashboardIntent();
        });
    } catch(e) {
      logEvent('login: error: invalid secret key')

      // Rate limit with exponential backoff.
      this.failedAttempts++;
      setTimeout(() => {
        this.failedAttempts--
      }, (2 ** this.failedAttempts) * 1000)

      this.processing = false;
      let alert = new Alert({
        title: 'Invalid secret key',
        text: 'Secret keys are uppercase and begin with the letter "S."',
        type: Alert.TYPES.ERROR
      });
      this.alertGroup.show(alert);
    }
  }
}
