/*===========================================================================*\
 * Experimental implementation of MFCC.
 * (c) Vail Systems. Joshua Jung and Ben Bryan. 2015
 *
 * This code is not designed to be highly optimized but as an educational
 * tool to understand the Mel-scale and its related coefficients used in
 * human speech analysis.
\*===========================================================================*/
var dct = require('dct');

module.exports = {
  /*
   * Given a set of amplitudes, estimates the power for those amplitudes.
   */
  powerSpectrum: powerSpectrum,
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
   * Returns a filter bank with bankCount triangular filters distributed according to the mel scale.
   *
   * Focused specifically on human speech (300 hz - 8000 hz)
   *
   * Recommended values for u-law 8000 hz:
   *
   *   - fftSize == 64 (128 bin FFT)
   *   - bankCount == 31 
   *   - Low Frequency == 200
   *   - High Frequency == 3500 
   */
  constructMelFilterBank: constructMelFilterBank,
  construct: construct
};

function construct(fftSize, bankCount, lowFrequency, highFrequency, sampleRate) {
  if (!fftSize) throw Error('Please provide an fftSize');
  if (!bankCount) throw Error('Please provide a bankCount');
  if (!lowFrequency) throw Error('Please provide a low frequency cutoff.');
  if (!highFrequency) throw Error('Please provide a high frequency cutoff.');
  if (!sampleRate) throw Error('Please provide a valid sampleRate.');

  var filterBank = constructMelFilterBank(fftSize, bankCount, lowFrequency, highFrequency, sampleRate);

  /**
   * Perform a full MFCC on a FFT spectrum.
   *
   * FFT Array passed in should contain frequency amplitudes only.
   *
   * Pass in truthy for debug if you wish to return outputs of each step (freq. powers, melSpec, and MelCoef)
   */
  return function (fft, debug) {
    if (fft.length != fftSize)
      throw Error('Passed in FFT bins were incorrect size. Expected ' + fftSize + ' but was ' + fft.length);

    var //powers = powerSpectrum(fft),
        melSpec = filterBank.filter(fft),
        melSpecLog = melSpec.map(log),
        melCoef = dct(melSpecLog).slice(0,13),
        power = melCoef.splice(0,1);

    return debug ? {
      melSpec: melSpec,
      melSpecLog: melSpecLog,
      melCoef: melCoef,
      filters: filterBank,
      power: power
    } : melCoef;

    function log(m){return Math.log(1+m);};
  }
}

function constructMelFilterBank(fftSize, nFilters, lowF, highF, sampleRate) {
  var bins = [],
      fq = [],
      filters = [];

  var lowM = hzToMels(lowF),
      highM = hzToMels(highF),
      deltaM = (highM - lowM) / (nFilters+1);

  // Construct equidistant Mel values between lowM and highM.
  for (var i = 0; i < nFilters; i++) {
    // Get the Mel value and convert back to frequency.
    // e.g. 200 hz <=> 401.25 Mel
    fq[i] = melsToHz(lowM + (i * deltaM));

    // Round the frequency we derived from the Mel-scale to the nearest actual FFT bin that we have.
    // For example, in a 64 sample FFT for 8khz audio we have 32 bins from 0-8khz evenly spaced.
    bins[i] = Math.floor((fftSize+1) * fq[i] / (sampleRate/2));
  }

  // Construct one cone filter per bin.
  // Filters end up looking similar to [... 0, 0, 0.33, 0.66, 1.0, 0.66, 0.33, 0, 0...]
  for (var i = 0; i < bins.length; i++)
  {
    filters[i] = [];
    var filterRange = (i != bins.length-1) ? bins[i+1] - bins[i] : bins[i] - bins[i-1];
    filters[i].filterRange = filterRange;
    for (var f = 0; f < fftSize; f++) {
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
  // First argument is expected to be the result of the frequencies passed to the powerSpectrum
  // method.
  return {
    filters: filters,
    lowMel: lowM,
    highMel: highM,
    deltaMel: deltaM,
    lowFreq: lowF,
    highFreq: highF,
    filter: function (freqPowers) {
      var ret = [];

      filters.forEach(function (filter, fIx) {
        var tot = 0;
        freqPowers.forEach(function (fp, pIx) {
          tot += fp * filter[pIx];
        });
        ret[fIx] = tot;
      }); 
      return ret;
    }
  };
}

function melsToHz(mels) {
  return 700 * (Math.exp(mels / 1127) - 1);
}

function hzToMels(hertz) {
  return 1127 * Math.log(1 + hertz/700);
}

/**
 * Estimate the power spectrum density from FFT amplitudes.
 */
function powerSpectrum(amplitudes) {
  var N = amplitudes.length;

  return amplitudes.map(function (a) {
    return (a * a) / N;
  });
}
