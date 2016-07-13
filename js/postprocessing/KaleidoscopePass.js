/**
 * @author $4m50n
 */

THREE.KaleidoscopePass = function( sides, angle ) {

	THREE.Pass.call( this );

	if( THREE.KaleidoscopeShader === undefined )
		console.error(
      "THREE.KaleidoscopePass relies on THREE.KaleidoscopeShader"
    );

	var shader = THREE.KaleidoscopeShader;

	this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);

	if(sides !== undefined) this.uniforms["sides"].value = sides;
	if(angle !== undefined) this.uniforms["angle"].value = angle;

	this.material = new THREE.ShaderMaterial( {
		uniforms: this.uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader
	});

	this.camera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 );
	this.scene = new THREE.Scene();

	this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
	this.scene.add(this.quad);
};

THREE.KaleidoscopePass.prototype = Object.create(THREE.Pass.prototype);

THREE.KaleidoscopePass.prototype = {

	constructor: THREE.KaleidoscopePass,

	render(renderer, writeBuffer, readBuffer, delta, maskActive){
		this.uniforms["tDiffuse"].value = readBuffer;
		var size = Math.max( writeBuffer.width, writeBuffer.height );
		var scaleX = writeBuffer.width;
		var scaleY = writeBuffer.height;
		var offsetX = 0.;
		var offsetY = 0.;
		if( scaleX > scaleY ) {
			scaleY /= scaleX;
			scaleX = 1;
			offsetY = ( 1-scaleY ) / 2;
		} else {
			scaleX /= scaleY;
			scaleY = 1;
			offsetX = ( 1-scaleX ) / 2;
		}
		this.uniforms["scale"].value.set(scaleX, scaleY);
		this.uniforms["offset"].value.set(offsetX, offsetY);
		this.quad.material = this.material;

		if(this.renderToScreen) renderer.render(this.scene, this.camera);
		else renderer.render(this.scene, this.camera, writeBuffer, this.clear);
	},
	setSides( value ) {
		this.uniforms["sides"].value = value;
	},
	setAngle( value ) {
		this.uniforms["angle"].value = value;
	}
};
