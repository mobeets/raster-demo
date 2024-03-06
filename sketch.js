// color vars
let bgColor;
let axisColor;
let labelColor;
let dotColor;
let dotColorActive;
let spikeColor;
let spikeColorActive;
let eventColor;
let rectColor;

// params for fake spike data
let nNeurons = 20;
let minRate = 0.025;
let maxRate = 0.15;
let nTimesteps = 1000; // total number of timesteps
let maxDelay = 200;

// params for counting spikes
let binSize = 200;
let strideSize = 1;
let timestepsPerFrame = 4;

// for creating fake data
let inputData;
let spikeTimes;

let t;
let padding;
let rasterPosY;
let rasterHeight;
let rasterWidth;
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
  console.log(rates);
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

function setup() {
  bgColor = 'black';
  axisColor = 'white';
  labelColor = 'white';
  dotColor = color(255, 0, 0, 30);
  dotColorActive = color(255, 0, 0, 180);
  spikeColor = color(255, 204, 0, 128);
  spikeColorActive = color(255, 204, 0, 255);
  rectColor = color(255, 0, 0, 100);
  eventColor = 'blue';
  textSize(14);
  
  t = 0;
  pts = [];
  
  // create fake spike times
  inputData = makeInputs(nTimesteps);
  spikeTimes = makeSpikeTimes(inputData, nNeurons, minRate, maxRate, nTimesteps);
  
  rasterWidth = windowWidth;
  rasterHeight = windowHeight/2;

  // make room for one inputs
  padding = rasterHeight / (nNeurons+1);
  rasterPosY = 1*padding;
  rasterHeight = rasterHeight - rasterPosY;

  prevMouseInds = getHighlightedInds();
  mouseInds = prevMouseInds;
  createCanvas(windowWidth, windowHeight);
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
  let axisLength = 0.9*windowHeight-rasterHeight;
  let xo = windowWidth/2 - 0.5*axisLength;
  let yo = windowHeight - 2*textSize();
  let axPadding = 8; // n.b. keeps axis away from data points
  stroke(axisColor);
  line(xo-axPadding, yo+axPadding, xo-axPadding, yo-axisLength);
  line(xo-axPadding, yo+axPadding, xo+axisLength, yo+axPadding);
  
  fill(dotColor);
  noStroke();
  for (let t = 0; t < pts.length; t++) {
    scatter(pts[t][xi], pts[t][yi], xo, yo, axisLength);
  }
  fill(dotColorActive);
  scatter(counts[xi], counts[yi], xo, yo, axisLength);
  labelScatter(xo, yo, axisLength);
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

function drawInputData(inputData, t) {
  strokeWeight(2);
  let eventTimes = [inputData[2]];//, inputData[3]];
  for (let j = 0; j < eventTimes.length; j++) {
    for (let i = 0; i < eventTimes[j].length; i++) {
      let y = getNeuronHeight(j) - 1*padding;
      let x = eventTimes[j][i] - t;
      if (x < rasterWidth) {
        stroke(eventColor);
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
    if (j === mouseInds[0] || j === mouseInds[1]) {
      let y = getNeuronHeight(j);
      text('Neuron ' + (j+1).toString(), textPadding, y);
    }
  }
}

function drawRasterAndCountSpikes(spikeTimes, t) {

  strokeWeight(2);
  let counts = [];

  for (let j = 0; j < spikeTimes.length; j++) {
    let count = 0;
    for (let i = 0; i < spikeTimes[j].length; i++) {
      let y = getNeuronHeight(j);
      // let x = t - spikeTimes[j][i] + rasterWidth;
      // let x = (spikeTimes[j][i] % nTimesteps) - t;
      let x = spikeTimes[j][i] - t;
      
      if (x < rasterWidth) {
        let clr = spikeColor;
        if (x < rasterWidth/2 - binSize/2) {
        } else if (x > rasterWidth/2 + binSize/2) {
        } else {
          clr = spikeColorActive;
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
  fill(rectColor);
  noStroke();
  // rect(rasterWidth/2 - binSize/2, 2, binSize, rasterHeight-4);
  
  // draw rect around the neurons being highlighted by the mouse
  if (mouseInds[0] === mouseInds[1]-1) {
    rect(rasterWidth/2 - binSize/2, getNeuronHeight(mouseInds[0])- padding/2, binSize, 2*padding);
  } else {
    rect(rasterWidth/2 - binSize/2, getNeuronHeight(mouseInds[0])- padding/2, binSize, padding);
    rect(rasterWidth/2 - binSize/2, getNeuronHeight(mouseInds[1])- padding/2, binSize, padding);
  }
}

// todo: infinite loop of data using mod t
// make the whole thing horizontal instead of vertical
function draw() {
  // update time step
  t = (t + timestepsPerFrame) % nTimesteps;
  
  // clear scatter points when time is up
  // if (t < timestepsPerFrame) { pts = []; }
  
  // draw solid background
  background(bgColor);
  
  // draw and count spikes
  drawInputData(inputData, t);
  counts = drawRasterAndCountSpikes(spikeTimes, t);
  
  // save spike count vector every stride
  if (t > binSize && t % strideSize === 0) {
    pts.push(counts.slice());
  }

  // get currently updated mouse inds
  mouseInds = getHighlightedInds();
  // if mouseInds changed since last time, clear pts
  if (mouseInds[0] != prevMouseInds[0]) {
    pts = [];
  }
  prevMouseInds = mouseInds;

  // draw scatter of spike rates
  drawScatter(pts, counts, mouseInds[0], mouseInds[1]);
  
  drawRectHighlighter();
}