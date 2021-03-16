// Basic resampling class for speech processing
// Developed by Gerard Llorach and Mattes Ohlenbusch
// 2020

class Resampler {

  constructor(new_framesize, new_factor) {

    // default values
    let framesize = new_framesize || 256;
    let factor = new_factor || 1;

    this.init(framesize, factor);
    this.update(factor);
  }

  init(frameSize, factor) {
    // only happens once

    this.framesize = frameSize;
    this.resampFactor = factor;

    this.filterB = [1,0,0];
    this.filterA = [1,0,0];

    this.xBuff = [0, 0, 0];
    this.yBuff = [0, 0];

    this.filteredBuffer = new Float32Array(this.framesize);
    this.resampBuffer = new Float32Array(Math.round(this.framesize * this.resampFactor));
    this.storageBuffer = new Float32Array(Math.round(this.framesize * 2));

  }


  clearResampBuffer() {

    for (var i=0; i<this.resampBuffer.length; i++){
      this.storageBuffer[i] = this.resampBuffer[i];
    }
    let newFramesize = Math.round(this.framesize * this.resampFactor);

    if (this.resampFactor > 1){
      newFramesize -= 1; // this is a cheap workaround but it doesnt matter so much for LPC analysis, right?
    }
    this.resampBuffer = this.storageBuffer.slice(0, newFramesize-1);
  }


  update(factor) {
    // this function should be called on every change of the resampling factor for the vocal tract length
    this.resampFactor = factor;
    this.clearResampBuffer();
    this.designAntiAliasLowpass(factor, this._resampFiltB, this._resampFiltA); // B transversal, A recursive coefficients
  }


  designAntiAliasLowpass(resamplingFactor, resampFiltB, resampFiltA){

    if (resamplingFactor >= 1){
      // 'neutral' filter that does nothing
      resampFiltB = [1, 0, 0];
      resampFiltA = [1, 0, 0];

    } else {
      // parametric lowpass filter design taken from RBJ's audio EQ cookbook. also helpful: http://aikelab.net/filter/
      const omega = Math.PI * resamplingFactor * 0.75; // w = 2*pi*f/fs
      const Q = 2.0;//0.95; // almost no resonance peak since we dont want to influence formant structure
      const sin_om = Math.sin(omega);
      const cos_om = Math.cos(omega);
      const alpha = sin_om / (2.0 * Q);

      const a0 = 1.0 + alpha; // only used for scaling, set to 1 later
      const a1 = -2.0 * cos_om / a0;
      const a2 = (1.0 - alpha) / a0;
      const b0 = (1.0 - cos_om) / 2.0 / a0;
      const b1 = (1.0 - cos_om) / a0;
      const b2 = (1.0 - cos_om) / 2.0 / a0;

      resampFiltB = [b0, b1, b2];
      resampFiltA = [1, a1, a2];
    }
  }


  resampleLinear(inBuffer, origFramesize, resamplingFactor, resamplingBuffer) {

    this.resampBuffer = resamplingBuffer || this.resampBuffer;

    // first filter with biquad lowpass at the new nyquist rate
    this.filteredBuffer = this.filterBiquad(this.filterB, this.filterA, inBuffer, this.filteredBuffer);

    let oldStep = 0;
    let l_idx = 0;
    let r_idx = 0;
    let x_left = 0;
    let x_right = 0;
    let y_left = 0;
    let y_right = 0;

    for (let x_new=0; x_new<this.resampBuffer.length; x_new++) {

      // new steps are integer indices, old steps are related to this via the inverse resampling factor
      oldStep = x_new / resamplingFactor;

      // use the neighbouring integer indices of the old samplerate
      // (if identical the sample should be used twice and the result should be equal to this value)
      l_idx = Math.floor(oldStep);
      r_idx = Math.ceil(oldStep);

      if (l_idx === r_idx){
	this.resampBuffer[x_new] = this.filteredBuffer[l_idx];
      } else{
	x_left = l_idx * resamplingFactor;
	x_right = r_idx * resamplingFactor;
	y_left = this.filteredBuffer[l_idx];
	y_right = this.filteredBuffer[r_idx];

	this.resampBuffer[x_new] = (y_left * (x_right - x_new) + y_right * (x_new - x_left)) / (x_right - x_left);
      }
    }
    return this.resampBuffer;
  }


  filterBiquad(coeffB, coeffA, inBuffer, outBuffer){

    // create buffer for output and temp values saved inbetween
    for (let i=0; i<inBuffer.length; i++){

      // update x-Buffer
      this.xBuff.unshift(inBuffer[i]); // add new entry to the beginning
      this.xBuff.pop(); // remove last entry

      // compute one sample of the output
      outBuffer[i] = coeffB[0] * this.xBuff[0] + coeffB[1] * this.xBuff[1] + coeffB[2] * this.xBuff[2] - coeffA[1] * this.yBuff[0] - coeffA[2] * this.yBuff[1];

      // update y-Buffer
      this.yBuff.unshift(outBuffer[i]);
      this.yBuff.pop();
    }
    return outBuffer;
  }

}

export { Resampler };
