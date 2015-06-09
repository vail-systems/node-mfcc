var MFCC = function (options) {
  options = options || {};
  this.melFloor = options.melFloor || 0.00000001;
  this.cepLifter = options.cepLifter || 22.0;
  this.doLiftering = options.doLiftering || true;
  this.firstMfcc = options.firstMfcc || 1;
  this.lastMfcc = options.lastMfcc || 12;
  this.nMfcc = options.nMfcc || 12;
};

MFCC.prototype = {
  sinTable: null,
  cosTable: null,
  setupSinCosTables: function(blockSize, idxc) {
    //Build the cosine table
    cosTable = new Array(blockSize * nMfcc);
    for (var i = firstMfcc; i <= lastMfcc; i++) {
      for (var m = 0; m < blockSize; m++) {
        this.cosTable[m + (i - firstMfcc) * blockSize] = Math.cos(Math.PI * (i / blockSize) * (m + 0.5));
      }
    }
    
    //Setup sine table
    sinTable = new Array(this.nMfcc);
    if (cepLifter > 0) {
      for (var i = firstMfcc; i <= lastMfcc; i++) {
        sinTable[i - firstMfcc] = (1.0 + cepLifter / 2.0 * Math.sin(Math.PI * (i / cepLifter)))
      }
    } else {
      for (var i = firstMfcc; i <= lastMfcc; i++) {
        sinTable[i - firstMfcc] = 1.0;
      }
    }

    return 1;
  },
  computeLogMelSpec: function(src) { 
    for (var i = 0; i < src.length; i++) {
      if (src[i] < this.melFloor) {
        src[i] = Math.log(melFloor);
      } else {
        src[i] = Math.log(src[i]);
      }
    }
  },
  computeDCT: function(src) {
    //First apply the mel spec
    computeLogMelSpec(src);

    //Then compute the DCT of the mel-spec
    var factor = Math.sqrt(2.0 / src.length),
        out = [];

    for (var i = 0; i < src.length; i++) { 
      var i0 = i - firstMfcc;

      if (this.firstMfcc == 0) {
        if (i == this.lastMfcc) { i0 = 0 } else { i0 += 1 };

        var valOut = 0;

        for (var m = 0; m < this.src.length; m++) {
          valOut += src[m] * cosTable[m + i0 * src.length];
        }

        if (!doLiftering) {
          //Liftering disabled in options
          valOut *= factor;
        } else {
          //Normal, liftered behavior
          valOut *= sinTable[i0] * factor;
        }
        out.push(valOut);
      }
    }

    return out;
  }
};

module.exports = MFCC; 
