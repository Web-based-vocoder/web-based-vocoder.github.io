// Interface to draw and calculate the values for voice transformations related to age and gender

// Position of the marker
let padSelX = 0.5;
let padSelY = 0.5;

var canvasCtx;


export function voiceMapUpdate(canvas, inCanvasCtx, xMouse, yMouse, mouseState){
  canvasCtx = inCanvasCtx;

  // Draw 2D interface
  var sizeR = canvas.width;

  // Triangles drawTriangle(x1,y1,x2,y2,x3,y3,inColor)
  // Child triangle
  drawTriangle(0, sizeR, sizeR/2,sizeR,0, sizeR/2, "rgba(0, 0, 0, 0.7)");
  // Female
  drawTriangle(sizeR, 0, 0, 0, 0, sizeR, "rgba(255, 0, 0, 0.7)");
  //drawTriangle(sizeR, 0, sizeR, sizeR, 0, sizeR, "rgba(255, 0, 0, 0.7)");
  // Male
  drawTriangle(0, sizeR, sizeR, 0, sizeR, sizeR, "rgba(200, 25, 25, 0.7)");
  // Older
  drawTriangle(sizeR, sizeR/2, sizeR, 0, sizeR/2, 0, "rgba(200, 25, 25, 0.7)");
  // Draw setting
  var xSel = padSelX*sizeR;
  var ySel = sizeR - padSelY*sizeR;

  drawCircle(xSel, ySel, 10, "black");
  drawCircle(xSel, ySel, 8, "white");

  // Text
  drawText("Child", 20, sizeR - 20, 15);
  drawText("Old",  sizeR- 50, 30, 15);
  drawText("Female", 20, 30, 15);
  drawText("Male", sizeR- 60, sizeR - 20, 15);

  // If is inside square
  if (xMouse < canvas.offsetLeft + canvas.width && xMouse > canvas.offsetLeft &&
    yMouse < canvas.offsetTop + canvas.height && yMouse > canvas.offsetTop){

    let xNorm = (xMouse - canvas.offsetLeft)/sizeR;
    let yNorm = 1 - (yMouse - canvas.offsetTop)/sizeR;

    // If mouse is clicked/down
    if (mouseState == 1){
      // Define position (from 0 to 1)
      drawCircle( xNorm*sizeR , (1-yMouse) * sizeR, 10, 'black');
      drawCircle( xNorm*sizeR , (1-yMouse) * sizeR, 8, 'green');

      padSelX = xNorm;
      padSelY = yNorm;

      return voiceTransformations(padSelX, padSelY);

    } else {
      drawCircle( xNorm*sizeR , (1-yNorm) * sizeR, 10, 'black');
      drawCircle( xNorm*sizeR , (1-yNorm) * sizeR, 8, 'gray');
    }
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
  let color = inColor || "rgba(0, 0, 0, 0.5)";

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
  let color = inColor || "rgba(0,0,0,0.8)";

  canvasCtx.beginPath();
  canvasCtx.lineWidth = "1";
  canvasCtx.fillStyle = color;
  //canvasCtx.strokeStyle = "white";
  canvasCtx.arc(x, y, radius, 0, 2*Math.PI);
  canvasCtx.fill();
}

function drawText(text, posW, posH, inSize, inColor){
  let size = inSize || 15;
  let color = inColor || "black";
  canvasCtx.fillStyle = color;
  canvasCtx.font = size + "px Georgia";
  canvasCtx.fillText(text, posW, posH);
}
