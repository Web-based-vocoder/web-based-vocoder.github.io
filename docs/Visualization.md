## Chapter 7. Visualization

In order to understand what is happening inside the application, we are plotting several signals in the canvas. Most of them are quite straighforward to display, as they are one dimensional arrays. The most interesting visualization to talk about is the shape of the vocal tract.

### Tube areas of the vocal tract

The vocal tract shape can be modelled as a pipe with different areas accross its section. These can be called tube areas. We plotted these tube areas based on the formulas explained in the [DSP lectures](https://www.ece.ucsb.edu/Faculty/Rabiner/ece259/digital%20speech%20processing%20course/lectures_new/Lecture%2014_winter_2012.pdf) from the USCB (page 63). The full paper is Wakita, H., 1973. Direct estimation of the vocal tract shape by inverse filtering of acoustic speech waveforms. IEEE Transactions on Audio and Electroacoustics, 21(5), pp.417-427. [DOI](https://doi.org/10.1109/TAU.1973.1162506).

The model assumes that the waves going through the sections can be treated as plane waves, and most importantly, that the tube is rigid, i.e. there is no energy loss when the waves travel and get reflected. These areas can be calculated using the PARCOR coefficients, because they are related to the areas of the lossless tubes:

```javascript
// Calculate areas
let a = [1];
for (let i = 1; i<kCoeff.length; i++){
  a[i] = a[i-1]*(1-kCoeff[i-1])/(1+kCoeff[i-1]);
}
```

In our visualization, we plotted these values as rectangles to represent the tube areas. Additionally, we plotted the RMS energy of the signal as a circle to rudely represent the mouth opening (more energy makes the circle bigger).

___

[Next chapter](KnownIssues.md)

[Back to main](../README.md)
