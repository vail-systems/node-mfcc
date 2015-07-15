# node-mfcc
Node.JS implementation of the MFCC (Mel Frequency Cepstrum Coefficients) algorithm.

Uses the pure Javascript implementations:

- Fast Fourier Transform, FFT-JS (https://www.npmjs.com/package/fft-js)
- Discrete Cosine Transform, DCT (https://www.npmjs.com/package/dct)

Utilizes the standard Mel Scale:

    m = 2595 log (1 + f/700)

Provides options for customizing the low and high cutoff frequency as well as specifying a custom number of Mel banks.

Note this is primarily written to be an instructional codebase, and although the mathematics is proven correct by our internal tests the code base is not optimized for production or real-time analysis.

# Introduction

Code in this project was made by following the tutorial here:

[http://practicalcryptography.com/miscellaneous/machine-learning/guide-mel-frequency-cepstral-coefficients-mfccs/](http://practicalcryptography.com/miscellaneous/machine-learning/guide-mel-frequency-cepstral-coefficients-mfccs/)

To compute the MFCC:

1. Frame samples into `N=2^X` sized buffers where `X` is an integer.
2. Pass `N` frames into the Cooley Tukey Fast Fourier Transform to produce `F=N/2` frequency bins.
3. Optionally perform a power pass `P=G(F)`.
4. Build a triangular mel-scale filter bank with `M` filters where `M` is the number of mel bands we desire.
5. For each filter `M`, apply to `P` and then add up the results, resulting in `M` mel-scale scalars (`Ms`).
6. Perform a discrete cosine transform on `Ms` and keep only the first 12 coefficients.

The 12 coefficients are the MFCC (Mel-Frequency Cepstral Coefficients).

# Concepts

The reason the term 'Cepstrum' is used is that it is a play on spectrum. In ordinary practice, we perform a spectral analysis on
time-domain data. However, in step (6) above we are performing a discrete cosine transform on information that is already in the 
frequency domain. As a result, the pseudo-spectral term cepstrum was invented.

The reason for the discrete cosine transformation step is to both compress the mel-bands and to autocorrelate them.

# Example

    var fft = require('fft-js'),
        MFCC = require('mfcc');

    // 64 Sample Signal
    var signal = [1,0,-1,0,1,0,-1,0,1,0,-1,0,1,0,-1,0,
                  1,0,-1,0,1,0,-1,0,1,0,-1,0,1,0,-1,0,
                  1,0,-1,0,1,0,-1,0,1,0,-1,0,1,0,-1,0,
                  1,0,-1,0,1,0,-1,0,1,0,-1,0,1,0,-1,0];

    // Get our 32 complex FFT Phasors
    var phasors = fft.fft(signal);

    // Get our 32 frequency magnitudes
    var mags = fft.util.fftMag(phasors);

    // Construct an MFCC with the characteristics we desire
    var mfcc = MFCC.construct(32,    // Number of expected FFT magnitudes
                              20,    // Number of Mel filter banks
                              300,   // Low frequency cutoff
                              3500,  // High frequency cutoff
                              8000); // Sample Rate (8khz)

    // Run our MFCC on the FFT magnitudes
    var coef = mfcc(mags);

    console.log(coef);

# Command Line Example

Processing the MFCC for a `.wav` file:

    node mfcc.js -w test/1khz.wav

To see all available options:

    node mfcc.js

# License

The MIT License (MIT)

Copyright (c) 2015 Vail Systems (Chicago, IL)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
