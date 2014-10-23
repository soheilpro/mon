var util = require("util");
var events = require("events");

function Messenger(stream, messageHeaderSize) {
  var _this = this;

  _this.stream = stream;
  _this.messageHeaderSize = messageHeaderSize || 4;

  var data = new Buffer(0);

  stream.on('data', function(chunk) {
    data = Buffer.concat([data, chunk]);

    if (data.length < _this.messageHeaderSize)
      return;

    var sizeBuffer = new Buffer(_this.messageHeaderSize);
    data.copy(sizeBuffer, 0, 0, _this.messageHeaderSize);

    var messageSize = parseInt(sizeBuffer.toString(), 10);

    if (data.length < _this.messageHeaderSize + messageSize)
      return;

    var message = new Buffer(messageSize);
    data.copy(message, 0, _this.messageHeaderSize, _this.messageHeaderSize + messageSize);
    data = data.slice(_this.messageHeaderSize + messageSize);

    _this.emit('message', message);
  })
}

util.inherits(Messenger, events.EventEmitter);

Messenger.prototype.send = function(message) {
  var _this = this;

  _this.stream.write((new Array(_this.messageHeaderSize + 1).join('0') + message.length).substr(-_this.messageHeaderSize, _this.messageHeaderSize));
  _this.stream.write(message);
};

module.exports = Messenger;