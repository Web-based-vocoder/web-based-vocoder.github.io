/* Vocoder AudioWorklet Processor

 - Overlap and Add:
  -- Make frames (current and previous) out of the blocks of the 128 samples
  -- Add frames to produce output


*/
import * as LPC from './LPC.js';
import { Resampler } from './resample.js';

class Vocoder extends AudioWorkletProcessor {

  // currentFrame, currentTime and sampleRate are global variables of AudioWorkletProcessor
  // currentFrame is does not give the same result as counting iterations (this._countBlock)
  constructor() {
    super();
    // Initialize parameters
    this.init(0.02);
    // Process message
    this.port.onmessage = this.handleMessage.bind(this);
  }

  // input: Frame duration in seconds
  init(frameDuration){
    // Initialize variables

    // Frame information
    // Frame duration (e.g., 0.02 s)
    const fSize = frameDuration*sampleRate;
    // Make the framesize multiple of 128 (audio render block size)
    this._frameSize = 128*Math.round(fSize/128); // Frame duration = this._frameSize/sampleRate;
    this._frameSize = Math.max(128*2, this._frameSize); // Force a minimum of two blocks

    this._numBlocksInFrame = this._frameSize/128; // 8 at 48kHz and 20ms window
    // Force an even number of frames
    if (this._numBlocksInFrame % 2){
      this._numBlocksInFrame++;
      this._frameSize += 128;
    }
    // Predefined 50% overlap
    this._numBlocksOverlap = Math.floor(this._numBlocksInFrame/2); // 4 at 48kHz and 20ms window

    // Define frame buffers
    this._oddBuffer = new Float32Array(this._frameSize); // previous and current are reused
    this._pairBuffer = new Float32Array(this._frameSize); //  previous and current are reused

    // We want to reuse the two buffers. This part is a bit complicated and requires a detailed description
    // Finding the block indices that belong to each buffer is complicated
    // for buffers with an odd num of blocks.
    // Instead of using full blocks, half blocks could be used. This also adds
    // another layer of complexity, so not much to gain...
    // Module denominator to compute the block index
    this._modIndexBuffer = this._numBlocksInFrame + this._numBlocksInFrame % 2; // Adds 1 to numBlocksInFrame if it's odd, otherwise adds 0

    // Count blocks
    this._countBlock = 0;

    // Computed buffers
    this._oddSynthBuffer = new Float32Array(this._frameSize);
    this._pairSynthBuffer = new Float32Array(this._frameSize);

    console.log("Frame size: " + this._frameSize +
          ". Set frame length: " + this._frameSize/sampleRate + " seconds" +
          ". Blocks per frame: " + this._numBlocksInFrame +
          ". Blocks overlap: " + this._numBlocksOverlap);




    // LCP variables
    this._lpcOrder = 20;
    // LPC filter coefficients
    this._lpcCoeff = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    // LPC k coefficients
    this._kCoeff = [];
    // Filter samples
    this._prevY = [];
    // Quantization
    this._quantOpt = false;
    this._quantBits = 2;
    // Reverse K's
    this._reverseKOpt = false;
    // Perfect synthesis
    this._perfectSynthOpt = false;

    // resampling before analysis
    this._resamplingFactor = 1;
    this._resampler = new Resampler(this._frameSize, this._resamplingFactor);
    // Unvoiced mix (adds noise to the perfect excitation signal)
    this._unvoicedMix = 0;
    // Pitch factor (modifies this._fundFreq)
    this._pitchFactor = 1;
    // Vibrato effect (modifies this._fundFreq)
    this._vibratoEffect = 0;



    // Synthesis
    // Create impulse signal
    this._oldTonalBuffer = new Float32Array(this._frameSize/2);
    this._excitationSignal = new Float32Array(this._frameSize);
    this._errorBuffer = new Float32Array(this._frameSize);
    this._mixedExcitationSignal = new Float32Array(this._frameSize);

    // autocorrelation indices for fundamental frequency estimation
    this._lowerACFBound = Math.floor(sampleRate / 200); // 200 Hz upper frequency limit -> lower limit for periodicity in samples
    this._upperACFBound = Math.ceil(sampleRate / 70); // 70 Hz lower frequency limit -> upper limit

    // excitation variables
    this._tonalConfidence = 0.5;
    this._confidenceTonalThreshold = 0.1;
    this._periodFactor = 1;

    // buffer for fundamental period estimation
    this._fundPeriodLen = this._upperACFBound - this._lowerACFBound;
    this._fundPeriodBuffer = [];
    this._oldPeriodSamples = this._upperACFBound;
    this._pulseOffset = 0;




    // Debug
    // Timer to give updates to the main thread
    this._lastUpdate = currentTime;
    // Block info
    this._block1 = new Float32Array(128);
    this._block2 = new Float32Array(128);

  }


  // Receive messages from main thread
  handleMessage(e){

    console.log("received message with id: ", e.data.id, "; message was: ", e);

    switch (e.data.id) {

    case "quantization":
      this._quantOpt = e.data.quantOpt;
      this._quantBits = e.data.quantBits;
      break;

    case "reverseK":
      this._reverseKOpt = e.data.reverseKOpt;
      break;

    case "perfectSynth":
      this._perfectSynthOpt = e.data.perfectSynthOpt;
      break;

    case "resampling":
      this._resamplingFactor = e.data.resampFactor;
      this._resampler.update(this._resamplingFactor);
      break;

    case "voicedThreshold":
      this._confidenceTonalThreshold = e.data.voicedThreshold;
      break;

    case "pitchFactor":
      this._pitchFactor = e.data.pitchFactor;
      break;

    case "voiceMap":
      // Voiced / Unvoiced Synthesis
      this._unvoicedMix = e.data.unvoicedMix;
      this._confidenceTonalThreshold = e.data.voicedThreshold;
      // Resampling (vocal tract length)
      if (e.data.vocalTractFactor != this._resamplingFactor){
        this._resamplingFactor = e.data.vocalTractFactor;
        this._resampler.update(this._resamplingFactor);
      }
      // Pitch modifier
      this._pitchFactor = e.data.pitchFactor;
      // Vibrato
      //e.data.vibratoEffect;
      break;

    case "options":
      // Receive all options
      this._perfectSynthOpt = e.data.perfectSynthOpt;
      this._quantOpt = e.data.quantOpt;
      this._quantBits = e.data.quantBits;
      this._reverseKOpt = e.data.reverseKOpt;
      if (e.data.vocalTractFactor != this._resamplingFactor){
        this._resamplingFactor = e.data.vocalTractFactor;
        this._resampler.update(this._resamplingFactor);
      }
      this._confidenceTonalThreshold = e.data.voicedThreshold;
      this._pitchFactor = e.data.pitchFactor;
      break;


    default: // any unknown ID: log the message ID
      console.log("unknown message received:")
      console.log(e.data)
    }
  }


  createTonalExcitation(periodSamples, errorRMS){

    // first put old half, then zeros
    for (let i=0; i<this._frameSize/2; i++) {
      this._excitationSignal[i] = this._oldTonalBuffer[i];
    }
    for (let i=this._frameSize/2; i<this._frameSize; i++) {
	this._excitationSignal[i] = 0;
    }
    // index for offset computation
    let lastIndex = 0;

    // now create pulse train with given period
    for (let i=this._pulseOffset; i<this._frameSize; i+=periodSamples){
      this._excitationSignal[i] = 1;
      lastIndex = i;

      //if (i+1 < this._frameSize) // Does this make sense?
        //this._excitationSignal[i+1] = -1;
    }
    // new offset (should be an index of the second half of the block)
    this._pulseOffset = lastIndex - this._frameSize/2 + periodSamples;

    // save second half for next block
    for (let i=0; i<this._frameSize/2; i++){
      this._oldTonalBuffer[i] = this._excitationSignal[i+this._frameSize/2];
    }
    // compute RMS of pulse train
    this._excitationSignalRMS = this.blockRMS(this._excitationSignal);
    let scaleFactor = errorRMS / this._excitationSignalRMS;

    // scale each impulse to desired RMS
    for (let i=0; i<this._frameSize; i++){
      this._excitationSignal[i] = this._excitationSignal[i] * scaleFactor;
    }

    return this._excitationSignal;
  }


  createNoiseExcitation(errorRMS){

    let r1 = 0;
    let r2 = 0;

    for (let i=0; i<this._frameSize; i=i+2) {
      // draw two independent samples from unit distribution in interval [0,1]
      r1 = Math.random();
      r2 = Math.random();

      // perform the Box-Muller transform:
      // the normal distributed value is given by the angle (cos/sin part) randomly set by first sample
      // and scaled via the second sample -> result standard normally distributed values
      // we get two independent samples from this!
      this._excitationSignal[i] = Math.sqrt(-2.0 * Math.log(r1)) * Math.cos(2.0 * Math.PI * r2);
      this._excitationSignal[i+1] = Math.sqrt(-2.0 * Math.log(r1)) * Math.sin(2.0 * Math.PI * r2);
    }

        // compute RMS of pulse train
    this._excitationSignalRMS = this.blockRMS(this._excitationSignal);
    const scalingFactor = errorRMS * this._excitationSignalRMS;

    // scale each impulse to desired RMS
    for (let i=0; i<this._frameSize; i++){
      this._excitationSignal[i] = this._excitationSignal[i] * scalingFactor;
    }
    // reset offset for tonal excitation
    this._pulseOffset = 0

    return this._excitationSignal;
  }


  // This is only used in the 2D Voice Map when the error signal is used for synthesis
  createMixedExcitation(periodSamples, errorRMS) {

    this._mixedExcitationSignal = this._errorBuffer;
    this._excitationSignal = this.createNoiseExcitation(errorRMS);
    for (let i=0; i<this._frameSize; i++){
      this._excitationSignal[i] = (1-this._unvoicedMix) * this._mixedExcitationSignal[i] + this._unvoicedMix * this._excitationSignal[i];
    }
    return this._excitationSignal;
  }


  // Fill buffers
  processBlock(outBlock, inputBlock) {

    /*
    Example of frames of made of 5 blocks
      O O O O O -- blockPair
            0 0 0 0 0 -- blockOdd
                  O O O O O -- blockPair
                        0 0 0 0 0

      0 1 2 3 4 - time, i.e. block count (blockPair)
            3 4 5 6 7 - time, i.e. block count (blockOdd)
            0 1 2 3 4 - ind blockOdd
    */
    // Get block index for the pair buffer
    let indBlockPair = this._countBlock % this._modIndexBuffer;
    // Assign block to the pair buffer
    if (indBlockPair <= this._numBlocksInFrame) // Only applies for odd numBlocksInFrame (a block is assigned to a single buffer only in the middle of the frame)
      this._pairBuffer.set(inputBlock, 128*indBlockPair);

    // Get block index for the odd buffer
    let indBlockOdd = (indBlockPair + this._modIndexBuffer/2) % this._modIndexBuffer;
    // Assign block to the buffer
    if (indBlockOdd <= this._numBlocksInFrame) // Only applies for odd numBlocksInFrame (a block is assigned to a single buffer only in the middle of the frame)
      this._oddBuffer.set(inputBlock, 128*indBlockOdd);

    // Get the output block from the mix of pairSynthBuff and oddSynthBuff
    this.synthesizeOutputBlock(outBlock);


    // Synthesize buffers -- Do modifications on the buffers (vocoder goes here)
    // A synth buffer is only modified when a buffer is filled with new blocks
    this.synthesizeBuffer(indBlockPair, this._pairBuffer, this._pairSynthBuffer);
    this.synthesizeBuffer(indBlockOdd, this._oddBuffer, this._oddSynthBuffer);
  }




  // Synthesize buffer
  synthesizeBuffer(indBlock, buffer, synthBuffer) {
    // Only synthesize when it is filled
    if (indBlock == this._numBlocksInFrame - 1){

      //this.bypass(buffer, synthBuffer);
      //ema(buffer, synthBuffer);
      synthBuffer = this.LPCprocessing(buffer, synthBuffer);

    }
  }


  LPCprocessing(inBuffer, outBuffer){


    if (this._resamplingFactor != 1) {
      this._resampler.resampBuffer = this._resampler.resampleLinear(inBuffer, this._frameSize, this._resamplingFactor);
      LPC.calculateLPC(this._resampler.resampBuffer, this._lpcOrder, this._lpcCoeff, this._kCoeff);
      // Calculate error signal
      LPC.calculateErrorSignal(this._resampler.resampBuffer, this._lpcCoeff, this._errorBuffer);
    } else {
      // Getting the a coefficients and k coefficients
      // The a coefficients are used for the filter
      LPC.calculateLPC(inBuffer, this._lpcOrder, this._lpcCoeff, this._kCoeff);
      // Calculate error signal
      LPC.calculateErrorSignal(inBuffer, this._lpcCoeff, this._errorBuffer);
    }


    // Quantazie LPC coefficients if selected
    if (this._quantOpt)
      this.quantizeLPC(this._lpcCoeff, this._kCoeff, this._quantBits);

    // Reverse K's
    if (this._reverseKOpt)
      this.reverseKCoeff(this._lpcCoeff, this._kCoeff);






    this._rms = this.blockRMS(this._errorBuffer);

    // longer vocal tract -> less fundamental period
    let periodSamples = Math.round(this._periodFactor * this.autocorrPeriod(inBuffer));

    this._fundFreq = sampleRate / periodSamples;

    // Pitch modifications
    // Modify fundamental frequency
    this._fundFreq = this._fundFreq * this._pitchFactor;
    periodSamples = Math.round(sampleRate / this._fundFreq);


    if (this._perfectSynthOpt) {
      this.createMixedExcitation(periodSamples, this._rms);

    } else {
      // decide whether to use periodic or noise excitation for the synthesis
      if (this._tonalConfidence > this._confidenceTonalThreshold) {
	this.createTonalExcitation(periodSamples, this._rms);
	//this.createErrorBasedExcitation(this._errorBuffer, periodSamples, this._rms);
      } else {
	this.createNoiseExcitation(this._rms);
      } // both write on this._excitationSignal
    }
    this._oldPeriodSamples = periodSamples;


    // Perfect excitation
    //if (this._perfectSynthOpt)
    //  this._excitationSignal = this._errorBuffer.slice();


    // IIR Filter
    LPC.IIRFilter(this._excitationSignal, this._lpcCoeff, outBuffer);


    return outBuffer;
  }



  autocorrPeriod(inBuffer) {

    for (let i=0; i<this._fundPeriodLen; i++) {
      this._fundPeriodBuffer[i] = 0;
    }

    for (let shift = this._lowerACFBound; shift<this._upperACFBound; shift++){
      this._fundPeriodBuffer[shift-this._lowerACFBound] = LPC.autoCorr(inBuffer, shift);
    }
    // partially stolen from https://stackoverflow.com/questions/11301438/return-index-of-greatest-value-in-an-array
    let maxIdx = this._lowerACFBound + this._fundPeriodBuffer.indexOf(Math.max(...this._fundPeriodBuffer));

    // compute the "confidence" that a block even has tonal excitation (for switching to noise excitation if not)
    this._tonalConfidence = LPC.autoCorr(inBuffer, maxIdx) / LPC.autoCorr(inBuffer, 0);

    return maxIdx;
  }


  blockRMS(inBuffer) {
    let squaredSum = 0;
    for (let i = 0; i < inBuffer.length; i++){
      squaredSum += inBuffer[i] * inBuffer[i];
    }
    let meanValue = squaredSum / inBuffer.length;
    let rmsValue = Math.sqrt(meanValue);

    return rmsValue;
  }


  // Quantize K coeficients
  // TODO: it gives the same result as matlab, but there are errors at lower bit rates??
  quantizeLPC(lpcCoeff, kCoeff, numBits){
    let M = lpcCoeff.length-1;
    // Quantize Ks
    for (let i = 0; i< M; i++){
      kCoeff[i] = this.quantizeK(kCoeff[i], numBits);
    }
    // recalculate LPC
    return LPC.recalculateLPC(lpcCoeff, kCoeff);
  }

    // Quantize K's
  quantizeK(k, numBits){
    let steps = Math.pow(2, numBits)-1; // e.g. 4 steps -1 to 1 --> 0 -- 1 * 3
    let qK = ((k+1)/2)*steps; // Transform to range 0 to (2^bits -1) e.g. 0 -- 3
    qK = Math.round(qK)/steps; // Quantize and scale down (range 0 to 1) e.g. (0 1 2 3 )/3 = 0 to 1
    qK = qK*2 - 1; // Transform to range -1 to 1

    return qK;
  }


  // Reverse K coefficients
  reverseKCoeff(lpcCoeff, kCoeff){
    kCoeff.reverse();
    // Recalculate K's
    return LPC.recalculateLPC(lpcCoeff, kCoeff);
  }






  // Bypass. Checks for overlap and add artifacts
  bypass(inBuffer, outBuffer){
    for (let i = 0; i < inBuffer.length; i++){
        outBuffer[i] = inBuffer[i];
      }
  }

  // Exponential Moving Average filter. Needs last sample of the previous synth buffer
  ema (inBuffer, outBuffer){
    for (let i = 0; i < inBuffer.length; i++){
      // Smooth, EMA
      if (i == 0){// Skip first sample (Or take it from previous buffer?)
        outBuffer[i] = inBuffer[i];
      } else {
        outBuffer[i] = inBuffer[i]*0.01 + outBuffer[i-1]*0.99;
       }
    }
  }






  // Windowing and mixing odd and pair buffers
  synthesizeOutputBlock(outBlock) {

    // Get block index for pair and odd buffers
    /*
    We want to get X: the current block to mix
     0 0 0 X 0        --> Pair block
           X O O O O  --> Odd block
     o o o x ...      --> Synthesized block (outBlock)
    */


    let indBlockPair = this._countBlock % this._modIndexBuffer;
    let indBlockOdd = (indBlockPair + this._modIndexBuffer/2) % this._modIndexBuffer;

    // TODO: Right now this only works for 50% overlap and an even number of blocks per frame.
    // More modifications would be necessary to include less than 50% overlap and an odd number of blocks per frame. Right now an amplitude modulation would appear for an odd number of blocks per frame (to be tested - AM from 1 to 0.5).

    // Iterate over the corresponding block of the synthesized buffers
    for (let i = 0; i<outBlock.length; i++){
      let indPair = i + 128*indBlockPair;
      let indOdd = i + 128*indBlockOdd;

      // Hanning window
      // Use hanning window sin^2(pi*n/N)
      let hannPairBValue = Math.pow(Math.sin(Math.PI*indPair/this._frameSize), 2);
      let hannOddBValue = Math.pow(Math.sin(Math.PI*indOdd/this._frameSize), 2);
      //let hannPairBValue = 0.54 - 0.46 * Math.cos(2*Math.PI*indPair/(this._frameSize-1));
      //let hannOddBValue = 0.54 - 0.46 * Math.cos(2*Math.PI*indOdd/(this._frameSize-1));
      // Hanning windowed frames addition
      outBlock[i] = hannPairBValue*this._pairSynthBuffer[indPair] + hannOddBValue*this._oddSynthBuffer[indOdd];

      // Debugging
      //outBlock[i] = this._pairBuffer[i];//this._pairSynthBuffer[indPair];//0.5*this._pairSynthBuffer[indPair] + 0.5*this._oddSynthBuffer[indOdd];
      this._block1[i] = this._pairSynthBuffer[indPair];
      this._block2[i] = this._oddSynthBuffer[indOdd];
    }

  }



  // Main function
  process(inputs, outputs) {
    // By default, the node has single input and output.
    const input = inputs[0];
    const output = outputs[0];

    // return false if no inputs exists (this is specified in the AudioWorkletProcessor interface documentation)
    if (input.length == 0) {
      console.log("input length is zero! no processing possible.");
      return false;
    }

    for (let channel = 0; channel < output.length; ++channel) {

      const inputChannel = input[channel];
      const outputChannel = output[channel];
      //for (let i = 0; i < inputChannel.length; ++i){
        // Distortion
        //outputChannel[i] = inputChannel[i];//Math.max(-1, Math.min(1,inputChannel[i]*5)) ; // Amplify and clamp
      //}

      // Process block
      this.processBlock(outputChannel, inputChannel);
    }

    this._countBlock++;


    // Send to main thread the buffers every frame
    if (this._countBlock  % this._modIndexBuffer == this._numBlocksInFrame-1){
      this.port.postMessage({
        buffer: this._oddSynthBuffer.slice(),
        bufferPair: this._pairSynthBuffer.slice(),
        pairBlock: this._block1.slice(),
        oddBlock: this._block2.slice(),
        lpcCoeff: this._lpcCoeff.slice(),
        kCoeff: this._kCoeff.slice(),
        blockRMS: this._rms,
        fundamentalFrequencyHz: this._fundFreq,
        tractStretch: this._resamplingFactor,
        excitationSignal: this._excitationSignal,
        errorSignal: this._errorBuffer,
      });

    }


    // Send data
    // Post a message to the node for every 1 second.
    if (currentTime - this._lastUpdate > 1.0) {
      this.port.postMessage({
        message: 'Update',
        contextTimestamp: currentTime,
        currentFrame: currentFrame,
        currentBlock: this._countBlock,
        buffer: this._oddSynthBuffer.slice(),
        bufferPair: this._pairSynthBuffer.slice(),
        pairBlock: this._block1.slice(),
        oddBlock: this._block2.slice(),
        lpcCoeff: this._lpcCoeff.slice(),
        kCoeff: this._kCoeff.slice(),
        blockRMS: this._rms,
        fundamentalFrequencyHz: this._fundFreq,
        tractStretch: this._resamplingFactor,
        tonalConfidence: this._tonalConfidence,
	excitationSignal: this._excitationSignal,
        errorSignal: this._errorBuffer,
      });
      this._lastUpdate = currentTime;
    }


    return true;
  }


}

registerProcessor('vocoder', Vocoder);
