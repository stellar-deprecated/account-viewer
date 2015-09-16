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

    this.alerts = new AlertGroup();
    Alerts.registerGroup(this.alerts);
  }

  broadcastShowDashboardIntent() {
    this.IntentBroadcast.sendBroadcast(
      new Intent(
        Intent.TYPES.SHOW_DASHBOARD
      )
    );
  }

  submit() {
    this.alerts.clear();
    let secret  = this.secret;
    try {
      let keypair = Keypair.fromSeed(secret);
      let address = keypair.address();
      this.Sessions.createDefault({address, secret})
        .then(() => {
          this.broadcastShowDashboardIntent();
        });
    } catch(e) {
      let alert = new Alert({
        title: 'Secret is invalid',
        text: 'Make sure you are using a correct secret to login.',
        type: Alert.TYPES.ERROR,
        dismissible: false // default true
      });
      this.alerts.show(alert);
    }
  }
}
