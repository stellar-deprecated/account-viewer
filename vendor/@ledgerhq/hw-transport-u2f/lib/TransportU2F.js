"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _u2fApi = require("u2f-api");

var _hwTransport = _interopRequireDefault(require("../../hw-transport"));

var _logs = require("@ledgerhq/logs");

var _errors = require("@ledgerhq/errors");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function wrapU2FTransportError(originalError, message, id) {
  const err = new _errors.TransportError(message, id); // $FlowFixMe

  err.originalError = originalError;
  return err;
}

function wrapApdu(apdu, key) {
  const result = Buffer.alloc(apdu.length);

  for (let i = 0; i < apdu.length; i++) {
    result[i] = apdu[i] ^ key[i % key.length];
  }

  return result;
} // Convert from normal to web-safe, strip trailing "="s


const webSafe64 = base64 => base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); // Convert from web-safe to normal, add trailing "="s


const normal64 = base64 => base64.replace(/-/g, "+").replace(/_/g, "/") + "==".substring(0, 3 * base64.length % 4);

function attemptExchange(apdu, timeoutMillis, scrambleKey, unwrap) {
  const keyHandle = wrapApdu(apdu, scrambleKey);
  const challenge = Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", "hex");
  const signRequest = {
    version: "U2F_V2",
    keyHandle: webSafe64(keyHandle.toString("base64")),
    challenge: webSafe64(challenge.toString("base64")),
    appId: location.origin
  };
  (0, _logs.log)("apdu", "=> " + apdu.toString("hex"));
  return (0, _u2fApi.sign)(signRequest, timeoutMillis / 1000).then(response => {
    const {
      signatureData
    } = response;

    if (typeof signatureData === "string") {
      const data = Buffer.from(normal64(signatureData), "base64");
      let result;

      if (!unwrap) {
        result = data;
      } else {
        result = data.slice(5);
      }

      (0, _logs.log)("apdu", "<= " + result.toString("hex"));
      return result;
    } else {
      throw response;
    }
  });
}

let transportInstances = [];

function emitDisconnect() {
  transportInstances.forEach(t => t.emit("disconnect"));
  transportInstances = [];
}

function isTimeoutU2FError(u2fError) {
  return u2fError.metaData.code === 5;
}
/**
 * U2F web Transport implementation
 * @example
 * import TransportU2F from "@ledgerhq/hw-transport-u2f";
 * ...
 * TransportU2F.create().then(transport => ...)
 */

function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var TransportU2F =
/*#__PURE__*/
function (_hwTransport$default) {
  _inherits(TransportU2F, _hwTransport$default);

  _createClass(TransportU2F, null, [{
    key: "open",

    /*
     */

    /*
     */

    /**
     * static function to create a new Transport from a connected Ledger device discoverable via U2F (browser support)
     */
    value: function () {
      var _open = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee(_) {
        var _openTimeout,
            _args = arguments;

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _openTimeout = _args.length > 1 && _args[1] !== undefined ? _args[1] : 5000;
                return _context.abrupt("return", new TransportU2F());

              case 2:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      function open(_x) {
        return _open.apply(this, arguments);
      }

      return open;
    }()
  }]);

  function TransportU2F() {
    var _this;

    _classCallCheck(this, TransportU2F);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(TransportU2F).call(this));
    _this.scrambleKey = void 0;
    _this.unwrap = true;
    transportInstances.push(_assertThisInitialized(_this));
    return _this;
  }
  /**
   * Exchange with the device using APDU protocol.
   * @param apdu
   * @returns a promise of apdu response
   */


  _createClass(TransportU2F, [{
    key: "exchange",
    value: function () {
      var _exchange = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee2(apdu) {
        var isU2FError;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.prev = 0;
                _context2.next = 3;
                return attemptExchange(apdu, this.exchangeTimeout, this.scrambleKey, this.unwrap);

              case 3:
                return _context2.abrupt("return", _context2.sent);

              case 6:
                _context2.prev = 6;
                _context2.t0 = _context2["catch"](0);
                isU2FError = _typeof(_context2.t0.metaData) === "object";

                if (!isU2FError) {
                  _context2.next = 14;
                  break;
                }

                if (isTimeoutU2FError(_context2.t0)) {
                  emitDisconnect();
                } // the wrapping make error more usable and "printable" to the end user.


                throw wrapU2FTransportError(_context2.t0, "Failed to sign with Ledger device: U2F " + _context2.t0.metaData.type, "U2F_" + _context2.t0.metaData.code);

              case 14:
                throw _context2.t0;

              case 15:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this, [[0, 6]]);
      }));

      function exchange(_x2) {
        return _exchange.apply(this, arguments);
      }

      return exchange;
    }()
    /**
     */

  }, {
    key: "setScrambleKey",
    value: function setScrambleKey(scrambleKey) {
      this.scrambleKey = Buffer.from(scrambleKey, "ascii");
    }
    /**
     */

  }, {
    key: "setUnwrap",
    value: function setUnwrap(unwrap) {
      this.unwrap = unwrap;
    }
  }, {
    key: "close",
    value: function close() {
      // u2f have no way to clean things up
      return Promise.resolve();
    }
  }]);

  return TransportU2F;
}(_hwTransport.default);

exports.default = TransportU2F;
TransportU2F.isSupported = _u2fApi.isSupported;

TransportU2F.list = () => // this transport is not discoverable but we are going to guess if it is here with isSupported()
(0, _u2fApi.isSupported)().then(supported => supported ? [null] : []);

TransportU2F.listen = observer => {
  let unsubscribed = false;
  (0, _u2fApi.isSupported)().then(supported => {
    if (unsubscribed) return;

    if (supported) {
      observer.next({
        type: "add",
        descriptor: null
      });
      observer.complete();
    } else {
      observer.error(new _errors.TransportError("U2F browser support is needed for Ledger. " + "Please use Chrome, Opera or Firefox with a U2F extension. " + "Also make sure you're on an HTTPS connection", "U2FNotSupported"));
    }
  });
  return {
    unsubscribe: () => {
      unsubscribed = true;
    }
  };
};
//# sourceMappingURL=TransportU2F.js.map
