import { NetworkConnection } from "../lib/network-connection";

describe("NetworkConnection", function() {
  dontUseAngularQ();
  
  injectNg("stellard", {
    network: "stellard.Network",
    config: "core.Config",
    q: "$q",
  });

  lazy("connectionSpec", function() {
    return this.config.get("stellard/connections/live");
  });

  subject(function() {
    return new NetworkConnection(this.q, this.network, "live", this.connectionSpec);
  });

  afterEach(function() {
    this.subject.disconnect();
  });

  describe("#ensureConnected", function() {

    context("when the remote websocket is successfully connected and the stellard returns an online status", function() {
      setupMockSocket("online");

      it("resolves the returns promise", function(done) {
        this.subject.ensureConnected()
          .then(nc => { done(); })
          .catch(done)
          ;
      });

    });

    context("when the remote websocket closes immediately", function() {
      setupMockSocket("immediate-close");
      this.timeout(5000);

      it("never resolves", function(done) {
        // below is a crude race... if the subject resolved before 2 seconds pass.
        // we fail
        setTimeout(done, 2000);
        this.subject.ensureConnected()
          .then(nc => { done(new Error("did not expect resolve")); });
      });
    });

  });
});
