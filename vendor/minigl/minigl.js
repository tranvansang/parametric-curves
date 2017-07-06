//require glUtils.js, sylvester.js

const VERTEX_SIZE = 3;
const COLOR_SIZE = 4;
class MiniGL {
  constructor(canvas, {
    background = [1., 1., 1., 1.],
    camera = [0., 0., 1.]
  } = {}
  ){
    console.assert(canvas);
    console.assert(background.length == 4);
    console.assert(camera.length == 3);
    //Get gl object
    let gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl") || canvas.getContext("webkit-3d") || canvas.getContext("moz-webgl");
    if (!gl) throw "Your browser does not support WebGL!!";
    this.gl = gl;
    this.background = background;

    //Fragment shader
    let fsSource = `
      precision mediump float;\
      varying lowp vec4 vColor;
      void main(void) {
        gl_FragColor = vColor;
      }`;
    let fsShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsShader, fsSource);
    gl.compileShader(fsShader);
    if (!gl.getShaderParameter(fsShader, gl.COMPILE_STATUS)) throw "Cannot compile fragment shader";

    //Vertex shader
    let vsSource = `
      attribute vec3 aVertexPosition;
      attribute vec4 aVertexColor;

      uniform mat4 uMVMatrix;
      uniform mat4 uPMatrix;

      varying lowp vec4 vColor;

      void main(void) {
        gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
        vColor = aVertexColor;
        gl_PointSize = 5.0;
      }
    `;
    let vsShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsShader, vsSource);
    gl.compileShader(vsShader);
    if (!gl.getShaderParameter(vsShader, gl.COMPILE_STATUS)) throw "Cannot compile vertex shader";

    //link shader program
    this.shaderProgram = gl.createProgram();
    gl.attachShader(this.shaderProgram, vsShader);
    gl.attachShader(this.shaderProgram, fsShader);
    gl.linkProgram(this.shaderProgram);
    gl.useProgram(this.shaderProgram);
    if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) throw "Cannot link shader program";

    this.camera = camera;

    //attributes
    this.vertexPositionAttribute = gl.getAttribLocation(this.shaderProgram, 'aVertexPosition');
    gl.enableVertexAttribArray(this.vertexPositionAttribute);
    this.vertexColorAttribute = gl.getAttribLocation(this.shaderProgram, 'aVertexColor');
    gl.enableVertexAttribArray(this.vertexColorAttribute);

    //basic setup
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    this.color = background.slice(0, 3).map(x => 1 - x).concat([1.]); //default color

    //data buffer
    this.vertices = [];
    this.colors = [];
    this.clear();
  }

  set camera(camera){
    this._camera = camera;
    //perspective matrix
    let horizAspect = 1.;//canvas.height / canvas.width;
    let perspectiveMatrix = makePerspective(45, horizAspect, 0.1, 100.0);
    let pUniform = this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");
    this.gl.uniformMatrix4fv(pUniform, false, new Float32Array(perspectiveMatrix.flatten()));
    //model view matrix
    let mvMatrix = Matrix.Translation($V(camera).x(-1)).ensure4x4();
    let mvUniform = this.gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
    this.gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));

    this.projectionMatrix = perspectiveMatrix.x(mvMatrix);
  }

  get camera(){ return this._camera; }

  clear(){
    let gl = this.gl;
    gl.clearColor.apply(gl, this.background);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  _draw(type){
    if (this.vertices.length == 0) return;
    let gl = this.gl;

    let glVerticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glVerticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(this.vertexPositionAttribute, VERTEX_SIZE, gl.FLOAT, false, 0, 0);

    let glColorsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glColorsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.STATIC_DRAW);
    gl.vertexAttribPointer(this.vertexColorAttribute, COLOR_SIZE, gl.FLOAT, false, 0, 0);

    this.gl.drawArrays(type, 0, this.vertices.length / VERTEX_SIZE);
    this.vertices = [];
    this.colors = [];
  }

  drawTriangle(){ this._draw(this.gl.TRIANGLE_STRIP); }
  drawLine(){ this._draw(this.gl.LINE_STRIP); }
  drawPoint(){ this._draw(this.gl.POINT_STRIP); }

  addPoint(point, color = this.color){
    console.assert(point.length == VERTEX_SIZE);
    console.assert(color.length == COLOR_SIZE);
    this.vertices.push(...point);
    this.colors.push(...color);
  }
}

