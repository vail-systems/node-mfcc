# node-mfcc
Node.JS implementation of the MFCC (Mel Frequency Cepstral Coefficients) algorithm.

# Introduction

Code in this project was made by following the tutorial here:

[http://practicalcryptography.com/miscellaneous/machine-learning/guide-mel-frequency-cepstral-coefficients-mfccs/](http://practicalcryptography.com/miscellaneous/machine-learning/guide-mel-frequency-cepstral-coefficients-mfccs/)

To compute the MFCC:

1. Frame samples into `2^N` sized buffers where `N` is an integer.
2. Pass frames into the Fast Fourier Transform to produce `F` frequency bins.
3. Perform a power pass over `F`, producing a periodogram `P`.
4. Build a triangular mel-scale filter bank with `M` filters where `M` is the number of mel bands we desire (normally `M==26`).
5. For each filter `M`, apply to `P` and then add up the results, resulting in `M` mel-scale scalars (`Ms`).
6. Perform a discrete cosine transform on `Ms` and keep the first 12 coefficients.

The 12 coefficients are the MFCC (Mel-Frequency Cepstral Coefficients)

# Concepts

The reason the term 'Cepstral' is used is that it is a play on spectral. In ordinary practice, we perform a spectral analysis on
time-domain data. However, in step (6) above we are performing a discrete cosine transform on information that is already in the 
frequency domain. As a result, the pseudo-spectral term cepstral was invented.

The reason for the discrete cosine transformation step is to both compress the mel-bands and to autocorrelate them.

# Example

Processing the MFCC for a `.wav` file:

    node mfcc.js -w test/1khz.wav

Processing the MFCC for raw FFT values:

    node mfcc.js -f fft.json

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
