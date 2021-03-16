## Chapter 2. LPC coefficients
We implemented the LPC algorithm using the Levinson approach. It is described here: "Dutoit, T., 2004, May. Unusual teaching short-cuts to the Levinson and lattice algorithms. In 2004 IEEE International Conference on Acoustics, Speech, and Signal Processing (Vol. 5, pp. V-1029). IEEE." [link](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.69.4601&rep=rep1&type=pdf)

For the algorithm, first we calculate the autocorrelation of the frame. We only need the autocorrelation values up to the size of the LPC coefficients (M). We used M=12 by default.

```javascript
// Autocorrelation function
autoCorr(buffer, delay){
  let value = 0;
  for (let i = 0; i< buffer.length - delay; i++){
    // Because autocorrelation is symmetric, I use "i + delay", not "i - delay"
    value += buffer[i] * buffer[(i + delay)];
  }
  return value;
}

// Store autocorrelation values in array "phi"
const phi=[];
for (let i = 0; i<M+1; i++){
  phi[i] = this.autoCorr(inBuffer, i);
}
```

Once the autocorrelation values are computed, we can proceed with the Levinson algorithm. The algorithm works in a iterative manner: the coefficients are calculated in a similar way as Pascal's triangle (see [Wikipedia article](https://en.wikipedia.org/wiki/Pascal%27s_triangle)). Please refer to the aforementioned article for a mathematical explanation.

```javascript
// M = 1
let a1_m = -phi[1] / phi[0];
// Iterate to calculate coefficients
let coeff = [1, a1_m];
let tempCoeff = [1, a1_m];

let mu = 0;
let alpha = 0;
let k = 0;
for (let m = 0; m < M-1; m++){
    mu = 0;
    alpha = 0;
    // Calculate mu and alpha
    for (let i = 0; i<m+2; i++){
        mu += coeff[i]*phi[m+2-i];
        alpha += coeff[i]*phi[i];
    }
    k = - mu / alpha;
    // Calculate new coefficients
    coeff[m+2] = 0;
    for (let i = 1; i<m+3; i++){
        tempCoeff[i] = coeff[i] + coeff[m+2-i]*k;
    }
    coeff = tempCoeff.slice();
}

return coeff;
```

The aforementioned code provides the LPC coefficients. In our implementation we also store the k coefficients, as there are interesting modifications and visualizations that one can do with them.

___

[Next chapter](Chapter%203.%20Voice%20synthesis.md)

[Back to main](../README.md)
