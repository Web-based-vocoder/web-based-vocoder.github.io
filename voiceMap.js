// Interface to draw and calculate the values for voice transformations related to age and gender

// Position of the marker
let padSelX = 0.5;
let padSelY = 0.5;

var canvasCtx;


export function voiceMapUpdate(canvas, inCanvasCtx, xMouse, yMouse, mouseState){
  canvasCtx = inCanvasCtx;

  // Draw 2D interface
  var sizeR = 200;
  var wposW = 30 + sizeR;
  var wposH = canvas.height/3 + sizeR;

  canvasCtx.translate(wposW,wposH);
  // Child triangle
  drawTriangle(-sizeR, 0, -sizeR, -sizeR/2, -sizeR/2, 0, "rgba(255, 255, 255, 0.7)");
  // Female
  drawTriangle(-sizeR, 0, -sizeR, -sizeR, 0, -sizeR, "rgba(255, 0, 0, 0.7)");
  // Male
  drawTriangle(-sizeR, 0, 0, -sizeR, 0, 0, "rgba(200, 25, 25, 0.7)");
  // Older
  drawTriangle(-sizeR/2, -sizeR, 0, -sizeR, 0, -sizeR/2, "rgba(200, 25, 25, 0.7)");
  // Draw setting
  var xSel = -(1-padSelX)*sizeR;
  var ySel = -padSelY*sizeR;
  //drawCircle(-sizeR/2, -sizeR/2);
  drawCircle(xSel, ySel);

  // Text
  drawText("Child", -sizeR -15, 20, undefined, 10);
  drawText("Old", 0, -sizeR -10, undefined, 10);
  drawText("Female", -sizeR -15, -sizeR -10, undefined, 10);
  drawText("Male", -15, 20, undefined, 10);
  // Reposition
  canvasCtx.translate(-wposW,-wposH);

  // If is in square
  if (xMouse < wposW +10 && xMouse > wposW-sizeR-10 &&
    yMouse < wposH+10 && yMouse > wposH-sizeR-10){

    // If mouse is clicked/down
    if (mouseState == 1){
      // Define position (from 0 to 1)
      drawCircle(xMouse,yMouse, undefined, 'green');
      var xNorm = 1-(wposW-xMouse)/sizeR;
      var yNorm = (wposH-yMouse)/sizeR;
      padSelX = xNorm;
      padSelY = yNorm;
      return voiceTransformations(padSelX, padSelY);

    } else
      drawCircle(xMouse, yMouse);
  }
}


// Do voice transformations using the 2D pad
function voiceTransformations(x,y){
  // 1,1 --> Old
  // 1,0 --> Male
  // 0,1 --> Female
  // 0,0 --> Child
  var vocalTractFactor = 1;
  var pitchFactor = 1;
  var unvoicedMix = 0; // Default (0 all perfect, 1 all unvoiced)
  var voicedThres = 0.4;
  var vibratoEffect = 0;

  // Distances
  var dist00 = Math.sqrt(x*x + y*y);
  var dist10 = Math.sqrt((1-x)*(1-x) + (y)*(y));
  var dist01 = Math.sqrt((x)*(x) + (1-y)*(1-y));
  var dist11 = Math.sqrt((1-x)*(1-x) + (1-y)*(1-y));
  // Distance from diagonal
  var ddD = (y-x); // from 1 to -1 

  // Child
  if (dist00<0.5){
    vocalTractFactor = 0.5+dist00;
  }

  // Female/Male
  // Modify pitch and vocal tract factor
  // Distance from diagonal (ddD): 1 to 0 for Female, 0 to -1 for Male)
  // TODO: alternative: use Axis instead of Diagonal (this way we can get Female100% and Old100%)
  if (ddD > 0){
    vocalTractFactor = vocalTractFactor / (ddD + 1); // Divided by two
    pitchFactor *= ddD*0.5 + 1; // Multiplied by 1.5
  }
  else{
    vocalTractFactor = vocalTractFactor * (Math.abs(ddD) + 1); // Multiplied by two
    pitchFactor /= Math.abs(ddD)*0.5 + 1; // Divided by 1.5
  }
  
  // Old
  // Add vibrato
  // Unvoiced
  if (dist11 < 0.5){
    var zero2one = (0.5-dist11)*2;
    unvoicedMix = zero2one;
    voicedThres = 0.4 + zero2one*0.6;
    vibratoEffect = zero2one;
  }

  return {
    id: "voiceMap",
    vocalTractFactor: vocalTractFactor,
    pitchFactor: pitchFactor,
    unvoicedMix: unvoicedMix,
    voicedThreshold: voicedThres,
    vibratoEffect: vibratoEffect
  }

}




function drawTriangle(x1,y1,x2,y2,x3,y3,inColor){
  let color = inColor || "rgba(255, 255, 255, 0.5)";

  canvasCtx.beginPath();
  canvasCtx.moveTo(x1,y1);
  canvasCtx.lineTo(x2,y2);
  canvasCtx.lineTo(x3,y3);
  canvasCtx.closePath();
  canvasCtx.fillStyle = color;
  canvasCtx.fill();
} 


function drawCircle(x,y, inRadius, inColor){

  let radius = inRadius || 6;
  let color = inColor || "rgba(255,255,255,0.8)";

  canvasCtx.beginPath();
  canvasCtx.lineWidth = "1";
  canvasCtx.fillStyle = color;
  //canvasCtx.strokeStyle = "white";
  canvasCtx.arc(x, y, radius, 0, 2*Math.PI);
  canvasCtx.fill();
}

function drawText(text, posW, posH, inSize, inColor){
  let size = inSize || 15;
  let color = inColor || "white";
  canvasCtx.fillStyle = color;
  canvasCtx.font = size + "px Georgia";
  canvasCtx.fillText(text, posW, posH);
}
