## Chapter 3. Voice synthesis

### Voiced and unvoiced threshold
According to the vocal tract model, voiced sounds (vowels and nasal consonants, e.g., /m/ and /n/) can be synthesized with a tonal excitation signal, and unvoiced sounds (consonants) with white noise. We use the autocorrelation to detect if a sound is voiced or unvoiced. With the autocorrelation, we are checking how periodic is a signal. An explanation of the function is given in [Chapter 2](Chapter%202.%20LPC%20coefficients.md). In our implementation we calculate a normalized tonal confidence. To compute it, the maximum autocorrelation value given a certain delay (`maxIdx`) is divided by the autocorrelation at zero delay:

```javascript
// "Confidence" that a block has tonal excitation (for switching to noise excitation if not)
var tonalConfidence = this.autoCorr(inBuffer, maxIdx) / this.autoCorr(inBuffer, 0);
```
 The computation of the `maxIdx` is explained in the following section (Estimation of the fundamental frequency). After some testing, we saw that the tonal confidence ranged from 0.4 to 0.7 for voiced sounds and did not go higher than 0.3 for consonants. In our application, we let the user define manually the voiced/unvoiced threshold. This way, the user can control if the excitation signal is tonal, noisy or a mix that depends on the threshold.

### Estimation of the fundamental frequency
In order to model tonal excitation of the vocal tract, an estimate of the fundamental frequency is required. For a fixed excitation period, the pulse-train excited synthesized signal sound very monotonous. Therefore, it leads to a qualitative improvement when for each block the fundamental frequency is estimated and the pulse-train signal is generated accordingly. This will be true mainly for tonal/voiced speech components.

An efficient way to estimate the fundamental frequency of speech is the autocorrelation method. For a periodic signal, its autocorrelation will display the same periodicity as the signal at the autocorrelation shift in samples corresponding to the period of the signal. Since for human speech, the fundamental frequency is in most cases within the range of 70 to 200 Hz, the range in which an autocorrelation peak is searched for can be limited to the range of equivalent shifts. They are computed by the following code:
```javascript
// 200 Hz upper frequency limit -> lower limit for periodicity in samples
this._lowerACFBound = Math.floor(sampleRate / 200);

// 70 Hz lower frequency limit -> upper limit
this._upperACFBound = Math.ceil(sampleRate / 70); 
```
As can be seen, the autocorrelation shifts are the inverse of the corresponding periods, and scaled to the sampling rate used in the processing scheme. Based on these boundaries we can search for the maximum of the frame-wise autocorrelation:
```javascript
for (let shift = this._lowerACFBound; shift<this._upperACFBound; shift++){
  this._fundPeriodBuffer[shift-this._lowerACFBound] = this.autoCorr(inBuffer, shift);
}
let maxIdx = this._lowerACFBound + this._fundPeriodBuffer.indexOf(Math.max(...this._fundPeriodBuffer));
```
Note that only the relevant values of the autocorrelation function need to be computed. In javascript, the `...` denotes the spread operator. This operation is necessary because the `Math.max()` function does not generalize to array type variables as well as in higher-level languages such as Matlab or Python, which natively support array operations. The expression `Math.max(...acfBuff)` is then equivalent to `Math.max(acfBuff[0], acfBuff[1], acfBuff[2] /*and so on*/)`.

The maxIdx is the period in samples. From this value, we can obtain the fundamental frequency of the voice:
```javascript
let periodSamples = maxIdx;
let fundFrequency = sampleRate / periodSamples; 
```

### The excitation signal

#### Tonal excitation
In order to generate voiced sounds, we can generate a pulse-train signal. The pulse-train signal defines the pitch and can look like this: 1, -1, 0, 0, 0, ... , 0, 0, 1, -1, 0, 0, 0... The tonal excitation is then generated based on the resulting period `periodSamples` for a single frame as follows:
```javascript
for (let i=this._pulseOffset; i<this._frameSize; i+=periodSamples){
  this._excitationSignal[i] = 1;
  if (i+1<this._frameSize)
    this._excitationSignal[i+1] = -1;
}
this._pulseOffset = lastIndex + periodSamples - this._frameSize;
```
The offset from the last pulse is saved in order to prevent inconsistencies inbetween block transitions, which could potentially result in clicks. Not shown is the normalization to the same RMS value per block as the error signal, so that the resulting synthesis signals has approximately the same energy per block as the original signal.
This approach is very useful in terms of processing time required, as only a part of the autocorrelation values are used within the peak search; also, within the linear prediction routine the autocorrelation is computed already. The high efficiency comes with a disadvantage however: Since it is limited to maxima of the sample-wise autocorrelation, there will a higher precision for lower frequencies (larger fundamental periods) than for high fundamental frequencies (short periods) as the grid on which the fundamental period is searched is related to the potential fundamental frequencies by inversion.

#### Noise excitation
The consonants can be modelled using filtered noise. Whispered speech can also be modelled using noise, as there is no glottal excitation. We generated white noise using the `Math.random()` function.

#### Residual error excitation
Using the principles of LPC, the speech signal can be perfectly reconstructed with the error/residual signal and the LPC coefficients. This error signal can be obtained by convolving the LPC coefficients and the input signal. The code looks like this:

```javascript
// Convolve the LPC coefficients with the frame buffer (inBuffer in the code)
for (let i = 0; i< inBuffer.length; i++){
  for (let j = 0; j<M+1; j++){
    in_idx = i + j;
    if (in_idx >= inBuffer.length){ // Resolve out of bounds
      continue;
    }
    errorBuffer[i] += inBuffer[in_idx]*this._lpcCoeff[j]; // a[0]*x[0] + a[1]*x[n-1] + a[2]*x[n-2] ... + a[M]*x[n-M]
  }
}
```

This error signal looks like the tonal excitation when the sounds are voiced and like noise when the sounds are unvoiced. The tonal and noise excitation are basically approximating how the error signal looks. Using this signal we can reconstruct the original speech signal.

#### Gain and volume
Calculating the error signal is necessary to be able to apply the correct gain to the excitation signals (tonal and noise). The RMS of the error signal gives us information about the energy that the excitation signal should have. Therefore, in the case of the tonal and noise excitation, we need to normalize the RMS of the excitation signal to match the RMS of the error signal. 

### Using the LPC coefficients to filter an excitation signal
A speech signal can be synthesized by filtering an excitation signal and the LPC coefficients, based on the vocal tract model. The Web Audio API provides a filter node, the IIRFilterNode (https://www.w3.org/TR/webaudio/#iirfilternode). Unfortunately, the IIR filter defines the coefficients on its creation, and it is not designed to change the coefficients dynamically. As the Web Audio API says: "Once created, the coefficients of the IIR filter cannot be changed". An option would be to create a new IIRFilterNode for every frame, but that would be an overkill for the app (probably leading to garbage collector problems?). Therefore, we implemented the filter manually.

An IIR filter with feedback coefficients (our LPC coefficients) has the form of:
```javascript
y[n] = b[0]*x[n]/a[0] - a[1]*y[n-1] - a[2]*y[n-2] ... - a[M]*y[n-M]
```
where "y[n]" is the filtered signal, "x[n]" is the input signal, "b" are the feedforward coefficients and "a" are the feedback coefficients. In our case, "b[0]" and "a[0]" are 1.
```javascript
y[n] = b[0]*x[n]/a[0] - a[1]*y[n-1] - a[2]*y[n-2] ... - a[M]*y[n-M]
```
Our filter implementation looks like this:
```javascript
// Create array for y[n] and initialize with zeros
let y_prev = []; 
for (let i=0; i< M; i++){// As many zeros as M;
  y_prev[i] = 0;
}

// Filter the signal
// Iterate for each sample. O(fSize*M)
for (let i = 0; i< inBuffer.length; i++){
  outBuffer[i] = this._excitationSignal[i]; // x[n]
  for (let j = 1; j<M+1; j++){
    outBuffer[i] -= y_prev[M-j]*this._lpcCoeff[j]; // - a[1]*y[n-1] - a[2]*y[n-2] ... - a[M]*y[n-M]
  }
  y_prev.shift(1); // Deletes first element of array
  y_prev.push(outBuffer[i]); // Adds a new element at the end of the array
}

return outBuffer
```
___

[Next chapter](Chapter%204.%20Voice%20transformations.md)

[Back to main](../README.md)
