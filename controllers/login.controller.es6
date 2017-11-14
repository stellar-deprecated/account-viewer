import {Intent} from "interstellar-core";
import {Controller, Inject} from "interstellar-core";
import {Keypair} from 'stellar-base';
import {Alert, AlertGroup} from 'interstellar-ui-messages';
import StellarLedger from 'stellar-ledger-api';

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

    this.ledgerStatus = 'Not connected';
    this.connectLedger();

    Alerts.registerGroup(this.alertGroup);
  }

  broadcastShowDashboardIntent() {
    if (this.ledgerApi !== 'undefined') {
      this.ledgerApi.clearDeviceListeners();
    }
    this.IntentBroadcast.sendBroadcast(
      new Intent(
        Intent.TYPES.SHOW_DASHBOARD
      )
    );
  }

  connectLedger() {
    this.ledgerApi = new StellarLedger.Api(new StellarLedger.comm(3));
    this.ledgerApi.addDeviceListener((status, msg) => {
      if (status === 'Timeout') {
        status = 'Not connected';
      }
      if (msg) {
        status = status + ': ' + msg;
      }
      this.ledgerStatus = status;
      this.$scope.$apply();
    });
  }

  proceedWithLedger() {
    let bip32Path = "44'/148'/0'";
    this.ledgerApi.getPublicKey_async(bip32Path).then((result) => {
      let permanent = this.Config.get("permanentSession");
      let data = { useLedger: true, bip32Path };
      let address = result['publicKey'];
      this.Sessions.createDefault({address, data, permanent})
          .then(() => {
            this.broadcastShowDashboardIntent();
          });
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
