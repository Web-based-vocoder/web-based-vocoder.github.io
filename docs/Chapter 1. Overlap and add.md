## Chapter 1. Overlap and add

This chapter is quite technical. It deals with the Web Audio API technical challenges. The chapter is about the preparation of audio frames to be able to calculate voice parameters. If you are just interested in the voice transformations you should skip this chapter and go to the [next one](Chapter%202.%20LPC%20coefficients.md).

### Block processing with the AudioWorklet
The AudioWorklet code (vocoder.js) is called for each new audio block. The audio blocks consist of 128 samples (render quantum), which corresponds to approx. 3ms at 44.1 kHz. The sampling rate is set by default according to the sampling rate of the output device. If sampling rate is manually set, some latency issues could appear as the browser will have to resample the audio output to match the sampling rate of the device. In order to be more flexible, we made our application invariant to the sampling rate. More info can be found here: https://www.w3.org/TR/webaudio/#AudioContext-constructors

### Preparing the buffers/frames
In order to calculate the LPC coefficients (or other operations) we need more than 128 samples. Therefore we need to store consecutive audio blocks until we fill a buffer/frame. A buffer is an array that is reused and refilled to create other frames and to manage memory allocation. Each frame is unique and consists of a filled buffer at a certain point in time. Once the buffer is filled, a frame is created and operations can be done on a frame basis. We decided to make the buffer size a multiple of 128 (block size), this way it is possible to perform the frame operation at the end an audio block. It should be possible to use buffer sizes that are not multiple of 128, but we just found the aforementioned way easier. The number of blocks per frame depends on the given frame duration in milliseconds.

```javascript
// Frame duration (e.g., 0.02 s)
const fSize = frameDuration*sampleRate; 
// Make the framesize multiple of 128 (audio render block size)
this._frameSize = 128*Math.round(fSize/128); // Frame duration = this._frameSize/sampleRate;
```

In the current implementation we are using two buffers, which we call odd and pair. The pair buffer should be called "even", it was a translation mistake from catalan. The naming might change in following implementations.

The even buffer stores the frames with even numbering (0,2,4,6,8...) and the odd buffer the odd ones (1,3,5,7,9...). In this implementations, we do 50% overlap, therefore only two buffers are needed. If more than two frames need to be overlapping, this code will not work.

```
pairBuffer  0 0 0 0 -- Frame 0
oddBuffer       O O O O -- Frame 1
pairBuffer          0 0 0 0 -- Frame 2
oddBuffer               O O O O -- Frame 3
pairBuffer                  0 0 0 0 -- Frame 4
oddBuffer                       O O O O -- Frame 5
pairBuffer                          0 0 0 0 -- Frame 6
oddBuffer                               O O O O -- Frame 7
...
```

The previous digram can also be understood better when the block numbers (iteration) are shown:

```
pairBuffer  0 1 2 3 -- Frame 0
oddBuffer       2 3 4 5 -- Frame 1
pairBuffer          4 5 6 7 -- Frame 2
oddBuffer               6 7 8 9 -- Frame 3
pairBuffer                  8 9 10 11 -- Frame 4
...
```


### Filling the buffers with blocks
At each iteration, a new block of 128 samples arrive. This block is assigned to the two buffers, but in a different place of the buffer. Let's put an example with a frame size of 4 blocks and 50% overlap.
```
...
pairBuffer  0 0 0 0
indices     0 1 2 3
oddBuffer       O O O O
indicies        0 1 2 3
...

blockNum    0 1 2 3 4 5 ...
```

Let's look at the block number 2. This block will be assigned to the third block (index 2) of the pairBuffer. At the same time, this block will be assined to the first block of the oddBuffer (index 0). This block is marked with an X in the following section:

```
...
pairBuffer  0 0 X 0
indices     0 1 2 3
oddBuffer       X O O O
indicies        0 1 2 3
...

blockNum    0 1 X 3 4 5 ...
```

A buffer is complete when its last 128 samples, i.e. its last block, are filled. In the above example, the pairBuffer would be filled when the blockNum 3 is reached. The oddBuffer would be filled in the blockNum 5. Once the buffer is filled, a full frame is obtained and operations can be done in it.

### Output block: overlap and add routine
In this app, we have an overlap of 50%. For an overlap of 50% or less, only two frames are required. In this code, we have allocated two buffers for the synthesis. These buffers (pairSynthBuffer and oddSynthBuffer) are computed each time a full frame is obtained (see previous section).

The output block of the AudioWorklet has a size of 128 samples, as the input. We use a similar strategy as before, but instead of assigning the incoming block to the buffers, we use the synthesized buffers to compute the output block. We use a Hann window (see [Wikipedia article](https://en.wikipedia.org/wiki/Window_function)) to add the corresponding blocks of the synthesized buffers. The minimum delay of the system is one frame duration. Currently the application only works well for frames with an even number of blocks.

```
...                
Hann window          /´ ˆ `\
pairSynthBuffer      0 0 X 0
Hann window              /´ ˆ `\
oddSynthBuffer           X O O O
...

```

### Frame rate and blocks
Vocoder and other speech transformations might work better with a lower sampling frequency, preferably between 8kHz and 12kHz. By default, the sampling frequency of the browser is 48 kHz. In Chrome, one can specify the sampling frequency of the AudioContext. Nevertheless, if the sampling rate is very low the app can run into problems. It can be that one frame equals to one block. Because we are working with blocks to create frames, in this particular case, there will be no "overlap and add" and some clicks might appear between frames. One possible solution would be to force a minimum of two blocks per frame. The other would be to work on a sample level, which would lead to more delay.

___

[Next chapter](Chapter%202.%20LPC%20coefficients.md)

[Back to main](../README.md)
