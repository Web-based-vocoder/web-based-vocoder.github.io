## Chapter 5. Web interface
The front end contains very simple elements. A canvas (to plot signals); a button to play and pause the audio; a button to activate and deactivate the AudioWorklet processing; several voice transformation options and a select list to choose from different audio signals.

### Canvas
In the canvas we plot can plot the frames, blocks and buffers used in the AudioWorklet in real-time. For most signals, this is not very helpful as each frame will have a different shape and we won't be able to see anything in real-time. But for testing purposes, we created a sawtooth wave, where every "tooth" has the size of an AudioWorklet frame, e.g., from 0 to 1 every 1024 samples and so on. With this signal, the frames always have the same shape at every iteration and the wave plot in the canvas is stable. Bear in mind that the sample rate of this signal has to be the same as the Web Audio API. A sawtooth wave with the size of a block (128 samples) was also used for testing the block size.

```
Sawtooth wave for a frame size of 1024

    /|    /|    /|    /|
  /  |  /  |  /  |  /  |
/    |/    |/    |/    |
0...1024..2048..3072..4096...
```

In order to play different audios in the app, the canvas has a drag a drop function: one can drag and drop an audio file in the web interface. The audio file is then loaded and displayed in the select list. Multiple audio files can also be dragged and dropped. Only ".wav" and ".mp3" files are accepted.



### Real-time microphone input
Within the Web Audio API, it is possible to also record and process audio signals from the user microphone. For this, the user can be asked whether or not they want to share their input via the following snippet:
```javascript
navigator.mediaDevices.getUserMedia({audio: true})
  .then(function(stream) {
    streamSource = audioCtx.createMediaStreamSource(stream);
  });
```
This step will create an AudioWorklet similar to the one required for file-wise processing. Since the framework is very modular, individual processing blocks can easily be connected, e.g. by connecting the audio source to the vocoder node and then to the output: 
```javascript
  streamSource.connect(vocoderNode).connect(audioCtx.destination);
```
Since a lot of interface options have the potential to interfere with each other, a change in the processing scheme is accompanied by a re-connection of all processing nodes, and depending on the user interface states the appropriate AudioWorklets are selected and set to the appropriate state. As an example, if the microphone input is activated via checking a box, the file selection dropdown menu for audio file input will be hidden.

___

[Next chapter](Chapter%206.%20Voice%20map.md)

[Back to main](../README.md)
