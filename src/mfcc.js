/*===========================================================================*\
 * Experimental implementation of MFCC.
 * (c) Vail Systems. Joshua Jung and Ben Bryan. 2015
 *
 * This code is not designed to be highly optimized but as an educational
 * tool to understand the Mel-scale and its related coefficients used in
 * human speech analysis.
\*===========================================================================*/
module.exports = {
    cosMap: null,
    options: {},
    lifterLinear: function (scalar, ix) {
      return scalar * ix;
    },
    // Builds a cosine map for the given block size. This allows multiple block sizes to be
    // memoized automagically.
    memoize: function(blockSize) {
      this.cosMap = this.cosMap || {};
      this.cosMap[blockSize] = new Array(blockSize * 12);

      for (var i = 0; i < 12; i++) {
        for (var m = 0; m < blockSize; m++) {
          this.cosMap[blockSize][m + (i * blockSize)] = Math.cos(Math.PI * ((i+1) / blockSize) * (m + 0.5));
        }
      }
    },
    dct: function(spectrum) {
      var L = spectrum.length;

      if (!this.cosMap || !this.cosMap[L]) this.memoize(L);

      // Discrete Cosine Transform is O(n*m) where:
      // n: number of MFCC bins
      // m: number of Spectrum bins
      // Usually n == 12 and 20 <= m <= 40
      return [0,0,0,0,0,0,0,0,0,0,0,0].map(function (bin, ix) {
        var scalar = spectrum.reduce(function (prev, cur, ix, arr) {
          return prev + cur * cosTable[L][ix_ + (ix * L)];
        });

        return this.options.lifter ? this.options.lifter(scalar, ix) : scalar;
      });
    },
    /*
     * Given a set of amplitudes, estimates the power for those amplitudes.
     */
    periodogram: periodogram,
    /*
     * Converts from hertz to the Mel-scale. Used by constructFilterBank.
     *
     * Based on the concept that human perception of an equidistant pitch decreases as
     * pitch increases.
     */
    hzToMels: hzToMels,
    /*
     * Inverse of hzToMels.
     */
    melsToHz: melsToHz,
    /*
     * Returns a filter bank with nBanks triangular filters distributed according to the mel scale.
     *
     * Focused specifically on human speech (300 hz - 8000 hz)
     *
     * Recommended values for u-law 8000 hz:
     *
     *   - nFrequencies == 32 (64 bit FFT)
     *   - nBanks == 31 
     *   - Low Frequency == 200
     *   - High Frequency == 3500 
     */
    constructFilterBank: constructFilterBank,
    mfcc: function (frequencies, amplitudes) {
          }
};

function constructFilterBank(nFrequencies, nBanks, lowF, highF, sampleRate) {
    var bins = [],
        fq = [],
        filters = [];

    var lowM = hzToMels(lowF),
        highM = hzToMels(highF),
        deltaM = (highM - lowM) / nBanks;

    // Construct equidistant Mel values between lowM and highM.
    for (var i = 0; i < nBanks; i++) {
        // Get the Mel value and convert back to frequency.
        // e.g. 200 hz <=> 401.25 Mel
        fq[i] = melsToHz(lowM + (i * deltaM));

        // Round the frequency we derived from the Mel-scale to the nearest actual FFT bin that we have.
        // For example, in a 64 sample FFT for 8khz audio we have 32 bins from 0-8khz evenly spaced.
        bins[i] = Math.floor((nFrequencies+1) * fq[i] / (sampleRate/2));
    }

    // Construct one cone filter per bin.
    // Filters end up looking similar to [... 0, 0, 0.33, 0.66, 1.0, 0.66, 0.33, 0, 0...]
    for (var i = 0; i < bins.length; i++)
    {
        filters[i] = [];
        var filterRange = (i != bins.length-1) ? bins[i+1] - bins[i] : bins[i] - bins[i-1];
        filters[i].filterRange = filterRange;
        for (var f = 0; f < nFrequencies; f++) {
            // Right, outside of cone
            if (f > bins[i] + filterRange) filters[i][f] = 0.0;
            // Right edge of cone
            else if (f > bins[i]) filters[i][f] = 1.0 - ((f - bins[i]) / filterRange);
            // Peak of cone
            else if (f == bins[i]) filters[i][f] = 1.0;
            // Left edge of cone
            else if (f >= bins[i] - filterRange) filters[i][f] = 1.0 - (bins[i] - f) / filterRange;
            // Left, outside of cone
            else filters[i][f] = 0.0;
        }
    }

    // Store for debugging.
    filters.bins = bins;

    // Here we actually apply the filters one by one. Then we add up the results of each applied filter
    // to get the estimated power contained within that Mel-scale bin.
    //
    // First argument is expected to be the result of the frequencies passed to the periodogram
    // method.
    return function (freqPowers) {
       var ret = [];
       filters.forEach(function (filter, fIx) {
           var tot = 0;
           freqPowers.forEach(function (fp, pIx) {
               tot += fp * filter[pIx];
           });
           ret[fIx] = tot;
       }); 
       return ret;
    };
}

function melsToHz(mels) {
    return 700 * (Math.exp(mels / 1127) - 1);
}

function hzToMels(hertz) {
    return 1127 * Math.log(1 + hertz/700);
}

function periodogram(amplitudes) {
    var power = [],
        N = amplitudes.length;

    for (var i = 0; i < N; i++) {
       power[i] = (amplitudes[i] * amplitudes[i]) / N;
    }

    return power;
}
