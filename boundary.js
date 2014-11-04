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

module.exports.chunked = function(stream) {
  var marker = new Buffer("\r\n");
  var buffer = new Buffer(0);

  var newStream = Object.create(stream);

  stream.on("data", function(data) {
    buffer = Buffer.concat([buffer, data]);

    while (true) {
      if (messageSize === undefined) {
        var markerIndex = indexOf(buffer, marker);
        if (markerIndex === -1)
          break;

        var messageSizeBuffer = new Buffer(markerIndex);
        buffer.copy(messageSizeBuffer, 0, 0, markerIndex);

        var messageSize = parseInt(messageSizeBuffer.toString(), 10);
      }

      if (buffer.length < markerIndex + marker.length + messageSize)
        break;

      var message = new Buffer(messageSize);
      buffer.copy(message, 0, markerIndex + marker.length, markerIndex + marker.length + messageSize);
      buffer = buffer.slice(markerIndex + marker.length + messageSize);
      messageSize = undefined;

      newStream.emit("message", message);
    }
  });

  newStream.writeMessage = function(message) {
    stream.write(message.length.toString());
    stream.write(marker);
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