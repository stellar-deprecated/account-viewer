import {Intent} from "interstellar-core";
import {Controller, Inject} from "interstellar-core";
import {Keypair} from 'stellar-base';
import {Alert, AlertGroup} from 'interstellar-ui-messages';

@Controller("LoginController")
@Inject("$scope", "interstellar-core.IntentBroadcast", "interstellar-sessions.Sessions", "interstellar-ui-messages.Alerts")
export default class LoginController {
  constructor($scope, IntentBroadcast, Sessions, Alerts) {
    this.$scope = $scope;
    this.IntentBroadcast = IntentBroadcast;
    this.Sessions = Sessions;

    if (this.Sessions.hasDefault()) {
      this.broadcastShowDashboardIntent();
    }

    this.alertGroup = new AlertGroup();
    this.alertGroup.registerUpdateListener(alerts => {
      this.alerts = alerts;
    });
    Alerts.registerGroup(this.alertGroup);
  }

  broadcastShowDashboardIntent() {
    this.IntentBroadcast.sendBroadcast(
      new Intent(
        Intent.TYPES.SHOW_DASHBOARD
      )
    );
  }

  submit() {
    this.alertGroup.clear();
    let secret  = this.secret;
    try {
      let keypair = Keypair.fromSeed(secret);
      let address = keypair.address();
      this.Sessions.createDefault({address, secret, permanent: true})
        .then(() => {
          this.broadcastShowDashboardIntent();
        });
    } catch(e) {
      let alert = new Alert({
        title: 'Invalid secret key',
        text: 'You entered a secret key for the old network. Secret keys for the new network are uppercase and begins with the letter "S".',
        type: Alert.TYPES.ERROR,
        dismissible: false // default true
      });
      this.alertGroup.show(alert);
    }
  }
}
