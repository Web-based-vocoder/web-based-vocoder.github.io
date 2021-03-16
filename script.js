// The main global scope
console.log("v0.20");

//import * as voiceMap from './voiceMap.js';
// Hack to import voiceMap-js;
(async () => {
  voiceMap = await import('./voiceMap.js');
})();
var voiceMap;

startDemo = () => {
  // Start AudioContext
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  //const audioCtx = new AudioContext({sampleRate:12000});
  const audioCtx = new AudioContext();
  audioCtx.suspend();
  console.log("starting audiocontext as suspended")

  // AudioContext nodes
  // Analyser node - Gets the wave buffer (and fft) on the main thread
  const analyser = audioCtx.createAnalyser();
  analyser.smoothingTimeConstant = 0.0;
  analyser.fftSize = 2048;
  let analyseArray = new Uint8Array(analyser.frequencyBinCount);

  // Sound source node (buffer source)
  let soundSource;
  let streamSource;
  // Stores the buffers of the dragged audio files
  let soundBuffer = {};

  // initialize sound source for files
  soundSource = audioCtx.createBufferSource();

  // ask user to allow mic input
  if (navigator.mediaDevices) {
  navigator.mediaDevices.getUserMedia({audio: true})
    .then(function(stream) {
      streamSource = audioCtx.createMediaStreamSource(stream);
    });
  } else {
    console.log('getUserMedia not supported on your browser!');
  }

  // Log AudioContext sampling rate
  console.log("Sampling rate: " + audioCtx.sampleRate + "Hz.");

  // Create and load AudioWorklet node
  let vocoderNode = null;
  audioCtx.audioWorklet.addModule('vocoder.js').then(() => {
    vocoderNode = new AudioWorkletNode(audioCtx, 'vocoder');
    console.log("Vocoder audioworklet loaded...");

    // Receive message from AudioWorklet Node
    vocoderNode.port.onmessage = (e) => {
      // Get information at every frame
      if (e.data.buffer !== undefined){
        workletBuffer = e.data.buffer;
        workletBuffer2 = e.data.bufferPair;
        pBlock = e.data.pairBlock;
        oBlock = e.data.oddBlock;
        lpcCoeff = e.data.lpcCoeff;
        kCoeff = e.data.kCoeff;
	      blockRMS = e.data.blockRMS;
        excitationSignal = e.data.excitationSignal;
        errorSignal = e.data.errorSignal;
      }
      tractStretch = e.data.tractStretch;
      // Get information every second
      if (e.data.message == 'Update'){
        console.log(e.data);
      }
    };
  });

  function make_new_vocoder_node(){

    vocoderNode = new AudioWorkletNode(audioCtx, 'vocoder');
    console.log("Vocoder audioworklet loaded...");

    // Receive message from AudioWorklet Node
    vocoderNode.port.onmessage = (e) => {
      // Get information at every frame
      if (e.data.buffer !== undefined){
        workletBuffer = e.data.buffer;
        workletBuffer2 = e.data.bufferPair;
        pBlock = e.data.pairBlock;
        oBlock = e.data.oddBlock;
        lpcCoeff = e.data.lpcCoeff;
        kCoeff = e.data.kCoeff;
	      blockRMS = e.data.blockRMS;
        excitationSignal = e.data.excitationSignal;
        errorSignal = e.data.errorSignal;
      }
      tractStretch = e.data.tractStretch;
      // Get information every second
      if (e.data.message == 'Update'){
        console.log(e.data);
      }
    };
    return vocoderNode;
  }


  // App control variables
  let playing = false;


  // Variables for displaying information on canvas
  // Wave buffer for painting
  const waveBuffer = new Float32Array(analyser.fftSize);
  let workletBuffer = null;
  let workletBuffer2 = null;
  let pBlock = null;
  let oBlock = null;
  let lpcCoeff = null;
  let kCoeff = null;
  let tractStretch = 1.0;
  let excitationSignal = [];
  let errorSignal = [];



  // DOM elements
  const playButton = document.getElementById("playButton");
  const inputButton = document.getElementById("inputButton");
  const vocoderButton = document.getElementById("vocoderButton");
  const quantButton = document.getElementById("quantButton");
  const quantSlider = document.getElementById("quantSlider");
  const tractLengthSlider = document.getElementById("tractLengthSlider");
  const tractLengthInfo = document.getElementById("tractLengthInfo");
  const reverseKButton = document.getElementById("reverseKButton");
  const perfectSButton = document.getElementById("perfectSynthButton");
  const voicedThresSlider = document.getElementById("voicedThresSlider");
  const voicedThresInfo = document.getElementById("voicedThresInfo");
  const pitchSlider = document.getElementById("pitchSlider");
  const pitchInfo = document.getElementById("pitchInfo");
  const quantInfo = document.getElementById("quantInfo");
  const selSoundContainer = document.getElementById("selSoundContainer");
  const selectAudioList = document.getElementById("selectAudio");
  const loopAudioButton = document.getElementById("loopButton");
  const canvas = document.getElementById("myCanvas");
  const canvasCtx = canvas.getContext("2d");
  // Resize canvas
  canvas.width = document.body.clientWidth;
  canvas.height = document.body.clientHeight;

  // 2D interface
  let xMouse = 0;
  let yMouse = 0;
  let mouseState = 0;
  canvas.onmousemove = canvas.onmousedown = (e) => {
    xMouse = e.clientX;
    yMouse = e.clientY;
    mouseState = e.buttons; // 1 left, 2 right
  };

  let padSelX = 0.5;
  let padSelY = 0.5;



  // Button actions
  // Play/Pause
  playButton.onclick = () => {
    disconnect_all();

    if (!playing) {
      // check if context is in suspended state (autoplay policy)
      if (audioCtx.state === 'suspended') {
        console.log("resuming audio context");
        audioCtx.resume();
      }

      soundSource = audioCtx.createBufferSource();
      soundSource.buffer = soundBuffer[selectAudioList.value];

      connect_source();

      // Loop?
      if (loopAudioButton.checked)
      	soundSource.loop = true;

      soundSource.start();
      console.log('start');
      playing = true;
      playButton.innerText = 'Pause Sound';
    } else {

      audioCtx.suspend();
      soundSource.stop();
      console.log('stop')
      playing = false;
      playButton.innerText = 'Play Sound';
    }
  }




  // Switch microphone/file input
  inputButton.onclick = () => {


    if (inputButton.checked) {
      // hide list of audio
      selSoundContainer.style.visibility = 'hidden';
      loopAudioButton.parentElement.hidden = true;

    } else {
      // show list of audio
      selSoundContainer.style.visibility = 'visible';
      loopAudioButton.parentElement.hidden = false;
      //soundSource.buffer = soundBuffer[selectAudioList.value];
    }
    if (playing){
      disconnect_all();
      connect_source();
    }

  }


  vocoderButton.onclick = () => {

    // Show/Hide HTML vocoder options
    if (vocoderButton.checked){

      // Unhide vocoder HTML elements
      quantButton.parentElement.hidden = false;
      reverseKButton.parentElement.hidden = false;
      perfectSButton.parentElement.hidden = false;
      tractLengthSlider.parentElement.hidden = false;
      if (perfectSButton.checked){
        voicedThresSlider.parentElement.hidden = false;
        pitchSlider.parentElement.hidden = false;
      }
    } else {
      // Hide vocoder HTML elements
      quantButton.parentElement.hidden = true;
      reverseKButton.parentElement.hidden = true;
      perfectSButton.parentElement.hidden = true;
      tractLengthSlider.parentElement.hidden = true;
      voicedThresSlider.parentElement.hidden = true;
      pitchSlider.parentElement.hidden = true;

      vocoderNode.disconnect();
    }
    // Create audio connections
    if (playing){
      disconnect_all();
      connect_source();
    }
  }


  // Quantization on/off
  quantButton.onclick = () => {
    // Send quantization on/off
    vocoderNode.port.postMessage({
      id: "quantization",
      quantOpt: quantButton.checked,
      quantBits: quantSlider.value,
    })
  }
  // Quantization slider
  quantSlider.oninput = () => {
    // Send quantization bits to AudioWorklet
    vocoderNode.port.postMessage({
      id: "quantization",
      quantOpt: quantButton.checked,
      quantBits: quantSlider.value,
    })
    // Show value
    quantInfo.innerHTML = quantSlider.value + " bits";
  }
  // Reverse k's on/off
  reverseKButton.onclick = () => {
    // Send quantization on/off
    vocoderNode.port.postMessage({
      id: "reverseK",
      reverseKOpt: reverseKButton.checked,
    })
  }
  // Perfect Synthesis on/off
  perfectSButton.onclick = () => {
    // Send use impulse on/off
    vocoderNode.port.postMessage({
      id: "perfectSynth",
      perfectSynthOpt: !perfectSButton.checked, // Reversed perfect synth check
    });
    // Hide voiced/unvoiced
    if (!perfectSButton.checked){ // Show if using impulse excitation
      voicedThresSlider.parentElement.hidden = true;
      pitchSlider.parentElement.hidden = true;
    } else {
      voicedThresSlider.parentElement.hidden = false;
      pitchSlider.parentElement.hidden = false;
    }
  }
  // Loop/Unloop
  loopAudioButton.onclick = () => {
  	if (loopAudioButton.checked) {
  		soundSource.loop = true;
  	} else {
  		soundSource.loop = false;
  	}
  }

  tractLengthSlider.oninput = () => {
    // Send tract length slider value to AudioWorklet
    vocoderNode.port.postMessage({
      id: "resampling",
      resampFactor: tractLengthSlider.value,
    })
    // Show value
    tractLengthInfo.innerHTML = tractLengthSlider.value + "x length";
  }

  pitchSlider.oninput = () => {
    // Send tract length slider value to AudioWorklet
    vocoderNode.port.postMessage({
      id: "pitchFactor",
      pitchFactor: pitchSlider.value,
    })
    // Show value
    pitchInfo.innerHTML = pitchSlider.value + "x factor";
  }

  voicedThresSlider.oninput = () => {
  	// Send voiced/unvoiced slider value to AudioWorklet
  	vocoderNode.port.postMessage({
      id: "voicedThreshold",
      voicedThreshold: voicedThresSlider.value,
    });
    // Show value
    voicedThresInfo.innerHTML = voicedThresSlider.value;
  }





  function connect_streamSource(){
    console.log("connecting the stream audio source...");
    if (vocoderButton.checked) {
      console.log("with vocoder");
      vocoderNode = make_new_vocoder_node();
      streamSource.connect(vocoderNode).connect(analyser).connect(audioCtx.destination);
      console.log(vocoderNode);
    } else {
      console.log("without vocoder");
      streamSource.connect(analyser).connect(audioCtx.destination);
    }
  }

  function connect_fileSource(){
    console.log("connecting the file audio source...");
    if (vocoderButton.checked) {
      vocoderNode = make_new_vocoder_node();
      console.log("with vocoder");
      soundSource.connect(vocoderNode).connect(analyser).connect(audioCtx.destination);
    } else {
      console.log("without vocoder");
      soundSource.connect(analyser).connect(audioCtx.destination);
    }
  }

  function connect_source(){
    console.log("connect_source called with audio context state: ", audioCtx.state);
    if (inputButton.checked){
      connect_streamSource();
    } else {
      connect_fileSource();
    }
    // Send options
    vocoderNode.port.postMessage({
      id: "options",
      perfectSynthOpt: !perfectSButton.checked, // Reversed "use impulse"
      quantOpt: quantButton.checked,
      quantBits: quantSlider.value,
      reverseKOpt: reverseKButton.checked,
      vocalTractFactor: tractLengthSlider.value,
      voicedThreshold: voicedThresSlider.value,
      pitchFactor: pitchSlider.value,
    });
  }

  function disconnect_all(){
    console.log("disconnecting soundSource and analyser");
    streamSource.disconnect();
    soundSource.disconnect();
    analyser.disconnect();
  }






  // Visualization
  function paintWave(inBuffer, inFactor, inColor){
    let factor = inFactor || 1;
    let color = inColor || "white";

    // Scale of wave
    let stepW = 0.3*canvas.width/inBuffer.length;
    let stepH = 75;
    // Axis
    canvasCtx.lineWidth = "1";
    canvasCtx.strokeStyle = "rgba(255,255,255, 0.5)";
    canvasCtx.beginPath(); // X axis
    canvasCtx.moveTo(0, 0);
    canvasCtx.lineTo(1.1*inBuffer.length*stepW, 0);
    canvasCtx.stroke();
    canvasCtx.beginPath(); // Y axis
    canvasCtx.moveTo(0, stepH*1.1);
    canvasCtx.lineTo(0, -stepH*1.1);
    canvasCtx.stroke();

    if (!playing)
      return;

    // Wave signal
    canvasCtx.beginPath();
    canvasCtx.lineWidth = "1";
    canvasCtx.strokeStyle = color;
    canvasCtx.moveTo(0, 0);
    for (let i = 0; i< inBuffer.length; i++){
      canvasCtx.lineTo(i*stepW, inBuffer[i]*stepH*factor);
    }
    canvasCtx.stroke();
	  
    // Draw axis value
    drawText("-" + factor, -20, stepH+5);
    drawText("0", -20, -5);
    drawText(factor, -20, -stepH-5);
  }


  function drawRMSCircle(blockRMS){
    let radius = 1000 * blockRMS;

    canvasCtx.beginPath();
    canvasCtx.lineWidth = "1";
    canvasCtx.strokeStyle = "white";
    canvasCtx.arc(0, 0, radius, 0, 2*Math.PI);
    canvasCtx.stroke();
  }

  function drawText(text, posW, posH, inSize, inColor){
    let size = inSize || 15;
    let color = inColor || "white";
    canvasCtx.fillStyle = color;
    canvasCtx.font = size + "px Georgia";
    canvasCtx.fillText(text, posW, posH);
  }




  // Paint loop
  function draw(dt)
  {
    // Clear canvas
    canvasCtx.clearRect(0,0, canvas.width, canvas.height);

    // Get wave buffer
    if (playing)
      analyser.getFloatTimeDomainData(waveBuffer);

    // Paint wave signal
    let wposW = 100;
    let wposH = 100;
    canvasCtx.translate(wposW,wposH);
    paintWave(waveBuffer);
    canvasCtx.translate(-wposW,-wposH);
    drawText("Wave signal", wposW+10, wposH+75);

    // Paint AudioworkletBuffer
    if (workletBuffer !== null && workletBuffer !== undefined){
      // Plot pairBuffer
      wposW = canvas.width/2 + 0.15*canvas.width;
      wposH = 700;
      canvasCtx.translate(wposW,wposH);
      paintWave(workletBuffer);
      canvasCtx.translate(-wposW,-wposH);
      drawText("Buffer odd", wposW+10, wposH+75);

      // Plot oddBuffer
      wposW = canvas.width/2;
      wposH = 500;
      canvasCtx.translate(wposW,wposH);
      paintWave(workletBuffer2);
      canvasCtx.translate(-wposW,-wposH);
      drawText("Buffer pair", wposW+10, wposH+75);

      // Plot block
      wposW = canvas.width/2;
      wposH = 100;
      canvasCtx.translate(wposW,wposH);
      paintWave(pBlock);
      paintWave(oBlock);
      canvasCtx.translate(-wposW,-wposH);
      drawText("Blocks (128 samples)", wposW+10, wposH+75);

      // Plot excitationSignal
      wposW = 100;
      wposH = 5*canvas.height/6;
      canvasCtx.translate(wposW,wposH);
      paintWave(excitationSignal, 10);
      canvasCtx.translate(-wposW,-wposH);
      drawText("Excitation signal", wposW+10, wposH+100, 0, "white");

      // Plot errorSignal
      wposW = 100;
      wposH = 5*canvas.height/6;
      canvasCtx.translate(wposW,wposH);
      paintWave(errorSignal, 10, 'red');
      canvasCtx.translate(-wposW,-wposH);
      drawText("Error signal", wposW+10, wposH+75, 0, "red");


      // Plot LPC coefficients
      if (lpcCoeff !== undefined){
        wposW = canvas.width/2;
        wposH = canvas.height/3;
        canvasCtx.translate(wposW,wposH);
        paintWave(lpcCoeff);
        paintWave(lpcCoeff);
        canvasCtx.translate(-wposW,-wposH);
        drawText("LPC coefficients", wposW+10, wposH+75);
      }

      // Plot tube areas from speech (wakita), page 63
      //https://www.ece.ucsb.edu/Faculty/Rabiner/ece259/digital%20speech%20processing%20course/lectures_new/Lecture%2014_winter_2012.pdf
      if (kCoeff !== null){
        // Pre-emphasis is missing?
        // Calculate A
        let a = [1];
        canvasCtx.fillStyle = "white";

        wposW = 30;
        wposH = canvas.height/5;
        canvasCtx.translate(wposW,wposH);
        // Calculate a
        for (let i = 1; i<kCoeff.length; i++){
          a[i] = a[i-1]*(1-kCoeff[i-1])/(1+kCoeff[i-1]);
        }
        // Paint a
        let normValue = Math.max(...a);
        for (let i = 0; i<kCoeff.length; i++){
          let value = 50*a[i]/normValue;
          canvasCtx.fillRect(i*20*tractStretch, -value/2, 20*tractStretch, value);
        }
        canvasCtx.translate(-wposW,-wposH);
      }

      // Visualize block RMS as circle with varying radius
      if (blockRMS != undefined){
        wposW = 30;
        wposH = canvas.height/5;
        canvasCtx.translate(wposW,wposH);
        drawRMSCircle(blockRMS);
        canvasCtx.translate(-wposW,-wposH);
      }


      // Plot fft bars
      var maxHeight = 250;
      var barWidth = (canvas.width/3) / analyseArray.length;
      var barHeight;
      var x = 0;
      wposW = canvas.width/2;
      wposH = 5*canvas.height/6;

      analyser.getByteFrequencyData(analyseArray);

      if (analyseArray != undefined){
        canvasCtx.translate(wposW,wposH);
        for(var i = 0; i < analyseArray.length; i++) {
          barHeight = analyseArray[i]/2;

          canvasCtx.fillStyle = 'rgb(' + (barHeight+maxHeight) + ',50,50)';
          canvasCtx.fillRect(x,100-barHeight/2,barWidth,barHeight);

          x += barWidth;
        }
        canvasCtx.translate(-wposW,-wposH);
        drawText("Magnitude spectrum (dB)", wposW, wposH+0.7*maxHeight, 0, "red");

      }
      else {
	console.log('Problem with fft plot: analyseArray was undefined!')
      }
    }

    // Instructions for drag and drop
    canvasCtx.fillStyle = "white";
    canvasCtx.font = "20px Georgia";
    canvasCtx.fillText("Drag and drop audio files here!", canvas.width/2 - canvas.width*0.1, 3*canvas.height/4);

    // Draw more


    // Draw 2D interface (Voice Map)
    if (vocoderButton.checked) {
      var paramsVoice = voiceMap.voiceMapUpdate(canvas, canvasCtx, xMouse, yMouse, mouseState);
      if (paramsVoice !== undefined){
        vocoderNode.port.postMessage(paramsVoice);
      }
    }



    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);








  canvas.ondragover = function(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  canvas.ondrop = function(e) {
      e.preventDefault()
      e.stopPropagation()

      var files = e.dataTransfer.files;
      // Load files
      var count = 0;
      for (var i = 0; i < files.length; i++) {
          var file = files[i];

          var reader = new FileReader();
          reader.fname = file.name;

          // Load files
          reader.addEventListener('load', function(e) {
              var data = e.target.result;
            var fileName = this.fname;
            var ss = fileName.split(".");
            var extension = ss[ss.length - 1];
            var sName = ss[0];

            // For audio files
            if (extension == "wav" || extension == 'mp3'){
                audioCtx.decodeAudioData(data, function(buffer) {
                  // Define audio buffer
                  soundBuffer[sName] = buffer;
                  // Add element to DOM list
                  selectAudio.add(new Option(sName, sName, false,sName));
                });
          }

          // Count the number of files loaded
          count ++;
          if (count == files.length){
            // All files loaded
            console.log(count + ' files dropped', 'success', 3);

          }
          })
          reader.readAsArrayBuffer(file);
      }
  }



  // Resize canvas
  window.onresize = function() {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
  }

}




window.onload = () => {
  startDemo();
}
