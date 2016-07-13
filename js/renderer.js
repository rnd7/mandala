"use strict";

const _ = require('underscore');
const Mousetrap = require('mousetrap');
const tinycolor = require("tinycolor2");
const remote = require('electron').remote;
const ui = require('../js/ui.js');

var THREE = require('three');

/* Shader */
require('../js/shaders/CopyShader.js');
require('../js/shaders/KaleidoscopeShader.js');

/* Compositing */
require('../js/postprocessing/EffectComposer.js');
require('../js/postprocessing/RenderPass.js');
require('../js/postprocessing/MaskPass.js');
require('../js/postprocessing/ShaderPass.js');
require('../js/postprocessing/KaleidoscopePass.js');

/* Math Util ************************************************************/

const DEG2RAD = Math.PI / 180;
const RAD2DEG = Math.PI * 180;
const PI2 = Math.PI * 2;

function randomFloat(a, b){
  if(typeof a !== "number") a = 0;
  if(typeof b !== "number") b = 1;
  if(a > b) b ^= (a ^ (a=b)); // swap if a is less than b
  return a + Math.random()*(b-a);
}

function randomInt(a, b){
  return Math.round(randomFloat(a, b));
}

function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function wrap(value, min, max){
  return ((value-min) % (max - min) ) + min;
}

function gcd(u, v){
    if (u == v) return u;
    if (u == 0) return v;
    if (v == 0) return u;
    // look for factors of 2
    if (~u & 1) {
      // u is even
      if (v & 1) return gcd(u >> 1, v); // v is odd
      else return gcd(u >> 1, v >> 1) << 1; // both u and v are even
    }
    if (~v & 1) return gcd(u, v >> 1); // u is odd, v is even
    if (u > v) return gcd((u - v) >> 1, v); // reduce larger argument
    return gcd( (v - u) >> 1, u );
}


/* App ************************************************************************/

var scene, camera, root, renderer, composer, container, kaleidoscopePass,
kaleidoscopeSides = 6;

var paused = false;
var mouseActive = true;

var mouse = new THREE.Vector2();
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var timeFactor = 1;

var clock = new THREE.Clock();

var selectedLayer = -1;
var layers = []


window.onload = function() {
  initCamera();
  initScene();
  initRenderer();
  bindUI();
  registerListeners();
  animate();
}

function initCamera() {
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 500;
}

function initScene() {
  scene = new THREE.Scene();
  var lights = [];
	lights[ 0 ] = new THREE.PointLight( 0xffffff, 1, 0 );
	lights[ 1 ] = new THREE.PointLight( 0xffffff, 1, 0 );
	lights[ 2 ] = new THREE.PointLight( 0xffffff, 1, 0 );
	lights[ 0 ].position.set( 0, 1000, 0 );
	lights[ 1 ].position.set( 300, 1000, 300 );
	lights[ 2 ].position.set( - 300, - 300, - 300 );
	scene.add( lights[ 0 ] );
	scene.add( lights[ 1 ] );
	scene.add( lights[ 2 ] );

  randomize();
}

function initRenderer() {

  container = document.createElement('div');
  document.body.appendChild(container);

	renderer = new THREE.WebGLRenderer();
	renderer.setClearColor( 0x000009 );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
  //renderer.sortObjects = false;
	container.appendChild( renderer.domElement );

	composer = new THREE.EffectComposer( renderer );
	composer.addPass( new THREE.RenderPass( scene, camera ) );

  kaleidoscopePass = new THREE.KaleidoscopePass( kaleidoscopeSides, -Math.PI/2 )
  kaleidoscopePass.renderToScreen = true;
	composer.addPass( kaleidoscopePass );
}

function TKLayer() {

  this.material = new THREE.MeshPhongMaterial( {
		color: 0x000000,
		emissive: 0xFFFFFF,
		side: THREE.FrontSide,
		shading: THREE.FlatShading
	} );
  this.material.transparent = true;
  this.opacity = randomFloat(.5,1.);
  this.materialUpdateRequired = true;
  this.geometryUpdateRequired = true;
  this.scaleUpdateRequired = true;
  this.col = tinycolor.random().toHsv()
  this.tubeSize = randomInt( TKLayer.MIN_TUBESIZE, TKLayer.MAX_TUBESIZE);
  this.scaleFactor = randomFloat( TKLayer.MIN_SCALE, TKLayer.MAX_SCALE );
  this.p = 2;
  this.q = 3;
  this.offset = {
    x: randomFloat( -TKLayer.MAX_OFFSET/4, TKLayer.MAX_OFFSET/4 ),
    y: randomFloat( -TKLayer.MAX_OFFSET/4, TKLayer.MAX_OFFSET/4 ),
    z: randomFloat( -TKLayer.MAX_OFFSET/4, 0 )
  };
  this.speed = {
    factor: randomFloat( -TKLayer.MAX_SPEED_FACTOR, TKLayer.MAX_SPEED_FACTOR),
    x: randomFloat( -TKLayer.MAX_SPEED, TKLayer.MAX_SPEED ),
    y: randomFloat( -TKLayer.MAX_SPEED, TKLayer.MAX_SPEED ),
    z: randomFloat( -TKLayer.MAX_SPEED, TKLayer.MAX_SPEED )
  };
  THREE.Object3D.call(this);
  this.rotation.x = randomFloat(-Math.PI, Math.PI);
  this.rotation.y = randomFloat(-Math.PI, Math.PI);
  this.rotation.z = randomFloat(-Math.PI, Math.PI);
  this.update(0);
};
TKLayer.MAX_SCALE = 20;
TKLayer.MIN_SCALE = 1;
TKLayer.SCALE_FACTOR = 1.2;
TKLayer.MAX_SPEED = 1;
TKLayer.MAX_SPEED_FACTOR = 2;
TKLayer.MIN_TUBESIZE = 1;
TKLayer.MAX_TUBESIZE = 10;
TKLayer.MAX_OFFSET = 100;
TKLayer.prototype = Object.create(THREE.Object3D.prototype);
TKLayer.prototype.constructor = TKLayer;
_.extend(
  TKLayer.prototype,
  {
    setScale(value){
      this.scaleFactor = clamp( value, TKLayer.MIN_SCALE, TKLayer.MAX_SCALE );
      this.scaleUpdateRequired = true;
    },
    getScale(){
      return this.scaleFactor;
    },
    setHue(value){
      this.col.h = wrap( value, 0, 360 );
      this.materialUpdateRequired = true;
    },
    getHue(){
      return this.col.h;
    },
    setSaturation(value){
      this.col.s = clamp( value, 0, 1 );
      this.materialUpdateRequired = true;
    },
    getSaturation(){
      return this.col.s;
    },
    setValue(value){
      this.col.v = clamp( value, 0, 1 );
      this.materialUpdateRequired = true;
    },
    getValue(){
      return this.col.v;
    },
    setOpacity(value){
      this.opacity = clamp( value, 0, 1 );
      this.materialUpdateRequired = true;
    },
    getOpacity(){
      return this.opacity;
    },
    setOffsetX( value ) {
      this.offset.x = value;
    },
    getOffsetX() {
      return this.offset.x;
    },
    setOffsetY( value ) {
      this.offset.y = value;
    },
    getOffsetY() {
      return this.offset.y;
    },
    setOffsetZ( value ) {
      this.offset.z = value;
    },
    getOffsetZ() {
      return this.offset.z;
    },
    setSpeedX( value ) {
      this.speed.x = value;
    },
    getSpeedX() {
      return this.speed.x;
    },
    setSpeedY( value ) {
      this.speed.y = value;
    },
    getSpeedY() {
      return this.speed.y;
    },
    setSpeedZ( value ) {
      this.speed.z = value;
    },
    getSpeedZ() {
      return this.speed.z;
    },
    setSpeedFactor( value ) {
      this.speed.factor = value;
    },
    getSpeedFactor() {
      return this.speed.factor;
    },
    setTubeSize(value){
      this.tubeSize = clamp( value, TKLayer.MIN_TUBESIZE, TKLayer.MAX_TUBESIZE )
      this.geometryUpdateRequired = true;
    },
    getTubeSize(){
      return this.tubeSize;
    },
    setP(value){
      while(gcd(value,this.q)!=1) value++;
      this.p = value;
      this.geometryUpdateRequired = true;
    },
    getP(){
      return this.p;
    },
    setQ(value){
      while(gcd(value,this.p)!=1) value++;
      this.q = value;
      this.geometryUpdateRequired = true;
    },
    getQ(){
      return this.q;
    },
    updateScale() {
      this.scaleUpdateRequired = false;
      this.scale.set( this.scaleFactor/10, this.scaleFactor/10, this.scaleFactor/10 );
      this.updateMatrix();
    },
    updateGeometry() {
      this.geometryUpdateRequired = false;

      if(this.children.length){
        var c = this.remove(this.children[0]);
        if(c) c.dispose();
      }
      this.add(
        new THREE.Mesh(
          new THREE.TorusKnotGeometry( 100, this.tubeSize, 128, 16, this.p , this.q ),
          this.material
        )
      );
    },
    updateMaterial() {
      this.materialUpdateRequired = false;
      this.material.color = new THREE.Color(tinycolor(_.clone(this.col)).darken(50).toHexString())
      this.material.emissive = new THREE.Color(tinycolor(_.clone(this.col)).toHexString())
      this.material.opacity = this.opacity;
      this.material.needsUpdate = true;
    },
    update( delta ){
      if(this.scaleUpdateRequired) this.updateScale();
      if(this.geometryUpdateRequired) this.updateGeometry();
      if(this.materialUpdateRequired) this.updateMaterial();
      this.position.x = this.offset.x;
      this.position.y = this.offset.y;
      this.position.z = this.offset.z;
      this.rotation.x += Math.pow( this.speed.x, 3 ) * this.speed.factor * delta;
      this.rotation.y += Math.pow( this.speed.y, 3 ) * this.speed.factor * delta;
      this.rotation.z += Math.pow( this.speed.z, 3 ) * this.speed.factor * delta;
    }
  }
)

const MIN_RANDOM_LAYERS = 3;
const MAX_RANDOM_LAYERS = 6;

function randomize() {
  var count = randomInt(MIN_RANDOM_LAYERS, MAX_RANDOM_LAYERS);
  _.each( layers, ( layer )=>{
    scene.remove( layer );
  })
  layers = [];
  selectedLayer = -1;
  for(var i = 0; i<count; i++){
    var layer = new TKLayer();
    layers.push(layer);
    scene.add(layer);
  }
  selectedLayer = layers.length - 1;
  ui.update('*[data-dependency="numberOfLayers"]');
  ui.update('*[data-dependency="selectedLayer"]');
}

function addRandomLayer() {
  var layer = new TKLayer();
  layers.push(layer);
  scene.add(layer);
  selectedLayer = layers.length-1;
  ui.update('*[data-dependency="numberOfLayers"]');
  ui.update('*[data-dependency="selectedLayer"]');
}

function removeAllLayers() {
  _.each( layers, ( layer )=>{
    scene.remove( layer );
  })
  layers = [];
  selectedLayer = -1;
  ui.update('*[data-dependency="numberOfLayers"]');
  ui.update('*[data-dependency="selectedLayer"]');
}

function bindUI() {
  var bindings = {
    "#toggleFullscreen": {
      command:{
        "ctrl+f": ui.THRU,
        "f11": ui.THRU,
      },
      process( ev ){
        var window = remote.getCurrentWindow();
        if (!window.isFullScreen()) {
          window.setFullScreen(true);
        } else {
          window.setFullScreen(false);
        }
      }
    },
    "#toggleControls": {
      command:{
        "ctrl+c": ui.THRU,
        "f12": ui.THRU,
      },
      process( ev ){
        var elem = document.getElementById("controls");
        if( elem.style.visibility !== "hidden" ) {
          elem.style.visibility = "hidden"
        } else {
          elem.style.visibility = "visible"
        };
      }
    },
    "#layers": {
      update() { this.value = layers.length; }
    },
    "#selectLayer": {
      command:{
        "l"( ev ) { this.value--;  },
        "L"( ev ) { this.value++; },
      },
      process( ev ){
        selectedLayer = Math.min( layers.length-1, Math.max( !layers.length?-1:0, this.value -1 ) );
        ui.update('*[data-dependency="selectedLayer"]');
      },
      update(){
        this.setAttribute( "max", layers.length );
        this.setAttribute( "min", !layers.length?0:1 );
        this.value = selectedLayer + 1;
      }
    },
    "#addLayer": {
      command:{
        "ctrl+a": ui.THRU,
      },
      process: addRandomLayer
    },
    "#removeLayer": {
      command: {
        "ctrl+x":ui.THRU,
      },
      process( ev ){
        if(selectedLayer != -1){
          var layer = layers.splice(selectedLayer, 1)[0];
          scene.remove(layer);
        }
        if(layers.length){
          selectedLayer = clamp( selectedLayer, 0, layers.length-1 );
        }else{
          selectedLayer = -1;
        }
        ui.update('*[data-dependency="numberOfLayers"]');
        ui.update('*[data-dependency="selectedLayer"]');
      }
    },
    "#removeAllLayers": {
      command: {
        "ctrl+alt+x":ui.THRU,
      },
      process: removeAllLayers
    },
    "#scale": {
      command: {
        "s"( ev ) { this.value -= TKLayer.MIN_SCALE; },
        "S"( ev ) { this.value += TKLayer.MIN_SCALE; },
      },
      process( ev ) {
        var layer = layers[selectedLayer];
        layer.setScale( this.value );
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", TKLayer.MAX_SCALE );
        this.setAttribute( "min", TKLayer.MIN_SCALE );
        this.setAttribute( "step", TKLayer.MIN_SCALE );
        this.value = layer.getScale();
      }
    },
    "#radius": {
      command: {
        "r"( ev ) { this.value--; },
        "R"( ev ) { this.value++; },
      },
      process( ev ) {
        var layer = layers[selectedLayer];
        layer.setTubeSize( this.value );
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", TKLayer.MAX_TUBESIZE );
        this.setAttribute( "min", TKLayer.MIN_TUBESIZE );
        this.setAttribute( "step", 1 );
        this.value = layer.getTubeSize();
      }
    },
    "#p": {
      command: {
        "p"( ev ) { this.value--; },
        "P"( ev ) { this.value++; },
      },
      process( ev ) {
        var layer = layers[selectedLayer];
        layer.setP( clamp( this.value, 1, 6 ) );
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", 6 );
        this.setAttribute( "min", 1 );
        this.setAttribute( "step", 1 );
        this.value = layer.getP();
      }
    },
    "#q": {
      command: {
        "q"( ev ) { this.value--; },
        "Q"( ev ) { this.value++; },
      },
      process( ev ) {
        var layer = layers[selectedLayer];
        layer.setQ( clamp( this.value, 1, 6 ) );
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", 6 );
        this.setAttribute( "min", 1 );
        this.setAttribute( "step", 1 );
        this.value = layer.getQ();
      }
    },
    "#hue": {
      command: {
        "h"( ev ) { this.value--; },
        "H"( ev ) { this.value++; },
      },
      process( ev ) {
        var layer = layers[selectedLayer];
        layer.setHue( this.value );
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", 360 );
        this.setAttribute( "min", 0 );
        this.setAttribute( "step", 1 );
        this.value = layer.getHue();
      }
    },
    "#saturation": {
      command: {
        "c"( ev ) { this.value -= .01; },
        "C"( ev ) { this.value += .01; },
      },
      process( ev ) {
        var layer = layers[selectedLayer];
        layer.setSaturation( this.value );
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", 1 );
        this.setAttribute( "min", 0 );
        this.setAttribute( "step", .01 );
        this.value = layer.getSaturation();
      }
    },
    "#value": {
      command: {
        "v"( ev ) { this.value -= .01; },
        "V"( ev ) { this.value += .01; },
      },
      process( ev ) {
        var layer = layers[selectedLayer];
        layer.setValue( this.value );
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", 1 );
        this.setAttribute( "min", 0 );
        this.setAttribute( "step", 0.01 );
        this.value = layer.getValue();
      }
    },
    "#opacity": {
      command: {
        "o"( ev ) { this.value -= .01; },
        "O"( ev ) { this.value += .01; },
      },
      process( ev ) {
        var layer = layers[selectedLayer];
        layer.setOpacity( this.value );
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", 1 );
        this.setAttribute( "min", 0 );
        this.setAttribute( "step", 0.01 );
        this.value = layer.getOpacity();
      }
    },
    "#offsetX": {
      command: {
        "alt+x"( ev ) { this.value--; },
        "alt+X"( ev ) { this.value++; },
      },
      process( ev ) {
        var layer = layers[selectedLayer];
        layer.setOffsetX( this.value );
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", TKLayer.MAX_OFFSET );
        this.setAttribute( "min", -TKLayer.MAX_OFFSET );
        this.setAttribute( "step", 1 );
        this.value = layer.getOffsetX();
      },
    },
    "#offsetY": {
      command: {
        "alt+y"( ev ) { this.value--; },
        "alt+Y"( ev ) { this.value++; },
      },
      process( ev ) {
        var layer = layers[selectedLayer];
        layer.setOffsetY( this.value );
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", TKLayer.MAX_OFFSET );
        this.setAttribute( "min", -TKLayer.MAX_OFFSET );
        this.setAttribute( "step", 1 );
        this.value = layer.getOffsetY();
      }
    },
    "#offsetZ": {
      command: {
        "alt+z"( ev ) { this.value--; },
        "alt+Z"( ev ) { this.value++; },
      },
      process( ev ) {
        var layer = layers[selectedLayer];
        layer.setOffsetZ( this.value );
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", TKLayer.MAX_OFFSET );
        this.setAttribute( "min", -TKLayer.MAX_OFFSET );
        this.setAttribute( "step", 1 );
        this.value = layer.getOffsetZ();
      }
    },
    "#speedX": {
      command: {
        "x"( ev ) { this.value -= .01; },
        "X"( ev ) { this.value += .01; },
      },
      process( ev ) {
        var layer = layers[selectedLayer];
        layer.setSpeedX( this.value );
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", TKLayer.MAX_SPEED );
        this.setAttribute( "min", -TKLayer.MAX_SPEED );
        this.setAttribute( "step", 0.01 );
        this.value = layer.getSpeedX();
      }
    },
    "#speedY": {
      command: {
        "y"( ev ) { this.value -= .01; },
        "Y"( ev ) { this.value += .01; },
      },
      process( ev ) {
        var layer = layers[selectedLayer];
        layer.setSpeedY( this.value );
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", TKLayer.MAX_SPEED );
        this.setAttribute( "min", -TKLayer.MAX_SPEED );
        this.setAttribute( "step", 0.01 );
        this.value = layer.getSpeedY();
      }
    },
    "#speedZ": {
      command: {
        "z"( ev ) { this.value -= .01; },
        "Z"( ev ) { this.value += .01; },
      },
      process( ev ) {
        var layer = layers[selectedLayer];
        layer.setSpeedZ( this.value );
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", TKLayer.MAX_SPEED );
        this.setAttribute( "min", -TKLayer.MAX_SPEED );
        this.setAttribute( "step", 0.01 );
        this.value = layer.getSpeedZ();
      }
    },
    "#speedFactor": {
      command: {
        "f"( ev ) { this.value -= .01; },
        "F"( ev ) { this.value += .01; },
      },
      process( ev ) {
        var layer = layers[selectedLayer];
        layer.setSpeedFactor( this.value );
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", TKLayer.MAX_SPEED_FACTOR );
        this.setAttribute( "min", -TKLayer.MAX_SPEED_FACTOR );
        this.setAttribute( "step", 0.01 );
        this.value = layer.getSpeedFactor();
      }
    },
    "#sides": {
      command: {
        "-"( ev ) { this.value--; },
        "+"( ev ) { this.value++; },
      },
      process( ev ) {
        kaleidoscopeSides = Math.max(0, Math.min(64,this.value));
        kaleidoscopePass.setSides(kaleidoscopeSides)
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", 64 );
        this.setAttribute( "min", 0 );
        this.setAttribute( "step", 1 );
        this.value = kaleidoscopeSides;
      }
    },
    "#timeFactor": {
      command: {
        "t"( ev ) { this.value -= .01; },
        "T"( ev ) { this.value += .01; },
      },
      process( ev ) {
        timeFactor = Math.max( -1, Math.min( 1, this.value))
      },
      update() {
        var layer = layers[selectedLayer];
        this.setAttribute( "max", 1 );
        this.setAttribute( "min", -1 );
        this.setAttribute( "step", 0.1 );
        this.value = timeFactor;
      }
    },
    "#togglePause": {
      command: {
        "space": ui.THRU,
      },
      process( ev ) {
        paused = !paused;
      },
    },
    "#toggleMouse": {
      command: {
        "ctrl+m": ui.THRU,
      },
      process( ev ) {
        mouseActive = !mouseActive;
      },
    },
    "#randomize": {
      command: {
        "ctrl+alt+r": ui.THRU,
      },
      process: randomize,
    },

  }

  ui.bind(bindings);
  ui.update('*[data-dependency="numberOfLayers"]');
}




function registerListeners() {
  document.addEventListener('mousemove', onDocumentMouseMove, false );
  window.addEventListener('resize', onWindowResize, false );
}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
	composer.setSize( window.innerWidth, window.innerHeight );
}

function onDocumentMouseMove( ev ) {
	mouse.x = ( ev.clientX - windowHalfX );
	mouse.y = ( ev.clientY - windowHalfY );
}

function animate() {
	requestAnimationFrame(animate);
	render();
}

function render() {
	var delta = clock.getDelta();

  if(!paused){
    _.each(scene.children, (child)=>{
      if(child instanceof TKLayer){
        child.update( delta * timeFactor );
      }
    })
  }
  if(mouseActive){
    camera.lookAt(scene.position);
    camera.position.z = 500 + ( mouse.y / windowHalfY * 500 );
    camera.rotation.z = ( mouse.x / windowHalfX * Math.PI );
    camera.updateProjectionMatrix();
  }
  composer.render();
}
