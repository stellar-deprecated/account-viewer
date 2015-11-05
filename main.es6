require('./styles/main.header.scss');
require('./styles/main.footer.scss');

import interstellarCore, {App, Intent} from "interstellar-core";
import interstellarNetwork from "interstellar-network";
import interstellarSessions from "interstellar-sessions";
import interstellarUiMessages from "interstellar-ui-messages";

let config;
if (INTERSTELLAR_ENV === 'prd') {
  config = require('./config-prd.json');
} else {
  config = require('./config.json');
}
const app = new App("interstellar-basic-client", config);

app.use(interstellarCore);
app.use(interstellarNetwork);
app.use(interstellarSessions);
app.use(interstellarUiMessages);

app.templates   = require.context("raw!./templates", true);
app.controllers = require.context("./controllers",   true);

app.routes = ($stateProvider) => {
  $stateProvider.state('login', {
    url: "/",
    templateUrl: "interstellar-basic-client/login"
  });
  $stateProvider.state('dashboard', {
    url: "/dashboard",
    templateUrl: "interstellar-basic-client/dashboard",
    requireSession: true
  });
};

// Register BroadcastReceivers
let registerBroadcastReceivers = ($state, IntentBroadcast) => {
  IntentBroadcast.registerReceiver(Intent.TYPES.SHOW_DASHBOARD, intent => {
    $state.go('dashboard');
  });

  IntentBroadcast.registerReceiver(Intent.TYPES.LOGOUT, intent => {
    $state.go('login');
  });
};
registerBroadcastReceivers.$inject = ["$state", "interstellar-core.IntentBroadcast"];
app.run(registerBroadcastReceivers);

let goToMainStateWithoutSession = ($state, $rootScope, Sessions) => {
  $rootScope.$on('$stateChangeStart', (event, toState, toParams, fromState, fromParams) => {
    let hasDefault = Sessions.hasDefault();
  if (toState.requireSession && !hasDefault) {
    event.preventDefault();
    $state.go('login');
  }
})
};

goToMainStateWithoutSession.$inject = ["$state", "$rootScope", "interstellar-sessions.Sessions"];
app.run(goToMainStateWithoutSession);

app.bootstrap();
