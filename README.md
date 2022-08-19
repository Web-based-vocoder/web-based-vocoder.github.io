# Web-based vocoder with Audio Worklets and live input
Llorach*, G., Ohlenbusch*, M. and Brand T. 2021. Live Voice Transformations For Web Conferencing Using The Browser. Demo for the Web Audio Conference 2021, July 5-7. https://webaudioconf2021.com/demo-1/

*Corresponding authors.

## Description
This repository contains a simple vocoder that works with live input. The vocoder uses LPC coefficients to do voice transformations and/or visualization of the vocal tract in real-time. The output signal is synthesized with an overlap and add routine. The description of the project is organized in chapters.

This demo works only with Chrome (the only browswer that supports Audio Worklets right now?)

## Live demo
https://web-based-vocoder.github.io/

Hint: Drag and drop audio files (.wav and .mp3) at the bottom of the webpage to test it with your own files!

Video demo: https://youtu.be/5dy-rxXkHMk

## Chapters
#### [Introduction to the Web Audio API](docs/Introduction.md)
An introduction to the Web Audio API and AudioWorklets.

#### [Introduction to the speech production model](docs/speech_production_model.md)
An introduction to the speech production model and linear predictive coding (LPC).

#### [Chapter 1. Overlap and add](docs/Chapter%201.%20Overlap%20and%20add.md)
Audio blocks, buffers and frames with the Web Audio API.

#### [Chapter 2. LPC coefficients](docs/Chapter%202.%20LPC%20coefficients.md)
The LPC coefficients and the Levinson algorithm.

#### [Chapter 3. Voice synthesis](docs/Chapter%203.%20Voice%20synthesis.md)
Excitation signals, signal energy, pitch detection and filtering.

#### [Chapter 4. Voice transformations](docs/Chapter%204.%20Voice%20transformations.md)
Transformation of K coefficients (PARCOR coeff) and vocal tract length modifications.

#### [Chapter 5. Web interface](docs/Chapter%205.%20Web%20interface.md)
Canvas HTML, microphone input, drag and drop of audio files.

#### [Chapter 6. Voice map](docs/Chapter%206.%20Voice%20map.md)
2D interface for voice transformations (gender and age).

#### [Chapter 7. Visualization](docs/Visualization.md)
Vocal tract shape estimation.

#### [Known Issues](docs/KnownIssues.md)
A list of problems that come with the app.

## Future work
* 2D interface (age - gender)
  * Add Vibrato: sinusoid (vibrato) and noise (jitter). The pitch modulations are not exactly periodic, but not random either.
  * Implement pitch transformations when using the error signal (Impuse Excitation OFF).
* Manual resampling? (Audiocontext downsampling adds artifacts)
