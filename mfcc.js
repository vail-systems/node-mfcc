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
       .option('-f, --fft [json]', '[INPUT]: Supply a JSON file of FFT bins to process (primarily for testing).', undefined)
       .option('-d, --dct [json]', '[INPUT]: Supply a JSON file of inputs for the DCT stage to process (primarily for testing).', undefined)
       .option('-o, --output [csv]', 'Output CSV (will append).', undefined);

program.parse(process.argv);

if (program.wav === undefined && program.fft === undefined && program.dct === undefined)
{
    console.log('Must choose an input type from the program options.');
    program.outputHelp();
    process.exit(1);
}

if ((program.wav && program.fft) || (program.wav && program.dct) || (program.fft && program.dct))
{
    console.log('Please provide a .wav file, a .json FFT, or a .json DCT file but not more than one!');
    process.exit(1);
}

var freqAssigned = false;
    sampleRate = 8000,
    minFreq = 300,
    maxFreq = 3500,
    nMelSpecFilters = 26,
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
    var amplitudes = parseFFTAmplitudes(program.fft);

    // This filterbank, periodogram and melspec generation are an important part of the MFCC as a whole,
    // but not necessary in the testing of the DCT on its own, using the -d option.
    var filterBank = mfcc.constructFilterBank(amplitudes.length, nMelSpecFilters, minFreq, maxFreq, sampleRate);

    var freqPowers = mfcc.periodogram(amplitudes),
        melSpec = filterBank(freqPowers);

    var melCoefficients = dct.run(melSpec);

    var columns = melCoefficients.map(function (mc, ix) {
        return 'mfcc' + (ix+1); 
    });

    if (program.output)
        output(columns, [melCoefficients]);
    else
        console.log(melSpec);

    process.exit(1); 
}

/*-----------------------------------------------------------------------------------*\
 * DCT JSON file
\*-----------------------------------------------------------------------------------*/
if (program.dct)
{
    var dct = new mfcc.DCT({
        lifter: undefined,
        numCoefficients: 12
    });

    var spectrum = parseFFTAmplitudes(program.dct);

    var dctCoefficients = dct.run(spectrum);

    var columns = dctCoefficients.map(function(mc, ix) {
        return 'dct' + (ix + 1);
    });

    if (program.output) {
        output(columns, [dctCoefficients]);
    } else {
        console.log(spectrum);
    }
}


/*-----------------------------------------------------------------------------------*\
 * .wav file
\*-----------------------------------------------------------------------------------*/
if (program.wav)
{
    var wr = new wav.Reader(),
        filterBank = mfcc.constructFilterBank(fftBins, nMelSpecFilters, minFreq, maxFreq, sampleRate),
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

function parseFFTAmplitudes(fftBinFile) {
    var amplitudes = JSON.parse(fs.readFileSync(path.resolve(fftBinFile)).toString());
    return amplitudes.map(parseFloat);
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

function writeCSVHeader(columns) {
    var headers = columns.join(',');

    fs.writeFileSync(program.output, headers);
}

function output(columns, rows) {
   // First see if CSV already exists
   if (fs.existsSync(program.output))
   {
       var contents = fs.readFileSync(program.output).toString();

       if (contents.indexOf(columns[0]) == -1)
           writeCSVHeader(columns);
       // Otherwise header already exists
   }
   else 
       writeCSVHeader(columns);

   rows = rows.map(function (r) {
       return r.join(',');
   });

   rows = rows.join('\n');

   // Write out a single line of data
   fs.appendFileSync(program.output, '\n' + rows);
}
