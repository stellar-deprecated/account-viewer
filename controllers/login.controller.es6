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
    this.IntentBroadcast.sendBroadcast(
      new Intent(
        Intent.TYPES.SHOW_DASHBOARD
      )
    );
  }

  connectLedger() {
      let self = this;
      StellarLedger.comm.create_async().then(function (comm) {
        let api = new StellarLedger.Api(comm);
        api.getPublicKey_async("44'/148'/0'", true, false).then(function (result) {
          self.ledgerAddress = result['publicKey'];
          self.ledgerStatus = 'Connected';
          self.$scope.$apply();
        }).catch(function (err) {
          if (err.errorCode === 5) {
            console.log('Timeout; retry');
            self.connectLedger();
          } else {
            if (err === 'Invalid status 6801') {
              self.ledgerStatus = 'Asleep';
              self.$scope.$apply();
            } else {
              console.log('Unable to connect ledger: ' + err);
            }
          }
        });
      }).catch(function (err) {
        console.log('Unable to connect ledger' + err);
      });
  }

  proceedWithLedger() {
    let permanent = this.Config.get("permanentSession");
    let data = { ledger: true };
    let address = this.ledgerAddress;
    this.Sessions.createDefault({address, data, permanent})
      .then(() => {
        this.broadcastShowDashboardIntent();
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
