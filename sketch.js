let darkMode = false;

// display vars
let bgColor;
let axisColor;
let labelColor;
let dotColor;
let dotColorActive;
let spikeColor;
let spikeColorActive;
let spikeColorHighlighted;
let eventColor;
let eventColorActive;
let rectColor;
let defaultTextSize = 18;
let defaultFont = 'Courier New';
let showScatter = true;

// params for fake spike data
let nNeurons = 20;
let minRate = 0.025;
let maxRate = 0.15;
let nTimesteps = 8000; // total number of timesteps
let maxDelay = 200;

// params for counting spikes
let binSize = 200;
let strideSize = 1;
let timestepsPerFrame = 1;

// for creating fake data
let inputData;
let spikeTimes;

let t;
let padding;
let rasterPosY;
let rasterHeight;
let rasterWidth;
let rasterWindowStart;
let scatterOriginX;
let scatterOriginY;
let scatterAxisLength;
let pts;
let mouseInds;
let prevMouseInds;

function makeInputs(nTimesteps) {
  let min_iti = 400;
  let max_iti = 700;
  let min_isi = binSize;
  let max_isi = binSize + 500;
  let nextStimTime = 200 + binSize;
  let nextRewTime = -1;

  // create stimuli and rewards
  let stims = [];
  let rews = [];
  let stimTimes = [];
  let rewTimes = [];
  for (let t = 0; t < nTimesteps; t++) {
    if (t === nextStimTime) {
      stims.push(1);
      rews.push(0);
      stimTimes.push(t);
      nextStimTime = -1;
      nextRewTime = t + floor(random(min_isi, max_isi));
    } else if (t === nextRewTime) {
      rews.push(1);
      stims.push(0);
      rewTimes.push(t);
      nextStimTime = t + floor(random(min_iti, max_iti));
      nextRewTime = -1;
    } else if (nextStimTime === -1) {
      stims.push(1);
      rews.push(0);
      stimTimes.push(t);
    } else {
      stims.push(0);
      rews.push(0);
    }
  }
  return [stims, rews, stimTimes, rewTimes];
}

function makeSpikeTimes(inputData, nNeurons, minRate, maxRate, nTimesteps) {
  let rates = [];
  for (let j = 0; j < nNeurons; j++) {
    let pBase = random(0.01, 0.02);
    // let pStim = 0.1;
    // let pRew = 0.05;
    // let delay = (j%2===0) ? maxDelay-11 : 1;
    // delay += floor(random(1,10));
    let delay = floor(random(1,maxDelay));
    let pStim = maxRate;//random(minRate, maxRate);
    let pRew = random(minRate, maxRate);
    rates.push([pBase, pStim, pRew, delay]);
  }
  return makeSpikeTimesFromRates(inputData, rates, nTimesteps);
}

function makeSpikeTimesFromRates(inputData, rates, nTimesteps) {
  // init spike time tracking
  let sps = [];
  for (let j = 0; j < rates.length; j++) {
    sps.push([]);
  }

  let cStim = 0;
  let cRew = 0;
  let decayStim = 0.5; // time constant for stim
  let decayRew = 0.5; // time constant for rew

  let inputs = [];
  for (let t = 0; t < maxDelay; t++) {
    inputs.push([0, 0]);
  }

  for (let t = 0; t < nTimesteps; t++) {
    if (inputData[0][t] === 1) {
      cStim = 1;
    } else {
      cStim = cStim*decayStim;
    }
    if (inputData[1][t] === 1) {
      cRew = 1;
    } else {
      cRew = cRew*decayRew;
    }
    inputs.push([cStim, cRew]);
    for (let j = 0; j < rates.length; j++) {
      let delay = rates[j][3];
      let tCur = t+maxDelay-1-delay;
      let pCur = rates[j][0] + inputs[tCur][0]*rates[j][1] + inputs[tCur][1]*rates[j][2];
      if (random(0,1) < pCur) {
        sps[j].push(t);
      }
    }
  }
  return sps;
}

function setColors() {
  if (darkMode) {
    bgColor = 'black';
    axisColor = 'white';
    labelColor = 'white';
    spikeColor = color(255, 204, 0, 128);
    spikeColorActive = color(255, 204, 0, 255);
    spikeColorHighlighted = 'red';
    eventColor = 'gray';
    eventColorActive = 'white';
  } else {
    bgColor = 'white';
    axisColor = 'black';
    labelColor = 'black';
    spikeColor = 'lightgray';
    spikeColorActive = 'black';
    spikeColorHighlighted = 'red';
    eventColor = 'lightgray';
    eventColorActive = 'black';
  }
  dotColor = color(255, 0, 0, 30);
  dotColorActive = color(255, 0, 0, 180);
  rectColor = color(255, 0, 0, 100);
}

function setup() {
  setColors();
  textSize(defaultTextSize);
  textFont(defaultFont);
  
  t = 0;
  pts = [];
  
  // create fake spike times
  inputData = makeInputs(nTimesteps);
  spikeTimes = makeSpikeTimes(inputData, nNeurons, minRate, maxRate, nTimesteps);
  
  // rasterWidth = windowWidth;
  // rasterHeight = windowHeight/2;
  rasterWidth = window.innerWidth;
  rasterHeight = window.innerHeight/2;
  rasterWindowStart = rasterWidth/2 - binSize/2;
  // rasterWindowStart = 0;

  // make room for one inputs
  padding = rasterHeight / (nNeurons+1);
  rasterPosY = 1*padding;
  // rasterHeight = rasterHeight - rasterPosY;

  scatterAxisLength = 0.9*windowHeight-rasterHeight;
  scatterOriginX = window.innerWidth/2 - 0.5*scatterAxisLength;
  scatterOriginY = windowHeight - 3*textSize();

  prevMouseInds = getHighlightedInds();
  mouseInds = prevMouseInds;
  // createCanvas(windowWidth, windowHeight);
  createCanvas(window.innerWidth, window.innerHeight);
}

function scatter(x, y, xo, yo, axisLength) {
  let xp = map(x, 0, 0.25*binSize, 0, axisLength);
  let yp = map(y, 0, 0.25*binSize, 0, axisLength);
  circle(xo + xp, yo - yp, 10);
}

function labelScatter(xo, yo, axisLength) {
  noStroke();
  fill(labelColor);
  let textPadding = textSize();

  textAlign(CENTER, TOP);
  text('Neuron ' + (mouseInds[0]+1).toString() + ' firing rate', xo + axisLength/2, yo + textPadding);
  
  textAlign(CENTER, BOTTOM);
  push();
  translate(xo - textPadding, yo - axisLength/2);
  rotate(-PI/2);
  text('Neuron ' + (mouseInds[1]+1).toString() + ' firing rate', 0, 0);
  pop();
}

function drawScatter(pts, counts, xi, yi) {
  
  // let axisLength = 0.8*windowWidth/2;
  // let xo = windowWidth/2 + 0.2*axisLength;
  // let yo = windowHeight/2 + axisLength/2;
  // let axisLength = 0.9*windowHeight-rasterHeight;
  // let xo = window.innerWidth/2 - 0.5*axisLength;
  // let yo = windowHeight - 3*textSize();
  let axPadding = 8; // n.b. keeps axis away from data points
  stroke(axisColor);
  line(scatterOriginX-axPadding, scatterOriginY+axPadding, scatterOriginX-axPadding, scatterOriginY-scatterAxisLength);
  line(scatterOriginX-axPadding, scatterOriginY+axPadding, scatterOriginX+scatterAxisLength, scatterOriginY+axPadding);
  
  fill(dotColor);
  noStroke();
  for (let t = 0; t < pts.length; t++) {
    scatter(pts[t][xi], pts[t][yi], scatterOriginX, scatterOriginY, scatterAxisLength);
  }
  fill(dotColorActive);
  scatter(counts[xi], counts[yi], scatterOriginX, scatterOriginY, scatterAxisLength);
  labelScatter(scatterOriginX, scatterOriginY, scatterAxisLength);
}

function getHighlightedInds() {
  let mouseInd = floor(map(constrain(mouseY, rasterPosY, rasterPosY+rasterHeight), rasterPosY, rasterPosY+rasterHeight, 0, nNeurons-1));
  if (mouseInd+1 >= nNeurons) {
    mouseInd -= 1;
  }
  return [mouseInd, mouseInd+1];
}

function getNeuronHeight(j) {
  return rasterPosY + padding*j + padding/2;
}

function neuronIsHighlighted(j) {
  return (j === mouseInds[0] || j === mouseInds[1]);
}

function drawInputData(inputData, t) {
  strokeWeight(2);
  let eventTimes = [inputData[2]];//, inputData[3]];
  for (let j = 0; j < eventTimes.length; j++) {
    for (let i = 0; i < eventTimes[j].length; i++) {
      let y = getNeuronHeight(j) - 1*padding;
      let x = eventTimes[j][i] - t;
      
      // allows event times to wrap
      let x1 = eventTimes[j][i] - t + nTimesteps;
      if (x1 >= 0 && x1 < rasterWidth) {
        x = x1;
      }

      if (x >= 0 && x < rasterWidth) {
        let clr = eventColor;
        if (inCountingWindow(t, x)) {
          clr = eventColorActive;
        }
        stroke(clr);
        line(x, y - 0.8*padding/2, x, y + 0.8*padding/2);
      }
    }
  }
}

function labelRasters() {
  noStroke();
  fill(labelColor);
  textAlign(LEFT, CENTER);
  let textPadding = 5;
  
  let y = getNeuronHeight(-1);
  text('Stimulus', textPadding, y);

  for (let j = 0; j < nNeurons; j++) {
    if (neuronIsHighlighted(j)) {
      let y = getNeuronHeight(j);
      text('Neuron ' + (j+1).toString(), textPadding, y);
    }
  }
}

function inCountingWindow(t, tSpike) {
  return (tSpike >= rasterWindowStart) && (tSpike < rasterWindowStart + binSize);
}

function drawRasterAndCountSpikes(spikeTimes, t) {

  strokeWeight(2);
  let counts = [];

  for (let j = 0; j < spikeTimes.length; j++) {
    let count = 0;
    for (let i = 0; i < spikeTimes[j].length; i++) {
      let y = getNeuronHeight(j);
      let x = spikeTimes[j][i] - t;

      // allows spike times to wrap
      let x1 = spikeTimes[j][i] - t + nTimesteps;
      if (x1 >= 0 && x1 < rasterWidth) {
        x = x1;
      }
      
      if (x >= 0 && x < rasterWidth) {
        let clr = spikeColor;
        if (inCountingWindow(t, x)) {
          if (neuronIsHighlighted(j)) {
            clr = spikeColorHighlighted;
          } else {
            clr = spikeColorActive;
          }
          count += 1;
        }
        stroke(clr);
        line(x, y - 0.8*padding/2, x, y + 0.8*padding/2);
      }
    }
    counts.push(count);
  }
  labelRasters();

  return counts;
}

function drawRectHighlighter() {
  fill(rectColor); noStroke();
  stroke(rectColor); strokeWeight(1); noFill();
  
  // draw rect around the neurons being highlighted by the mouse
  if (mouseInds[0] === mouseInds[1]-1) {
    rect(rasterWindowStart, getNeuronHeight(mouseInds[0])- padding/2, binSize, 2*padding);
  } else {
    rect(rasterWindowStart, getNeuronHeight(mouseInds[0])- padding/2, binSize, padding);
    rect(rasterWindowStart, getNeuronHeight(mouseInds[1])- padding/2, binSize, padding);
  }
}

function drawTitle() {
  stroke(bgColor);
  strokeWeight(10);
  fill(labelColor);
  textFont('Futura');
  textAlign(CENTER, CENTER);
  textSize(50);
  text('Hennig\nLab', window.innerWidth/2, window.innerHeight/4);
  textSize(defaultTextSize);
  textFont(defaultFont);
}

function keyPressed() {
  if (keyCode === 77) { // m
    darkMode = !darkMode;
    setColors();
  } else if (keyCode === 173) { // -
    timestepsPerFrame -= 1;
    timestepsPerFrame = constrain(timestepsPerFrame, 1, 5);
  } else if (keyCode === 61) { // +
    timestepsPerFrame += 1;
    timestepsPerFrame = constrain(timestepsPerFrame, 1, 5);
  } else if (keyCode === 32) { // space
    showScatter = !showScatter;
  }
}

function draw() {
  // update time step
  t = (t + timestepsPerFrame) % nTimesteps;
  
  // draw solid background
  background(bgColor);
  
  // get currently updated mouse inds
  mouseInds = getHighlightedInds();
  // if mouseInds changed since last time, clear pts
  if (mouseInds[0] != prevMouseInds[0]) {
    pts = [];
  }
  prevMouseInds = mouseInds;
  drawRectHighlighter();

  // draw and count spikes
  drawInputData(inputData, t);
  counts = drawRasterAndCountSpikes(spikeTimes, t);
  
  // save spike count vector every stride
  if (t % strideSize === 0) {
    pts.push(counts.slice());
  }

  // draw scatter of spike rates
  if (showScatter) {
    drawScatter(pts, counts, mouseInds[0], mouseInds[1]);
  }
  // drawTitle();
}
