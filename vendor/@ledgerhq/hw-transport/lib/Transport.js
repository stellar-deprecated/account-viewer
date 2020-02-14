"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "TransportError", {
  enumerable: true,
  get: function () {
    return _errors.TransportError;
  }
});
Object.defineProperty(exports, "StatusCodes", {
  enumerable: true,
  get: function () {
    return _errors.StatusCodes;
  }
});
Object.defineProperty(exports, "getAltStatusMessage", {
  enumerable: true,
  get: function () {
    return _errors.getAltStatusMessage;
  }
});
Object.defineProperty(exports, "TransportStatusError", {
  enumerable: true,
  get: function () {
    return _errors.TransportStatusError;
  }
});
exports.default = void 0;

var _events = _interopRequireDefault(require("events"));

var _errors = require("@ledgerhq/errors");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * Transport defines the generic interface to share between node/u2f impl
 * A **Descriptor** is a parametric type that is up to be determined for the implementation.
 * it can be for instance an ID, an file path, a URL,...
 */
var Transport =
/*#__PURE__*/
function () {
  function Transport() {
    var _this = this;

    _classCallCheck(this, Transport);

    this.exchangeTimeout = 30000;
    this.unresponsiveTimeout = 15000;
    this._events = new _events.default();

    this.send =
    /*#__PURE__*/
    function () {
      var _ref = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee(cla, ins, p1, p2) {
        var data,
            statusList,
            response,
            sw,
            _args = arguments;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                data = _args.length > 4 && _args[4] !== undefined ? _args[4] : Buffer.alloc(0);
                statusList = _args.length > 5 && _args[5] !== undefined ? _args[5] : [_errors.StatusCodes.OK];

                if (!(data.length >= 256)) {
                  _context.next = 4;
                  break;
                }

                throw new _errors.TransportError("data.length exceed 256 bytes limit. Got: " + data.length, "DataLengthTooBig");

              case 4:
                _context.next = 6;
                return _this.exchange(Buffer.concat([Buffer.from([cla, ins, p1, p2]), Buffer.from([data.length]), data]));

              case 6:
                response = _context.sent;
                sw = response.readUInt16BE(response.length - 2);

                if (statusList.some(function (s) {
                  return s === sw;
                })) {
                  _context.next = 10;
                  break;
                }

                throw new _errors.TransportStatusError(sw);

              case 10:
                return _context.abrupt("return", response);

              case 11:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      return function (_x, _x2, _x3, _x4) {
        return _ref.apply(this, arguments);
      };
    }();

    this.exchangeBusyPromise = void 0;

    this.exchangeAtomicImpl =
    /*#__PURE__*/
    function () {
      var _ref2 = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee2(f) {
        var resolveBusy, busyPromise, unresponsiveReached, timeout, res;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!_this.exchangeBusyPromise) {
                  _context2.next = 2;
                  break;
                }

                throw new _errors.TransportRaceCondition("An action was already pending on the Ledger device. Please deny or reconnect.");

              case 2:
                busyPromise = new Promise(function (r) {
                  resolveBusy = r;
                });
                _this.exchangeBusyPromise = busyPromise;
                unresponsiveReached = false;
                timeout = setTimeout(function () {
                  unresponsiveReached = true;

                  _this.emit("unresponsive");
                }, _this.unresponsiveTimeout);
                _context2.prev = 6;
                _context2.next = 9;
                return f();

              case 9:
                res = _context2.sent;

                if (unresponsiveReached) {
                  _this.emit("responsive");
                }

                return _context2.abrupt("return", res);

              case 12:
                _context2.prev = 12;
                clearTimeout(timeout);
                if (resolveBusy) resolveBusy();
                _this.exchangeBusyPromise = null;
                return _context2.finish(12);

              case 17:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, null, [[6,, 12, 17]]);
      }));

      return function (_x5) {
        return _ref2.apply(this, arguments);
      };
    }();

    this._appAPIlock = null;
  }
  /**
   * low level api to communicate with the device
   * This method is for implementations to implement but should not be directly called.
   * Instead, the recommanded way is to use send() method
   * @param apdu the data to send
   * @return a Promise of response data
   */


  _createClass(Transport, [{
    key: "exchange",
    value: function exchange(_apdu) {
      throw new Error("exchange not implemented");
    }
    /**
     * set the "scramble key" for the next exchanges with the device.
     * Each App can have a different scramble key and they internally will set it at instanciation.
     * @param key the scramble key
     */

  }, {
    key: "setScrambleKey",
    value: function setScrambleKey(_key) {}
    /**
     * close the exchange with the device.
     * @return a Promise that ends when the transport is closed.
     */

  }, {
    key: "close",
    value: function close() {
      return Promise.resolve();
    }
    /**
     * Listen to an event on an instance of transport.
     * Transport implementation can have specific events. Here is the common events:
     * * `"disconnect"` : triggered if Transport is disconnected
     */

  }, {
    key: "on",
    value: function on(eventName, cb) {
      this._events.on(eventName, cb);
    }
    /**
     * Stop listening to an event on an instance of transport.
     */

  }, {
    key: "off",
    value: function off(eventName, cb) {
      this._events.removeListener(eventName, cb);
    }
  }, {
    key: "emit",
    value: function emit(event) {
      var _this$_events;

      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key2 = 1; _key2 < _len; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      (_this$_events = this._events).emit.apply(_this$_events, [event].concat(args));
    }
    /**
     * Enable or not logs of the binary exchange
     */

  }, {
    key: "setDebugMode",
    value: function setDebugMode() {
      console.warn("setDebugMode is deprecated. use @ledgerhq/logs instead. No logs are emitted in this anymore.");
    }
    /**
     * Set a timeout (in milliseconds) for the exchange call. Only some transport might implement it. (e.g. U2F)
     */

  }, {
    key: "setExchangeTimeout",
    value: function setExchangeTimeout(exchangeTimeout) {
      this.exchangeTimeout = exchangeTimeout;
    }
    /**
     * Define the delay before emitting "unresponsive" on an exchange that does not respond
     */

  }, {
    key: "setExchangeUnresponsiveTimeout",
    value: function setExchangeUnresponsiveTimeout(unresponsiveTimeout) {
      this.unresponsiveTimeout = unresponsiveTimeout;
    }
    /**
     * wrapper on top of exchange to simplify work of the implementation.
     * @param cla
     * @param ins
     * @param p1
     * @param p2
     * @param data
     * @param statusList is a list of accepted status code (shorts). [0x9000] by default
     * @return a Promise of response buffer
     */

    /**
     * create() allows to open the first descriptor available or
     * throw if there is none or if timeout is reached.
     * This is a light helper, alternative to using listen() and open() (that you may need for any more advanced usecase)
     * @example
    TransportFoo.create().then(transport => ...)
     */

  }, {
    key: "decorateAppAPIMethods",
    value: function decorateAppAPIMethods(self, methods, scrambleKey) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = methods[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var methodName = _step.value;
          self[methodName] = this.decorateAppAPIMethod(methodName, self[methodName], self, scrambleKey);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return != null) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }
  }, {
    key: "decorateAppAPIMethod",
    value: function decorateAppAPIMethod(methodName, f, ctx, scrambleKey) {
      var _this2 = this;

      return (
        /*#__PURE__*/
        function () {
          var _ref3 = _asyncToGenerator(
          /*#__PURE__*/
          regeneratorRuntime.mark(function _callee3() {
            var _appAPIlock,
                _len2,
                args,
                _key3,
                _args3 = arguments;

            return regeneratorRuntime.wrap(function _callee3$(_context3) {
              while (1) {
                switch (_context3.prev = _context3.next) {
                  case 0:
                    _appAPIlock = _this2._appAPIlock;

                    if (!_appAPIlock) {
                      _context3.next = 3;
                      break;
                    }

                    return _context3.abrupt("return", Promise.reject(new _errors.TransportError("Ledger Device is busy (lock " + _appAPIlock + ")", "TransportLocked")));

                  case 3:
                    _context3.prev = 3;
                    _this2._appAPIlock = methodName;

                    _this2.setScrambleKey(scrambleKey);

                    for (_len2 = _args3.length, args = new Array(_len2), _key3 = 0; _key3 < _len2; _key3++) {
                      args[_key3] = _args3[_key3];
                    }

                    _context3.next = 9;
                    return f.apply(ctx, args);

                  case 9:
                    return _context3.abrupt("return", _context3.sent);

                  case 10:
                    _context3.prev = 10;
                    _this2._appAPIlock = null;
                    return _context3.finish(10);

                  case 13:
                  case "end":
                    return _context3.stop();
                }
              }
            }, _callee3, null, [[3,, 10, 13]]);
          }));

          return function () {
            return _ref3.apply(this, arguments);
          };
        }()
      );
    }
  }], [{
    key: "create",
    value: function create() {
      var _this3 = this;

      var openTimeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 3000;
      var listenTimeout = arguments.length > 1 ? arguments[1] : undefined;
      return new Promise(function (resolve, reject) {
        var found = false;

        var sub = _this3.listen({
          next: function next(e) {
            found = true;
            if (sub) sub.unsubscribe();
            if (listenTimeoutId) clearTimeout(listenTimeoutId);

            _this3.open(e.descriptor, openTimeout).then(resolve, reject);
          },
          error: function error(e) {
            if (listenTimeoutId) clearTimeout(listenTimeoutId);
            reject(e);
          },
          complete: function complete() {
            if (listenTimeoutId) clearTimeout(listenTimeoutId);

            if (!found) {
              reject(new _errors.TransportError(_this3.ErrorMessage_NoDeviceFound, "NoDeviceFound"));
            }
          }
        });

        var listenTimeoutId = listenTimeout ? setTimeout(function () {
          sub.unsubscribe();
          reject(new _errors.TransportError(_this3.ErrorMessage_ListenTimeout, "ListenTimeout"));
        }, listenTimeout) : null;
      });
    }
  }]);

  return Transport;
}();

exports.default = Transport;
Transport.isSupported = void 0;
Transport.list = void 0;
Transport.listen = void 0;
Transport.open = void 0;
Transport.ErrorMessage_ListenTimeout = "No Ledger device found (timeout)";
Transport.ErrorMessage_NoDeviceFound = "No Ledger device found";
//# sourceMappingURL=Transport.js.map
