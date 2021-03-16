## Chapter 6. Voice map

In our app we implemented a 2D interface to do voice transformations. The 2D interface uses two high level parameters: gender and age. These two parameters control the voice transformations explained in [Chapter 4](Chapter%204.%20Voice%20transformations.md). The code is implemented in a module in [voiceMap.js](../voiceMap.js). The interface controls the parameters shown in the following figure:

![Alt text](img/VoiceMap.png?raw=true "Voice map")

All transformations in the voice map are linear in terms of the parameters they change, and use basic 2D distances. The gender transformations take place all over the 2D map. The age transformations modify the voice at the bottom-left and top-right corners. The pitch transformation is not available when the error signal is used for synthesis (Impulse Excitation OFF) and the vibrato is not implemented in the current state of the app.

To simulate a child's voice, the vocal tract length is reduced by a factor. The factor in the interface goes from 0.5 to 1, i.e. at the bottom-left corner the reduction of the vocal tract length will be by half and outside the circle the vocal tract won't be modified.

The gender is modified by transforming the vocal tract length and the pitch. The original pitch is extracted from the signal and used for synthesis (see [Chapter 3](Chapter%203.%20Voice%20synthesis.md)). This pitch, or fundamental frequency, can be modified in the code by a factor. Then, a new period in samples can be computed and used to create the tonal excitation.

```javascript
// Pitch modifications
// Modify fundamental frequency
fundFreq = fundFreq * pitchFactor;
periodSamples = Math.round(sampleRate / fundFreq);
```

For the female voice, the vocal tract length factor goes from 1 to 0.5, i.e. the vocal tract length is reduced by half in the extreme (top-left corner). The original pitch is multiplied by the factor of 1.5 in the extreme. For the male transformation, the values are similar but reversed: the vocal tract length is multiplied by a factor of 2 and the pitch is divided by a factor of 1.5. The maximum values for the gender transformation are reached at the top-left and bottom-right corners. The factors are computed depending on the distance from the diagonal that goes from bottom-left to top-right. In this diagonal, the gender voice transformation is neutral. When we are closer to the child's voice, the gender transformation is quite small but it still interacts with the child's voice transformation. The weights in the diagonal are computed the following way:

```javascript
// Distance from diagonal
// x and y range from 0 to 1 in the 2D map
var ddD = (y-x); // from 1 to -1
// Female/Male
// Modify pitch and vocal tract factor
// Distance from diagonal (ddD): 1 to 0 for Female, 0 to -1 for Male)
if (ddD > 0){
  vocalTractFactor = vocalTractFactor / (ddD + 1); // Divided by two
  pitchFactor *= ddD * 0.5 + 1; // Multiplied by 1.5
}
else{
  vocalTractFactor = vocalTractFactor * (Math.abs(ddD) + 1); // Multiplied by two
  pitchFactor /= Math.abs(ddD) * 0.5 + 1; // Divided by 1.5
}
```

The older voice transformation is based on the voiced/unvoiced threshold. When humans get older, they have trouble generating voiced sounds. Therefore, an older voice will have more unvoiced sounds, like whispering. The default value for the voiced/unvoiced threshold is 0.4 (0 equals to complete voiced synthesis, 1 to unvoiced synthesis only). This threshold is related to the autocorrelation and it is named tonalConfidence in the code (see  [Chapter 3](Chapter%203.%20Voice%20synthesis.md)). In our voice map, the threshold will go from 0.4 to 1 when the user gets closer to the extreme at the top-right corner. The gender voice transformation interacts with this voice transformation but with a small effect.

___

[Next chapter](Visualization.md)

[Back to main](../README.md)
