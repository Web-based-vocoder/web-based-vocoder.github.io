## Speech production model 

While the process of speech production is subject to a variety of physical effects, a relatively simple model can be used to explain it (see [Wikipedia article](https://en.wikipedia.org/wiki/Source%E2%80%93filter_model)).
Components of human speech can be loosely classified as either voiced or unvoiced. 

### Speech production
Voiced speech originates from air being pressed through the vocal folds, which then periodically open and close. 
The rate of this movement results in the fundamental frequency and overtones that form the tonal excitation.
As a rough approximation, this excitation can be assumed to have a pulse train-like structure.

When this excitation moves through the vocal tract and out of the mouth, it is altered by their acoustic transfer function. 
During speech production, movements in this area, such as lifting tongue or opening of the mouth will alter the resulting sound.
If inertia in movement is assumed within short time frames such as 20 ms, this transfer behaviour can be modeled as linear time-invariant filtering, with a different filter for each frame. This approximation results in fixed filters for each segment that do not change within each segment.
Since the vocal tract has a shape similar to a tube with varying diameter, it is reasonable to model individual sections of the vocal tract as tubes. 
For the entire tract, the result is a multi-resonance all-pole-filter. 
This model is able to explain major features observed in tonal speech components, the formants.

For unvoiced speech components, it can be observed that the vocal folds are held open such that air can move past them unaltered.
Through various transfer path alterations by the vocal tract, different kinds of unvoiced sounds can be created since now the excitation has no period component. This is done by blocking part of the tract, for example by closing the teeth.
The resulting spectrum resembles broad-band noise, and can be modeled using the same transfer path model, but white noise as the excitation signal instead.

### Linear prediction model
Using this simple approximation, it is possible to analyse speech signals with respect to their excitation and frame-wise transfer functions. This does result in a loss of speech quality, but enables high compression rates for speech transfer in a wide range of communication systems. 
With raw audio data, sampling rates of 8 to at most 48 kHz could be considered, where each sample would have a size of e.g., 16 bits. 
This amount can be reduced drastically if only 10 to 15 filter coefficients and the distinction voiced/unvoiced have to be transmitted.

It is possible to apply this model in an analysis-synthesis approach. In the analysis step, linear prediction algorithms are used to compute frame-wise filter coefficients which represent the vocal tract model. For a detailed description of linear prediction analysis, please refer to [Chapter 2. LPC coefficients](Chapter%202.%20LPC%20coefficients.md). From the error signal after filter estimation, the information whether the segment is voiced or unvoiced can be obtained as the error signal corresponds to the excitation signal in the linear prediction model for speech production. Details on excitation analysis and synthesis can be found in [Chapter 3. Voice synthesis](Chapter%203.%20Voice%20synthesis.md).
Following the analysis, synthetic speech is obtained by filtering the artificial excitation with the estimated filter coefficients. If the speech production model were accurate, the result would be unaltered speech. Before or during the synthesis step, additional transformations or changes can be applied to the speech components ([Chapter 4. Voice transformations](Chapter%204.%20Voice%20transformations.md)).

___

[Next chapter](Chapter%201.%20Overlap%20and%20add.md)

[Back to main](../README.md)

