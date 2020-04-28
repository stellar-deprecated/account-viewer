import {Module, Intent} from "interstellar-core";
import interstellarSessions from "interstellar-sessions";

import {Networks} from "stellar-sdk";
export const NETWORK_PUBLIC  = Networks.PUBLIC;
export const NETWORK_TESTNET = Networks.TESTNET;

const mod = new Module('interstellar-network');
export default mod;

mod.services = require.context("./services", true);

let addConfig = ConfigProvider => {
  ConfigProvider.addModuleConfig(mod.name, {
    networkPassphrase: NETWORK_TESTNET,
    horizon: {
      secure: true,
      hostname: "horizon-testnet.stellar.org",
      port: 443
    }
  });
};
addConfig.$inject = ['interstellar-core.ConfigProvider'];
mod.config(addConfig);

mod.define();
