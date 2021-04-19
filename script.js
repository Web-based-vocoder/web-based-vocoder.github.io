


(async () => {
  voiceMap = await import('./voiceMap.js');
})();
var voiceMap;

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




// Define a new component for painting signals
Vue.component('signal-canvas', {
  props: ['signalname'],
  template: '<div class="col-sm"><span> {{signalname}} </span><canvas style="width:100%;border:1px solid #000000;"></canvas></div>'
});



// Basics https://scrimba.com/learn/vuedocs
// Conditional rendering https://vuejs.org/v2/guide/conditional.html
// Accessing DOM elements https://blog.logrocket.com/vue-refs-accessing-dom-elements/
// Dropdown https://renatello.com/dynamic-drop-down-list-in-vue-js/
// Feather icons https://feathericons.com/


// https://vuejs.org/v2/guide/components.html
// Define a new component called button-counter



var app = new Vue({
  el: '#app',
  data: {
    playMessage: feather.icons.play.toSvg(),
    loopMessage: feather.icons.repeat.toSvg(),
    inputMessage: feather.icons.mic.toSvg(),
    isPlaying: false,
    isLooping: false,
    isInputMic: true,
    // https://renatello.com/dynamic-drop-down-list-in-vue-js/
    audioFiles: [
      { name: "sample_male", url: 'audioSamples/sample_male.wav' },
      { name: "sample_female", url: 'audioSamples/sample_female.wav'  }
    ],
    selectedAudio: 'test',
    vocoderMessage: '<span>'+ feather.icons.zap.toSvg({'color': 'gray'}) +'Vocoder</span>' + feather.icons.zap.toSvg({'color': 'gray'}),
    isVocoderOn: false,
    vocalTractLengthFactor: 1,
    isImpulseOn: false,
    voicedThreshold: 1,
    pitchFactor: 1,
    signals: [
      'Input signal',
      'LPC coefficients',
      'Error signal',
      'Excitation signal',
      'Audio blocks (128 samples)',
      'Audio buffer Even',
      'Audio buffer Odd'
    ]

  },
  methods: {
    // Play/Pause button event
    playBtn: function () {
      this.playMessage = this.isPlaying ? feather.icons.play.toSvg() : feather.icons.pause.toSvg();//'Play sound' : 'Pause sound';
      this.isPlaying = !this.isPlaying;
      // Functionalities
      disconnect_all();
      if (this.isPlaying) { // Play sound
        // check if context is in suspended state (autoplay policy)
        if (audioCtx.state === 'suspended') {
          console.log("resuming audio context");
          audioCtx.resume();
        }

        soundSource = audioCtx.createBufferSource();
        soundSource.buffer = soundBuffer[this.selectedAudio];

        connect_source();

        // Loop
        soundSource.loop = this.isLooping;

        soundSource.start();
        console.log('start');
      }
      // Stop sound
      else {
        audioCtx.suspend();
        soundSource.stop();
        console.log('stop')
      }
    },
    loopBtn: function() {
      //this.loopMessage = this.isLooping ? feather.icons.repeat.toSvg({'color': 'gray'}) : feather.icons.repeat.toSvg({'color': 'blue'});
      this.isLooping = !this.isLooping;
      soundSource.loop = this.isLooping;
    },
    // Switch from mic to audio file button event
    switchInputBtn: function () {
      //this.inputMessage = this.isInputMic ? feather.icons.mic.toSvg({'color': 'gray'}) : feather.icons.mic.toSvg({'color': 'red'});
      this.isInputMic = !this.isInputMic;

      if (this.isPlaying){
        disconnect_all();
        connect_source();
      }
    },
    ondragover: function(e) {
      e.preventDefault()
      e.stopPropagation()
    },
    ondrop: function(e) {
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
            reader.addEventListener('load', (e) => {
              var data = e.target.result;
              var fileName = e.target.fname;
              var ss = fileName.split(".");
              var extension = ss[ss.length - 1];
              var sName = ss[0];

              // For audio files
              if (extension == "wav" || extension == 'mp3'){
                  audioCtx.decodeAudioData(data, (buffer) => {
                    // Define audio buffer
                    soundBuffer[sName] = buffer;
                    // Add element to DOM list
                    //selectAudio.add(new Option(sName, sName, false,sName));
                    // Add element to Vue data
                    this.audioFiles.push({name: sName, url: ''});
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
    },
    // Dropdown list on change event
    // https://renatello.com/dynamic-drop-down-list-in-vue-js/
    changeAudioFile: function (event) {
      console.log(event.target.options[event.target.options.selectedIndex].text);
      this.selectedAudio = event.target.options[event.target.options.selectedIndex].text;
    },
    // Start vocoder button event
    startVocoder: function() {
      this.vocoderMessage = this.isVocoderOn ?
        '<span>'+ feather.icons.zap.toSvg({'color': 'gray'}) +'Vocoder</span>' + feather.icons.zap.toSvg({'color': 'gray'}) :
        '<span>'+ feather.icons.zap.toSvg({'color': 'red'}) +'Vocoder</span>' + feather.icons.zap.toSvg({'color': 'red'})
      this.isVocoderOn = !this.isVocoderOn;
      // Create audio connections
      if (this.isPlaying){
        disconnect_all();
        connect_source();
      }
    },
    impulseBtn: function() {
      this.isImpulseOn = !this.isImpulseOn;
      disconnect_all();
      connect_source();
    },
    vocalTractSliderInput: function() {
      // Send tract length slider value to AudioWorklet
      vocoderNode.port.postMessage({
        id: "resampling",
        resampFactor:  parseFloat(app.$data.vocalTractLengthFactor),
      });
    },
    voicedSliderInput: function() {
      // Send voiced/unvoiced slider value to AudioWorklet
    	vocoderNode.port.postMessage({
        id: "voicedThreshold",
        voicedThreshold: parseFloat(app.$data.voicedThreshold),
      });
      console.log(app.$data.voicedThreshold);
    },
    pitchSliderInput: function() {
      // Send tract length slider value to AudioWorklet
      vocoderNode.port.postMessage({
        id: "pitchFactor",
        pitchFactor: parseFloat(app.$data.pitchFactor),
      })
    }
  },
});




// Load initial audio files
function loadInitialFiles(){
  for (let i = 0; i<app.$data.audioFiles.length; i++ ){
    let sName = app.$data.audioFiles[i].name;
    let url = app.$data.audioFiles[i].url;
    fetch(url)
      .then((res, req) => res.arrayBuffer())
      .then((arrayBuffer) => audioCtx.decodeAudioData(arrayBuffer))
      .then((audioBuffer) => {soundBuffer[sName] = audioBuffer; console.log("Audio loaded: " + sName)})
      .catch((e) => console.error(e));
  }
}
loadInitialFiles();



// Audio context connections
function connect_streamSource(){
  console.log("connecting the stream audio source...");
  if (app.$data.isVocoderOn) {
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
  if (app.$data.isVocoderOn) {
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
  if (app.$data.isInputMic){
    connect_streamSource();
  } else {
    connect_fileSource();
  }
  // Send options
  vocoderNode.port.postMessage({
    id: "options",
    perfectSynthOpt: !app.$data.isImpulseOn, // Reversed "use impulse"
    quantOpt: false,//quantButton.checked,
    quantBits: false,//quantSlider.value,
    reverseKOpt: false,//reverseKButton.checked,
    vocalTractFactor: parseFloat(app.$data.vocalTractLengthFactor),//tractLengthSlider.value,
    voicedThreshold: parseFloat(app.$data.voicedThreshold),//voicedThresSlider.value,
    pitchFactor: parseFloat(app.$data.pitchFactor), //pitchSlider.value,
  });
}

function disconnect_all(){
  console.log("disconnecting soundSource and analyser");
  streamSource.disconnect();
  soundSource.disconnect();
  analyser.disconnect();
}











// Visualization
function paintWave(canvas, canvasCtx, inBuffer, inFactor, inColor){
  let factor = inFactor || 1;
  let color = inColor || "black";

  // Scale of wave
  let stepW = canvas.width/inBuffer.length;
  let stepH = 100;
  // Axis
  canvasCtx.lineWidth = "1";
  canvasCtx.strokeStyle = "rgba(0,0,0, 0.5)";
  canvasCtx.beginPath(); // X axis
  canvasCtx.moveTo(0, canvas.height/2);
  canvasCtx.lineTo(1.1*inBuffer.length*stepW, canvas.height/2);
  canvasCtx.stroke();

  if (!app.$data.isPlaying)
    return;

  // Wave signal
  canvasCtx.beginPath();
  canvasCtx.lineWidth = "1";
  canvasCtx.strokeStyle = color;
  canvasCtx.moveTo(0, canvas.height/2);
  for (let i = 0; i< inBuffer.length; i++){
    canvasCtx.lineTo(i*stepW, inBuffer[i]*stepH*factor + canvas.height/2);
  }
  canvasCtx.stroke();

  // Draw axis value
  /*drawText(canvasCtx, "-" + factor, -20, stepH+5);
  drawText(canvasCtx, "0", -20, -5);
  drawText(canvasCtx, factor, -20, -stepH-5);*/
}


function drawRMSCircle(canvasCtx, blockRMS){
  let radius = 1000 * blockRMS;

  canvasCtx.beginPath();
  canvasCtx.lineWidth = "1";
  canvasCtx.strokeStyle = "white";
  canvasCtx.arc(0, 0, radius, 0, 2*Math.PI);
  canvasCtx.stroke();
}

function drawText(canvasCtx, text, posW, posH, inSize, inColor){
  let size = inSize || 15;
  let color = inColor || "white";
  canvasCtx.fillStyle = color;
  canvasCtx.font = size + "px Georgia";
  canvasCtx.fillText(text, posW, posH);
}




// 2D interface
let xMouse = 0;
let yMouse = 0;
let mouseState = 0;
let canvas2Dmap = null;





// Paint loop
function draw(dt) {
  // Input signal
  let canvas = document.getElementById(app.$data.signals[0]).children[1];
  let canvasCtx = canvas.getContext("2d");
  // Clear canvas
  canvasCtx.clearRect(0,0, canvas.width, canvas.height);

  // Get wave buffer
  if (app.$data.isPlaying)
    analyser.getFloatTimeDomainData(waveBuffer);
  paintWave(canvas, canvasCtx, waveBuffer);


  // LPC coefficients
  if (workletBuffer !== null && workletBuffer !== undefined){
    canvas = document.getElementById(app.$data.signals[1]).children[1];
    canvasCtx = canvas.getContext("2d");
    // Clear canvas
    canvasCtx.clearRect(0,0, canvas.width, canvas.height);
    // Plot LPC coefficients
    if (lpcCoeff !== null && lpcCoeff !== undefined){
      paintWave(canvas, canvasCtx, lpcCoeff);
      //paintWave(canvasCtx, lpcCoeff);
    }


    // LPC error signal
    canvas = document.getElementById(app.$data.signals[2]).children[1];
    canvasCtx = canvas.getContext("2d");
    // Clear canvas
    canvasCtx.clearRect(0,0, canvas.width, canvas.height);
    paintWave(canvas, canvasCtx, errorSignal, 10, 'red');

    // Excitation signal
    canvas = document.getElementById(app.$data.signals[3]).children[1];
    canvasCtx = canvas.getContext("2d");
    // Clear canvas
    canvasCtx.clearRect(0,0, canvas.width, canvas.height);
    paintWave(canvas, canvasCtx, excitationSignal, 10);

    // Audio blocks
    canvas = document.getElementById(app.$data.signals[4]).children[1];
    canvasCtx = canvas.getContext("2d");
    // Clear canvas
    canvasCtx.clearRect(0,0, canvas.width, canvas.height);
    paintWave(canvas, canvasCtx, pBlock);
    paintWave(canvas, canvasCtx, oBlock);

    // Plot buffer Even
    canvas = document.getElementById(app.$data.signals[5]).children[1];
    canvasCtx = canvas.getContext("2d");
    // Clear canvas
    canvasCtx.clearRect(0,0, canvas.width, canvas.height);
    paintWave(canvas, canvasCtx, workletBuffer);

    // Plot buffer Odd
    canvas = document.getElementById(app.$data.signals[6]).children[1];
    canvasCtx = canvas.getContext("2d");
    // Clear canvas
    canvasCtx.clearRect(0,0, canvas.width, canvas.height);
    paintWave(canvas, canvasCtx, workletBuffer2);
  }

  // Draw 2D interface (Voice Map)
  if (app.$data.isVocoderOn) {
    // Get canvas if null
    if (canvas2Dmap === null){
      canvas2Dmap = document.getElementById("2Dmap");

      canvas2Dmap.onmousemove = canvas2Dmap.onmousedown = (e) => {

        xMouse = e.clientX;
        yMouse = e.clientY;
        mouseState = e.buttons; // 1 left, 2 right
      };
    }

    canvasCtx = canvas2Dmap.getContext("2d");
    // Clear canvas
    canvasCtx.clearRect(0,0, canvas2Dmap.width, canvas2Dmap.height);
    // Get parameters
    var paramsVoice = voiceMap.voiceMapUpdate(canvas2Dmap, canvasCtx, xMouse, yMouse, mouseState);
    if (paramsVoice !== undefined){
      vocoderNode.port.postMessage(paramsVoice);
    }
  }



  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
