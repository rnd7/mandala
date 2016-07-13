/**
 * @author dgrt
 */

THREE.WaveDistortionPass = function(dpi){

	THREE.Pass.call(this);

	if(THREE.WaveDistortionShader === undefined)
		console.error(
      "THREE.WaveDistortionPasss relies on THREE.WaveDistortionShader"
    );

	var shader = THREE.WaveDistortionShader;

  this.time = 0;

	this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);

	if(dpi !== undefined) this.uniforms["dpi"].value = dpi;

	this.material = new THREE.ShaderMaterial({
		uniforms: this.uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader
	});

	this.camera = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
	this.scene = new THREE.Scene();

	this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
	this.scene.add(this.quad);
};

THREE.WaveDistortionPass.prototype = Object.create(THREE.Pass.prototype);

THREE.WaveDistortionPass.prototype = {

	constructor: THREE.WaveDistortionPass,

	render: function(renderer, writeBuffer, readBuffer, delta, maskActive){
		this.uniforms["tDiffuse"].value = readBuffer;
		this.uniforms["tSize"].value.set(readBuffer.width, readBuffer.height);
    this.time += 1
    this.uniforms["dpi"].value = this.dpi;
    this.uniforms["time"].value = this.time;

		this.quad.material = this.material;

		if(this.renderToScreen) renderer.render(this.scene, this.camera);
		else renderer.render(this.scene, this.camera, writeBuffer, this.clear);
	}
};
