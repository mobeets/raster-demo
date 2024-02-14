// color vars
let axisColor;
let dotColor;
let dotColorActive;
let spikeColor;
let spikeColorActive;
let rectColor;

// params for fake spike data
let nNeurons = 20;
let minRate = 0.025;
let maxRate = 0.1;
let nTimesteps = 2000; // total number of timesteps

// params for counting spikes
let binSize = 200;
let strideSize = 1;
let timestepsPerFrame = 3;

let t;
let spikeTimes;
let padding;
let rasterHeight;
let rasterWidth;
let counts;
let pts;
let mouseInds;
let prevMouseInds;

function makeAllSpikeTimes(nNeurons, minRate, maxRate, nTimesteps) {
  let sps = [];
  for (let j = 0; j < nNeurons; j++) {
    let p = random(minRate, maxRate);
    sps.push(makeSpikeTimes(p, nTimesteps));
  }
  return sps;
}

function makeSpikeTimes(p, nTimesteps) {
  let sps = [];
  for (let t = 0; t < nTimesteps; t++) {
    let scale = 1;
    // if (t > nTimesteps/2) {
    //   scale = 3;
    // }
    if (random(0,1) < scale*p) {
      sps.push(t);
    }
  }
  return sps;
}

function setup() {
  axisColor = 'white';
  dotColor = color(255, 0, 0, 10);
  dotColorActive = color(255, 0, 0, 180);
  spikeColor = color(255, 204, 0, 128);
  spikeColorActive = color(255, 204, 0, 255);
  rectColor = color(255, 0, 0, 100);
  
  t = 0;
  pts = [];
  
  // create fake spike times
  spikeTimes = makeAllSpikeTimes(nNeurons, minRate, maxRate, nTimesteps);
  
  // initialize spike count vector
  counts = [];
  for (let j = 0; j < nNeurons; j++) {
    counts.push(0);
  }
  
  rasterHeight = windowHeight;
  rasterWidth = windowWidth/2;
  padding = rasterHeight / nNeurons;
  prevMouseInds = getHighlightedInds();
  createCanvas(windowWidth, windowHeight);
}

function scatter(x, y, xo, yo, axisLength) {
  let xp = map(x, 0, 0.3*binSize, 0, axisLength);
  let yp = map(y, 0, 0.3*binSize, 0, axisLength);
  circle(xo + xp, yo - yp, 10);
}

function drawScatter(pts, counts, xi, yi) {
  
  let axisLength = 0.8*windowWidth/2;
  let xo = windowWidth/2 + 0.2*axisLength;
  let yo = windowHeight/2 + axisLength/2;
  stroke(axisColor);
  line(xo, yo, xo, yo-axisLength);
  line(xo, yo, xo+axisLength, yo);
  
  fill(dotColor);
  noStroke();
  for (let t = 0; t < pts.length; t++) {
    scatter(pts[t][xi], pts[t][yi], xo, yo, axisLength);
  }
  fill(dotColorActive);
  scatter(counts[xi], counts[yi], xo, yo, axisLength);
}

function getHighlightedInds() {
  let mouseInd = floor(map(mouseY, 0, rasterHeight, 0, nNeurons));
  return [mouseInd, mouseInd+1];
}

function getNeuronHeight(j) {
  return padding*j + padding/2;
}

function draw() {
  t = (t + timestepsPerFrame) % nTimesteps;
  
  // clear scatter points
  if (t === 0) { pts = []; }
  
  // save spike count every stride
  if (t > binSize && t % strideSize === 0) {
    let copyCounts = [];
    for (let j = 0; j < counts.length; j++) {
      copyCounts.push(counts[j]);
    }
    pts.push(copyCounts);
  }
  background(0);
  
  mouseInds = getHighlightedInds();
  
  // if mouseInds changed since last time, clear pts
  if (mouseInds[0] != prevMouseInds[0]) {
    pts = [];
  }
  prevMouseInds = mouseInds;
  
  // draw scatter of spike rates
  drawScatter(pts, counts, mouseInds[0], mouseInds[1]);
  
  // clear counts
  for (let j = 0; j < counts.length; j++) {
    counts[j] = 0;
  }
  
  // draw spikes
  strokeWeight(2);
  for (let j = 0; j < spikeTimes.length; j++) {
    for (let i = 0; i < spikeTimes[j].length; i++) {
      let y = getNeuronHeight(j);
      // let x = t - spikeTimes[j][i] + rasterWidth;
      let x = spikeTimes[j][i] - t;
      
      if (x < rasterWidth) {
        let clr = spikeColor;
        if (x < rasterWidth/2 - binSize/2) {
        } else if (x > rasterWidth/2 + binSize/2) {
        } else {
          clr = spikeColorActive;
          counts[j] = counts[j] + 1;
        }
        stroke(clr);
        line(x, y - 0.8*padding/2, x, y + 0.8*padding/2);
      }
    }
  }
  
  // draw red window
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