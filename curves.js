"use strict";
//require minigl.js, glUtils.js, sylvester.js
var miniGL, points;

const MODE_PAN = 0;
const MODE_ADD = 1;
const MODE_REMOVE = 2;

var factCache = [];
function fact(n){
  if (n == 0) return 1;
  if (typeof factCache[n] != 'undefined') return factCache[n];
  factCache[n] =  n * fact(n - 1);
  return factCache[n];
}

function bezierCurve(t, r){
  let coefs = []; let n = points.length;
  for(let i = 0; i < n; i++)
    coefs.push((i == 0 || i == n - 1 ? 1. : r) * fact(n - 1) / fact(i) / fact(n - 1 - i) * Math.pow(t, i) * Math.pow(1 - t, n - 1 - i));
  var sum = 0;
  coefs.forEach(coef => sum += coef);
  var ret = Vector.Zero(3);
  coefs.forEach((x, i) => ret = ret.add($V(points[i]).x(sum == 0 ? x : x / sum)));
  return ret.elements;
}

function draw(){
  let nSteps = Math.max(1, ~~document.getElementById("nSteps").value);
  let isShowSamplePoints = !!document.getElementById("showSamplePoints").checked;
  let rational = parseFloat(document.getElementById("rational").value);
  if (rational == NaN) rational = 1.;

  miniGL.clear();
  miniGL.color = [0., 0., 0., 1.];
  points.forEach(x => miniGL.addPoint(x));
  miniGL.drawLine();

  points.forEach(x => miniGL.addPoint(x));
  miniGL.drawPoint();

  //draw curve here
  miniGL.color = [1., .2, .6, 1.];
  let curvePoints = [];
  for(let i = 0; i <= nSteps; i++) curvePoints.push(bezierCurve(i / nSteps, rational));
  if (isShowSamplePoints){
    curvePoints.slice(1, curvePoints.length - 1).forEach(x=> miniGL.addPoint(x));
    miniGL.drawPoint();
  }
  curvePoints.forEach(x=>miniGL.addPoint(x));
  miniGL.drawLine();
}

function getMousePos(canvas, evt){
  if (evt.offsetX) return [evt.offsetX, canvas.height - evt.offsetY];
  if (evt.layerX) return [evt.layerX, canvas.height - evt.layerY];
  let rect = canvas.getBoundingClientRect();
  return [evt.clientX - rect.left, canvas.height - evt.clientY + rect.top];
}

function getMode(){
  let modes = document.getElementsByName("mode");
  for(let i = 0; i < modes.length; i++)
    if (modes[i].checked){
      switch(modes[i].value){
        case "pan": return MODE_PAN;
        case "add": return MODE_ADD;
        case "remove": return MODE_REMOVE;
      }
    }
}

function normalizeGL(point){
  let planeOrigin = Vector.Zero(3);
  let planeNormal = $V([0, 0, 1]);
  let camera = $V(miniGL.camera);
  let eyeToMouse = $V(point).subtract(camera);
  let eyeToOrigin = planeOrigin.subtract(camera);
  let s1 = eyeToMouse.dot(planeNormal);
  let s2 = eyeToOrigin.dot(planeNormal);
  let eyeToIntersection = eyeToMouse.x(s2 / s1);
  return camera.add(eyeToIntersection).elements;
}

function main(){
  let canvas = document.getElementById("canvas");
  if (!canvas) throw "Canvas element is not found";

  miniGL = new MiniGL(canvas, {camera: [0, 0, 6]});
  points = [[1.0, 1.0, 0.0],
            [0., -1., 0.0],
            [-1., 0., 0.0]
           ];
  draw();

  var selectedIndex = -1;
  canvas.onmousedown = evt =>{
    let mode = getMode();
    let mousePos = getMousePos(canvas, evt).concat([1]);
    let viewport = [0, 0, canvas.width, canvas.height];
    if (mode == MODE_ADD){
      let glPos = winToGL(mousePos, miniGL.projectionMatrix, viewport);
      points.push(normalizeGL(glPos));
      draw();
      return;
    }
    var minDist = -1;
    for(let i = 0; i < points.length; i++){
      let winPos = glToWin(points[i], miniGL.projectionMatrix, viewport);
      let dist = $V(winPos).distanceFrom($V(mousePos));
      if (minDist == -1 || dist < minDist){
        minDist = dist;
        selectedIndex = i;
      }
    }
    if (selectedIndex == -1) return;
    if (mode == MODE_REMOVE){
      if (points.length > 3){
        points.splice(selectedIndex, 1);
        draw();
      }
      selectedIndex = -1;
    }
  };
  canvas.onmousemove = evt => {
    if (selectedIndex == -1 || getMode() != MODE_PAN) return;
    let mousePos = getMousePos(canvas, evt).concat([1]);
    let viewport = [0, 0, canvas.width, canvas.height];
    let glPos = winToGL(mousePos, miniGL.projectionMatrix, viewport);
    points[selectedIndex] = normalizeGL(glPos);
    draw();
  };
  document.onmouseup = () => selectedIndex = -1;
}
