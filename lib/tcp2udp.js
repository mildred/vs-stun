module.exports = function(sock, debug){

  sock.ended = false;
  sock.sendPackets = 0;
  sock.receivedPackets = 0;

  sock.send = function(data, offset, length, port, host, callback){
    var sendData = data.slice(offset, offset + length);
    if(this.ended) {
      return this.emit('error', "Connection closed");
    }
    this.write(sendData);
    this.sendPackets++;
    if(debug){
      console.log("TCP2UDP Send:");
      console.log(sendData);
    }
    if(callback) callback();
  };
  
  sock.on('data', function(data){
    var rinfo = {address: this.remoteAddress, port: this.remotePort};
    if(!this.concatData) this.concatData = data;
    else this.concatData = Buffer.concat([this.concatData, data]);
    while(this.concatData.length >= 4) {
      var len = this.concatData.readUInt16BE(2) + 20;
      if(this.concatData.length < len) break;
      var msg = this.concatData.slice(0, len);
      if(debug){
        console.log("TCP2UDP Message:");
        console.log(msg);
      }
      this.receivedPackets++;
      this.emit('message', msg, rinfo);
      this.concatData = this.concatData.slice(len);
    }
  });
  
  sock.on('end', function(){
    if(debug) {
      console.log('Server closing the connection ' + this.sendPackets + ' ' + this.receivedPackets);
    }
    this.ended = true;
    if(this.sendPackets > this.receivedPackets) {
      while(this.sendPackets > this.receivedPackets) {
        this.emit('message', this.concatData, {address: null, port: null});
        this.receivedPackets++;
      }
    } else if(this.concatData && this.concatData.length > 0){
      this.emit('error', "Unfinished message in receive queue");
    }
  });

  return sock;
}
