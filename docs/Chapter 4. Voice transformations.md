## Chapter 4. Voice transformations

### Manipulating the K's (lattice parameters)
When computing the LPC coefficients (aka the filter parameters), we obtain the K coefficients, also known as PARCOR coefficients. This array of k's is sufficient to recompute the LPC coefficients. We can do several modifications on the K coefficients and then recompute the modified LPC parameters, which will create some voice transformations when filtering the excitation signal.

To recompute the new LPC coefficients we implemented the following function:

```javascript
// Recalculate LPC coefficients using the new K coefficients (K coeff)
recalculateLPC(lpcCoeff, kCoeff){
  let M = lpcCoeff.length-1;
  // Recalulate coefficients
  let qLpcCoeff = [1];
  for (let m = 0; m < M; m++){
    lpcCoeff[m+1] = 0;
    for (let i = 1; i<m+2; i++){
      qLpcCoeff[i] = lpcCoeff[i] + kCoeff[m]*lpcCoeff[m+1-i];
    }
    lpcCoeff = qLpcCoeff.slice(); // Copy array values
  }
  return lpcCoeff;
}

```

#### Quantization of K's
One possible voice transformation is to quantize the K's. This is usually done to optimize voice transmission, therefore we used bits as the parameter to control the quantization steps. The number of steps equals to 2 to the power of the number of bits (2^bits). For example, using two bits leads to 4 quantization steps, and using 8 bits leads to 256 steps. In our application we created a slider that modifies the number of bits to use in the quantization in real-time.

This is the function that quantizes a given value "k" according to the number of bits. The function makes sure that the range [-1, 1] is used.

```javascript
// Quantize K's
quantizeK(k, numBits){
  let steps = Math.pow(2, numBits)-1; // e.g. 4 steps -1 to 1 --> 0 -- 1 * 3
  let qK = ((k+1)/2)*steps; // Transform to range 0 to (2^bits -1) e.g. 0 -- 3
  qK = Math.round(qK)/steps; // Quantize and scale down (range 0 to 1) e.g. (0 1 2 3 )/3 = 0 to 1
  qK = qK*2 - 1; // Transform to range -1 to 1

  return qK;
}

```


#### Reverse K's
Reversing the K's is a relatively easy operation and the voice transformation is quite effective. The array of K's needs to be swapped/reversed. Arrays in javascript have the inherent method "reverse()", which swappes the values of an array. Once the k array is swapped, the LPC coefficients need to be recalculated. The effect resembles some of the robot voices used in Star Wars first movies.


### Changing the vocal tract length
The length of the vocal tract influences the sound of individual voices. In the Tube section model of the vocal tract, this parameter has an influence on the size of individual tubes. A good explanation can be found in [Lecture 14 from UCSB](https://www.ece.ucsb.edu/Faculty/Rabiner/ece259/digital%20speech%20processing%20course/lectures_new/Lecture%2014_winter_2012.pdf). The relation can be described as
```
length = (sound_velocity * section_count) / (2 * sampling_rate).
```
In order to implement this in a block-processing scheme, a practical way is to resample individual speech blocks before LPC analysis. For a shorter vocal tract, this would correspond to a higher sampling rate, whereas downsampling would have the effect of longer tube sections.

In terms of computational efficiency, a reasonable resampling method is sample-wise linear interpolation. For a single sample, the computation depends on two values in the direct vicinity.
The following code shows the computation necessary to interpolate a sample at time `x_new` from the original samples at times `x_right` and `x_left` with values `y_right` and `y_left`, where left and right refers to the position of the samples obtained with the original sampling rate relative to `x_new`.
```javascript
newValue = (y_left * (x_right - x_new) + y_right * (x_new - x_left)) / (x_right - x_left);
```
In the case of downsampling for vocal tract elongation, it is necessary to use an anti-aliasing lowpass filter. In our implementation, the filtering is realized via a second-order-section filter (biquad filter). The coefficients are computed as follows:
```javascript
const omega = 2.0 * Math.PI * cutoff_frequency / sampling_rate;
const alpha = Math.sin(omega) / (2.0 * Q);
const a0 = 1.0 + alpha;
const a1 = -2.0 * Math.cos(omega) / a0;
const a2 = (1.0 - Math.cos(omega)) / a0;
const b0 = (1.0 - ) / 2.0 / a0;
const b1 = (1.0 - Math.cos(omega)) / a0;
const b2 = (1.0 - Math.cos(omega)) / 2.0 / a0;

var resampFiltB = [b0, b1, b2];
var resampFiltA = [1, a1, a2];
```
Here, the `Q`-factor describes the trade-off between an overshoot at the resonance frequency slightly below the cutoff frequency and the steepness of the cutoff in the frequency domain.

In our application the user can change the vocal tract length in real-time using a slider. Because of this, the biquad filter parameters need to change in real-time. Our current implementation has gradual decay (it's not very steep at the cutoff frequency) which creates aliasing artifacts. We decided to multiply the cutoff frequency of the filter by a factor of 0.75 to reduce the artifacts. We set the `Q`-factor to 2 to increase the steepness of the filter and to further reduce artifacts. The effects of the `Q`-factor and the filter implementation can be seen here: http://aikelab.net/filter/

___

[Next chapter](Chapter%205.%20Web%20interface.md)

[Back to main](../README.md)
