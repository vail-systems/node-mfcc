/*===========================================================================*\
 * Experimental implementation of MFCC.
 * (c) Vail Systems. Joshua Jung and Ben Bryan. 2015
 *
 * This code is not designed to be highly optimized but as an educational
 * tool to understand the Mel-scale and its related coefficients used in
 * human speech analysis.
\*===========================================================================*/
var program = require('commander'),
    Stats = require('fast-stats').Stats,
    fs = require('fs'),
    fjs = require('frequencyjs'),
    wav = require('wav'),
    Framer = require('./').Framer,
    windows = require('./').windows,
    mfcc = require('./').mfcc;

var u2pcm = require('./u2pcm');
for (var k in u2pcm)
{
    u2pcm[k] = u2pcm[k] / 32767;
}

program.version('0.1')
       .usage('[options] [wav] [out]')
       .option('-v, --verbose', 'Supply to turn on verbose output. Default 0.', 0);

program.parse(process.argv);

if (program.args.length != 1)
{
    console.log('Must provide a wave file.');
    program.outputHelp();
    process.exit(1);
}

var freqAssigned = false;
    sampleRate = 8000,
    minFreq = 300,
    maxFreq = 3500,
    nMelSpecBins = 26,
    framerSamples = 64,
    framerStep = 64,
    fftBins = framerSamples / 2,
    framer = undefined,
    bins = [],
    binsStats = [],
    binsToFreq = [],
    win = windows.construct('ham', framerSamples, 0.71);

for (var i = 0; i < fftBins; i++) bins[i] = [];

var wr = new wav.Reader(),
    filterBank = mfcc.constructFilterBank(fftBins, nMelSpecBins, minFreq, maxFreq, sampleRate),
    dct = new mfcc.DCT({
        lifter: undefined, 
        numCoefficients: 12
    });

wr.on('data', function (buffer, offset, length) {
    framer.frame(buffer, function (frame, fIx) {
        var spectrum = fjs.toSpectrum(frame, {
                sampling: sampleRate, 
                method: 'fft'
            }),
            amplitudes = [];

        spectrum.forEach(function (spectra, ix) {
            if (!freqAssigned) binsToFreq[ix] = spectra.frequency;
            bins[ix].push(spectra.amplitude);
            amplitudes.push(spectra.amplitude);
        });

        console.log(spectrum);
        var freqPowers = mfcc.periodogram(amplitudes),
            melSpec = filterBank(freqPowers);

        var melCoefficients= dct.run(melSpec);
        //console.log([fIx].concat(melCoefficients).join(','));
    });
});

wr.on('format', function (format) {
    //TODO customize framer based on actual wave headers rather
    // than assuming ulaw!
    framer = new Framer({
        map: u2pcm,
        sizeS: framerSamples,
        stepS: framerStep,
        scale: win
    });
});

wr.on('end', function () {
    statistics();
    if (program.args.length == 2) writeToCSV();
    var end = new Date().getTime();
    console.log('Elapsed: ', end - start);
    console.log(binsStats);
    process.exit(1);
});

var start = new Date().getTime();
fs.createReadStream(program.args[0]).pipe(wr);

function statistics() {
    bins.forEach(function (bin, ix) {
        var s = (new Stats()).push(bin); 
        binsStats[ix] = {
            freq: binsToFreq[ix],
            amean: s.amean()
        };
    });
}

function writeToCSV() {
    
}
