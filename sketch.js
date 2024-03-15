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
let defaultTextSize = 16;
let defaultFont = 'Courier New';
let showScatter = true;

// params for fake spike data
let nNeurons = 30;
let minRate = 0.025;
let maxRate = 0.15;
let nTimesteps = 8000; // total number of timesteps
let maxDelay = 200;
let infoDuration = 50; // duration of info boxes

// params for counting spikes
// let binSize = 200;
let binSize;
let strideSize = 1;
let timestepsPerFrame = 1;

let data;
let t;
let cnvWidth;
let cnvHeight;
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

class Neuron {
  constructor(index, minRate, maxRate, maxDelay) {
    this.index = index;
    this.pBase = random(0.01, 0.02);
    this.decayDrive = 0.5; // time constant for stim
    this.maxDelay = maxDelay;
    this.delay = floor(random(1, maxDelay));
    this.pStim = maxRate; //random(minRate, maxRate);
    this.inputDrive = [];
    this.spikes = [];
    this.cDrive = 0;
  }

  fillDrive(inputData) {
    let inputDrive = [];
    let cDrive = 0;
    for (let t = 0; t < inputData.length; t++) {
      if (inputData[t] === 1) {
        cDrive = 1;
      } else {
        cDrive = cDrive*this.decayDrive;
      }
      inputDrive.push(cDrive);
    }
    this.cDrive = cDrive;
    this.inputDrive = inputDrive;
    this.nTimesteps = inputData.length;
    return inputDrive;
  }

  fillSpikes(inputDrive) {
    let spikes = [];
    for (let t = 0; t < inputDrive.length; t++) {
      // let tCur = t + this.maxDelay - 1 - this.delay;
      let tCur = max(0, t - this.delay);
      let pCur = this.pBase + inputDrive[tCur]*this.pStim;
      if (random(0,1) < pCur) {
        spikes.push(1);
      } else {
        spikes.push(0);
      }
    }
    this.spikes = spikes;
  }

  fill(inputData) {
    let inputDrive = this.fillDrive(inputData);
    this.fillSpikes(inputDrive);
  }

  updateDrive(cInput) {
    if (cInput > 0) {
      this.cDrive = cInput;
    } else {
      this.cDrive = this.cDrive*this.decayDrive;
    }
    this.inputDrive.push(this.cDrive); // add new entry
    this.inputDrive = this.inputDrive.slice(-this.nTimesteps); // pop early entries
    return this.cDrive;
  }

  updateSpikes(cDrive) {
    let t = this.inputDrive.length-1;
    let tCur = max(0, t - this.delay);
    let pCur = this.pBase + this.inputDrive[tCur]*this.pStim;
    if (random(0,1) < pCur) {
      this.spikes.push(1);
    } else {
      this.spikes.push(0);
    }
    this.spikes = this.spikes.slice(-this.nTimesteps); // pop first entries
  }

  update(cInput) {
    let cDrive = this.updateDrive(cInput);
    this.updateSpikes(cDrive);
  }

  render() {
    let count = 0;
    strokeWeight(2);
    for (let t = 0; t < this.spikes.length; t++) {
      if (this.spikes[t] === 0) {
        continue;
      }
      let y = getNeuronHeight(this.index);
      
      let clr = spikeColor;
      if (inCountingWindow(t)) {
        if (neuronIsHighlighted(this.index)) {
          clr = spikeColorHighlighted;
        } else {
          clr = spikeColorActive;
        }
        count += 1;
      }
      stroke(clr);
      line(t, y - 0.8*padding/2, t, y + 0.8*padding/2);
    }
    return count;
  }
}

class Stimulus {
  constructor(nTimesteps) {
    this.nTimesteps = nTimesteps;
    this.history = this.fill(nTimesteps);
    this.stepsSinceLastClick = 0;
    this.maxStimGap = 1000; // max number of timesteps without stim
    this.autoStimDur = 0;
  }

  fill(nTimesteps) {
    let history = [];
    for (let t = 0; t < nTimesteps; t++) {
      history.push(0);
    }
    return history;
  }

  update() {
    if (mouseIsPressed === true) {
      this.stepsSinceLastClick = 0;
      this.history.push(1);
    } else if (this.autoStimDur > 0) {
      this.autoStimDur -= 1;
      this.history.push(1);
    } else {
      this.history.push(0);
      this.stepsSinceLastClick += 1;
      if (this.stepsSinceLastClick > this.maxStimGap) {
        this.stepsSinceLastClick = 0;
        this.autoStimDur = floor(random(100, 200));
      }
    }
    this.history = this.history.slice(-this.nTimesteps); // only keep most recent entries
  }

  cur() {
    return this.history[this.history.length-1];
  }

  render() {
    strokeWeight(2);
    for (let t = 0; t < this.history.length; t++) {
      let y = getNeuronHeight(0) - 1*padding;
      if (this.history[t] === 0) {
        continue;
      }
      let clr = eventColor;
      if (inCountingWindow(t)) {
        clr = eventColorActive;
      }
      stroke(clr);
      line(t, y - 0.8*padding/2, t, y + 0.8*padding/2);
    }
  }
}

class Data {

  constructor(nTimesteps) {
    this.nTimesteps = nTimesteps;

    // init input data
    this.stimulus = new Stimulus(this.nTimesteps);

    // init neurons with spiking history
    this.neurons = [];
    for (let j = 0; j < nNeurons; j++) {
      let neuron = new Neuron(j, minRate, maxRate, maxDelay);
      neuron.fill(this.stimulus.history);
      this.neurons.push(neuron);
    }
  }

  update(tDelta) {
    for (let t = 0; t < tDelta; t++) {
      this.stimulus.update();
      for (let j = 0; j < this.neurons.length; j++) {
        this.neurons[j].update(this.stimulus.cur());
      }
    }
  }

  renderLabels() {
    noStroke();
    fill(labelColor);
    textAlign(LEFT, CENTER);
    let textPadding = 5;
    
    let y = getNeuronHeight(-1);
    // text('stimulus', textPadding, y);
    textAlign(RIGHT, CENTER);
    text('stimulus', rasterWindowStart - textPadding, y);

    for (let j = 0; j < this.neurons.length; j++) {
      if (neuronIsHighlighted(j)) {
        let y = getNeuronHeight(j);
        // text('neuron ' + (j+1).toString(), textPadding, y);
        text('neuron ' + (j+1).toString(), rasterWindowStart - textPadding, y);
      }
    }
  }

  render(showLabels) {
    this.stimulus.render();
    let counts = [];
    for (let j = 0; j < this.neurons.length; j++) {
      counts.push(this.neurons[j].render());
    }
    if (showLabels) {
      this.renderLabels();
    }
    return counts;
  }
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

  // define canvas size based on window
  cnvWidth = window.innerWidth;
  cnvHeight = window.innerHeight;
  rasterWidth = cnvWidth;
  let maxScatterAxisLength = 250;

  if (cnvWidth > 700) { // scatter on raster
    if (cnvHeight > 800) { // don't use all height
      cnvHeight *= 1/2;
    }
    rasterHeight = cnvHeight;

    scatterAxisLength = min(maxScatterAxisLength, min(rasterWidth, rasterHeight)/2);
    scatterOriginX = 3*textSize();
    scatterOriginY = cnvHeight - 3*textSize();

  } else { // scatter below raster
    cnvHeight *= 0.9;
    rasterHeight = 2*cnvHeight/3;
    scatterAxisLength = min(maxScatterAxisLength, cnvHeight/3 - 3.1*textSize());
    scatterOriginX = cnvWidth/2 - 0.5*scatterAxisLength;
    scatterOriginY = cnvHeight - 3*textSize();
  }

  // define raster size based on window size
  binSize = min(200, rasterWidth/2);
  rasterWindowStart = rasterWidth - binSize;

  // make room for one input
  padding = rasterHeight / (nNeurons+1);
  rasterPosY = 1*padding;
  prevMouseInds = getHighlightedInds();
  mouseInds = prevMouseInds;
  
  // make data
  data = new Data(rasterWidth);

  createCanvas(cnvWidth, cnvHeight);
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
  text('neuron ' + (mouseInds[0]+1).toString() + ' firing rate', xo + axisLength/2, yo + textPadding);
  
  textAlign(CENTER, BOTTOM);
  push();
  translate(xo - textPadding, yo - axisLength/2);
  rotate(-PI/2);
  text('neuron ' + (mouseInds[1]+1).toString() + ' firing rate', 0, 0);
  pop();
}

function drawScatter(pts, counts, xi, yi) {
  let axPadding = 8; // n.b. keeps axis away from data points

  fill(bgColor);
  noStroke();
  rect(scatterOriginX-axPadding, scatterOriginY+axPadding, scatterAxisLength+axPadding, -scatterAxisLength-axPadding);

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

function inCountingWindow(tCur) {
  return (tCur >= rasterWindowStart) && (tCur < rasterWindowStart + binSize);
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
  text('Hennig\nLab', cnvWidth/2, 1.7*rasterHeight/4);
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
  data.update(timestepsPerFrame);
  counts = data.render(true);

  // save spike count vector every stride
  // update time step
  t = (t + timestepsPerFrame) % strideSize;
  if (t === 0) {
    pts.push(counts);
  }

  // draw scatter of spike rates
  if (showScatter) {
    drawScatter(pts, counts, mouseInds[0], mouseInds[1]);
  }
  drawTitle();
}
