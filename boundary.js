function indexOf(buffer1, buffer2) {
  for (var i = 0; i < buffer1.length; i++) {
    var found = true;

    for (j = 0; j < buffer2.length; j++) {
      if (buffer1[i + j] !== buffer2[j]) {
        found = false;
        break;
      }
    }

    if (found)
      return i;
  }

  return -1;
}

module.exports.chunked = function(stream, messageHeaderSize) {
  messageHeaderSize = messageHeaderSize || 5;
  var buffer = new Buffer(0);

  var newStream = Object.create(stream);

  stream.on("data", function(data) {
    buffer = Buffer.concat([buffer, data]);

    if (buffer.length < messageHeaderSize)
      return;

    var sizeBuffer = new Buffer(messageHeaderSize);
    buffer.copy(sizeBuffer, 0, 0, messageHeaderSize);

    var messageSize = parseInt(sizeBuffer.toString(), 10);

    if (buffer.length < messageHeaderSize + messageSize)
      return;

    var message = new Buffer(messageSize);
    buffer.copy(message, 0, messageHeaderSize, messageHeaderSize + messageSize);
    buffer = buffer.slice(messageHeaderSize + messageSize);

    newStream.emit("message", message);
  });

  newStream.writeMessage = function(message) {
    stream.write((new Array(messageHeaderSize + 1).join("0") + message.length).substr(-messageHeaderSize, messageHeaderSize));
    stream.write(message);
  }

  return newStream;
}

module.exports.delimited = function(stream, delimiter) {
  var marker = new Buffer(delimiter || "\r\n");
  var buffer = new Buffer(0);

  var newStream = Object.create(stream);

  stream.on("data", function(data) {
    buffer = Buffer.concat([buffer, data]);

    while (true) {
      var markerIndex = indexOf(buffer, marker);
      if (markerIndex === -1)
        break;

      var message = new Buffer(markerIndex);
      buffer.copy(message, 0, 0, markerIndex);
      buffer = buffer.slice(markerIndex + marker.length);

      newStream.emit("message", message);
    }
  });

  newStream.writeMessage = function(message) {
    stream.write(delimiter);
    stream.write(message);
  }

  return newStream;
}