/**
 * @author $4m50n
 *
 * Kaleidoscope Shader
 * Radial reflection around center point
 *
 * Based on:
 * http://pixelshaders.com/editor/
 * Toby Schachman / http://tobyschachman.com/
 * felixturner / http://airtight.cc/
 *
 * sides: number of reflections
 * angle: initial angle in radians
 * scale: uv x and y scale
 * offset: uv x and y offset
 */

THREE.KaleidoscopeShader = {

	uniforms: {

		"tDiffuse": { type: "t", value: null },
		"sides":    { type: "f", value: 6.0 },
		"angle":    { type: "f", value: 0.0 },
		"scale":    { type: "v2", value:  new THREE.Vector2( 1., 1. ) },
		"offset":    { type: "v2", value:  new THREE.Vector2( 0., 0. ) }
	},

	vertexShader: [

		"varying vec2 vUv;",
		"uniform vec2 scale;",
		"uniform vec2 offset;",

		"void main() {",
			"vUv = uv * scale + offset;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform sampler2D tDiffuse;",
		"uniform float sides;",
		"uniform float angle;",

		"varying vec2 vUv;",

		"const float TAU = 2. * 3.1416 ;",

		"void main() {",
			"vec4 color;",
			"if( sides > 0. ) {",
			"  vec2 p = vUv - 0.5;",
			"  float r = length( p );",
			"  float a = atan( p.y, p.x ) + angle;",
			"  a = mod( a, TAU / sides );",
			"  a = abs( a - TAU / sides / 2. );",
			"  p = r * vec2( cos( a ), sin( a ) );",
			"  color = texture2D( tDiffuse, p + 0.5 );",
			"}else{",
			"  color = texture2D( tDiffuse, vUv );",
			"};",
			"gl_FragColor = color;",
		"}"
	].join( "\n" )

};
