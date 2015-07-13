/*===========================================================================*\
 * Experimental implementation of MFCC.
 * (c) Vail Systems. Joshua Jung and Ben Bryan. 2015
 *
 * This code is not designed to be highly optimized but as an educational
 * tool to understand the Mel-scale and its related coefficients used in
 * human speech analysis.
\*===========================================================================*/
var program = require('commander'),
  fs = require('fs'),
  path = require('path'),
  wav = require('wav'),
  fft = require('fft-js'),
  Framer = require('signal-windows').framer,
  ham = undefined,
  mfcc = require('./');

program.version('0.1')
       .usage('[options]')
       .option('-v, --verbose', 'True for verbose output.', 0)
       .option('-d, --debug [type]', '0: none, 1: Output power spectrum, post-filterbank values, and Mel coefficients. 2: output filter banks used. 3: output frequency magnitudes. Default 0.', 0)
       .option('-w, --wav [wav]', 'Wave file path to process.', undefined)
       .option('-m, --minFrequency [number]', 'Low frequency cutoff for MFCC. Default 300', 300)
       .option('-x, --maxFrequency [number]', 'High frequency cutoff for MFCC. Default 3500', 3500)
       .option('-f, --numMelSpecFilters [number]', 'Number of mel spec filter banks to use. Default is 26.', 26)
       .option('-n, --samplesPerFrame [number]', 'Number of samples per frame to pass into the FFT. Default 128.', 128)
       .option('-s, --samplesPerStep [number]', 'Number of samples to step between each frame. Default is samplesPerFrame.', 128);

program.parse(process.argv);

if (program.wav === undefined)
{
  console.log('Please provide a wave file to process.');
  program.outputHelp();
  process.exit(1);
}

program.minFrequency = parseInt(program.minFrequency);
program.maxFrequency = parseInt(program.maxFrequency);
program.numMelSpecFilters = parseInt(program.numMelSpecFilters);
program.samplesPerFrame = parseInt(program.samplesPerFrame);
program.samplesPerStep = parseInt(program.samplesPerStep);

if (program.samplesPerFrame & (program.samplesPerFrame-1) !== 0)
  throw Error('Please provide a samplesPerFrame that is a power of 2 (e.g. 32, 64, 128, 256, etc.). Was: ' + program.samplesPerFrame);

var mfcc,   // We construct after loading the wav file and reading the header.
    framer, // Framer is also constructed after loading the wav file
    sampleRate;

/*-----------------------------------------------------------------------------------*\
 * .wav file
\*-----------------------------------------------------------------------------------*/
var wr = new wav.Reader();
  
wr.on('data', function (buffer, offset, length) {
  framer.frame(buffer, function (frame, fIx) {
    if (frame.length != program.samplesPerFrame) return;

    var phasors = fft.fft(frame),
        phasorMagnitudes = fft.util.fftMag(phasors),
        result = mfcc(phasorMagnitudes, program.debug && true);

    if (program.debug == 1)
    {
      console.log('Frame ' + fIx);
      console.log('Frame ' + frame.join(','));
      console.log('FFT ' + phasorMagnitudes.join(','));
      console.log('Post-filters(' + result.melSpec.length + '): ' + result.melSpec.join(','));
      console.log('Post-filters Log(' + result.melSpecLog.length + '): ' + result.melSpecLog.join(','));
      console.log('Post-DCT: ' + result.melCoef.join(','));
    }
    else if (program.debug == 2)
    {
      console.log('Filters: ', result.filters);
    }
    else if (program.debug == 3)
    {
      console.log(phasorMagnitudes.join(','));
    }
    else if (!program.debug)
    {
      result = result.map(function (f) {return f.toFixed(4);});

      console.log(fIx + ',' + result.join(','));
    }
  });
});

wr.on('format', function (format) {

  var sampleRate = format.sampleRate;

  ham = require('signal-windows').windows.construct('ham', program.samplesPerFrame);

  var ulawMap = format.ulaw ? JSON.parse(fs.readFileSync('data/ulaw2pcm.json').toString()) : undefined;

  if (ulawMap) for (var k in ulawMap) ulawMap[k] = ulawMap[k]/32767;

  if (format.channels != 1)
    throw Error('Right now this MFCC code only works on single channel 8-bit wave files.');
  if (format.bitDepth != 8)
    throw Error('Right now this MFCC code only works on single channel 8-bit wave files.');

  // Breaks samples up into frames and runs them through a transform (map) if
  // provided. In our case we want to transform from u-law if the wave file is
  // formatted as such.
  // By default we force a 'hamming' window.
  framer = new Framer({
    map: ulawMap,
    frameSize: program.samplesPerFrame,
    frameStep: program.samplesPerStep,
    scale: ham,
    sampleType: 'UInt8'
  });

  mfcc = mfcc.construct(program.samplesPerFrame / 2,
                        program.numMelSpecFilters,
                        program.minFrequency,
                        program.maxFrequency,
                        format.sampleRate);
});

wr.on('end', function () {
  process.exit(1);
});

fs.createReadStream(program.wav).pipe(wr);
