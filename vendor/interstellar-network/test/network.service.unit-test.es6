import "../index";

describe("stellard.Network", function() {
  injectNg("stellard", {network: "stellard.Network"});

  it("is not null", function() {
    expect(this.network).to.be.an('object');
  });
});