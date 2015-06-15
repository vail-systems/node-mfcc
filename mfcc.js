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
    path = require('path'),
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
       .usage('[options]')
       .option('-v, --verbose', 'Supply to turn on verbose output. Default 0.', 0)
       .option('-w, --wav [wav]', '[INPUT]: Supply a wave file to process.', undefined)
       .option('-f, --fft [json]', '[INPUT]: Supply a JSON file of FFT bins to process (primarily for testing).', undefined);

program.parse(process.argv);

if (program.wav === undefined && program.fft === undefined)
{
    console.log('Must choose an input type from the program options.');
    program.outputHelp();
    process.exit(1);
}

if (program.wav && program.fft)
{
    console.log('Please provide either a .wav file or a .json FFT file but not both!');
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

/*-----------------------------------------------------------------------------------*\
 * FFT JSON file
\*-----------------------------------------------------------------------------------*/
if (program.fft)
{
    var dct = new mfcc.DCT({
        lifter: undefined, 
        numCoefficients: 12
    });

    // Assumes the file contains an array of FFT bins  
    var amplitudes = JSON.parse(fs.readFileSync(path.resolve(program.fft)).toString());
    amplitudes = amplitudes.map(parseFloat);

    var filterBank = mfcc.constructFilterBank(amplitudes.length, nMelSpecBins, minFreq, maxFreq, sampleRate);

    var freqPowers = mfcc.periodogram(amplitudes),
        melSpec = filterBank(freqPowers);

    var melCoefficients = dct.run(melSpec);
    console.log(melCoefficients.join(','));
    
    //console.log(jsonFFTBins.length);
    process.exit(1); 
}

/*-----------------------------------------------------------------------------------*\
 * .wav file
\*-----------------------------------------------------------------------------------*/
if (program.wav)
{
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
            //var freqPowers = mfcc.periodogram(amplitudes),
            //    melSpec = filterBank(freqPowers);

            //var melCoefficients= dct.run(melSpec);
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
}

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
