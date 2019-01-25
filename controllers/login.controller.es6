import {Intent} from "interstellar-core";
import {Controller, Inject} from "interstellar-core";
import {Keypair} from 'stellar-sdk';
import {Alert, AlertGroup} from 'interstellar-ui-messages';
import LedgerTransport from '@ledgerhq/hw-transport-u2f';
import LedgerStr from '@ledgerhq/hw-app-str';
import TrezorConnect from 'trezor-connect';

@Controller("LoginController")
@Inject("$scope", "interstellar-core.Config", "interstellar-core.IntentBroadcast", "interstellar-sessions.Sessions", "interstellar-ui-messages.Alerts")
export default class LoginController {
  constructor($scope, Config, IntentBroadcast, Sessions, Alerts) {
    this.$scope = $scope;
    this.Config = Config;
    this.IntentBroadcast = IntentBroadcast;
    this.Sessions = Sessions;

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

    this.trezorAlertGroup = new AlertGroup();
    this.trezorAlertGroup.registerUpdateListener(alerts => {
        this.trezorAlerts = alerts;
    });

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
      return new LedgerStr(transport).getAppConfiguration().then((result) =>{
        this.ledgerStatus = 'Connected';
        this.ledgerAppVersion = result.version;
        this.$scope.$apply();
      })
    }).catch(err => {
      console.log(err);
      this.ledgerStatus = 'Error: ' + err;
      this.$scope.$apply();

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

  proceedWithTrezor() {
    let params = {
      // Trezor requires "m/" prefix
      path: 'm/' + this.bip32Path,
      showOnTrezor: false // don't bother with the "confirm sharing address" prompt on the Trezor device
    };

    TrezorConnect.stellarGetAddress(params).then((result) => {
        if (!result.success) {
            let alert = new Alert({
                title: 'Could not use Trezor',
                text: result.payload.error,
                type: Alert.TYPES.ERROR,
                dismissible: true
            });
            this.trezorAlertGroup.show(alert);
            // Necessary to get the alert to be rendered
            this.$scope.$applyAsync();
            return;
        }

        let permanent = this.Config.get("permanentSession");
        let data = { useTrezor: true, bip32Path: this.bip32Path };
        let address = result.payload.address;
        this.Sessions.createDefault({address, data, permanent})
          .then(() => this.broadcastShowDashboardIntent());
    });
  }

  generate() {
    let keypair = Keypair.random();
    this.newKeypair = {
      publicKey: keypair.accountId(),
      secretKey: keypair.seed()
    };
  }

  submit() {
    this.alertGroup.clear();
    this.processing = true;
    let secret = this.secret;
    try {
      let keypair = Keypair.fromSeed(secret);
      let address = keypair.accountId();
      let permanent = this.Config.get("permanentSession");
      this.Sessions.createDefault({address, secret, permanent})
        .then(() => {
          this.broadcastShowDashboardIntent();
        });
    } catch(e) {
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
