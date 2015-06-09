var Framer = function (options) {
    options = options || {};
    this.sizeS = options.sizeS || 64;
    this.stepS = options.stepS || this.sizeS;
    this.map = options.map || undefined;
    this.scale = options.scale || undefined;
    this.offset = options.offset || 0;
};

Framer.prototype = {
    frame: function(buffer, callback) {
        var self = this;
        var cb = this.offset; //curByte
        var frame = [];
        while (cb < buffer.length) {
            if (this.map) frame.push(this.map[buffer.readUInt8(cb)]);
            else frame.push(buffer.readUInt8(cb));
            
            if (this.scale)
                frame = frame.map(function (s, ix) {return s * self.scale[ix];});

            if (frame.length == this.sizeS)
            {
                callback(frame);
                frame = [];
                cb -= (this.sizeS - this.stepS);
            }
            cb++;
        }
    }
};

module.exports = Framer;
