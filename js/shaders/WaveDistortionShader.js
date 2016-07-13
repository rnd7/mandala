/**
 * @author dgrt
 *
 * Wave Distortion Shader
 */

THREE.WaveDistortionShader = {

	uniforms: {
		"tDiffuse": {type: "t", value: null},
		"tSize": {type: "v2", value: new THREE.Vector2(256, 256)},

		"time": {type: "f", value: 0},
		"dpi": {type: "f", value: 100},
	},

	vertexShader: [
		"varying vec2 vUv;",
		"void main() {",
			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
		"}"
	].join( "\n" ),

	fragmentShader: [
    //"precision mediump float;",

		"varying vec2 vUv;",

    "uniform float time;",
    "uniform float dpi;",

		"uniform sampler2D tDiffuse;",
		"uniform vec2 tSize;",

    "vec2 pos(){",
    "  return vec2(0.0,0.0);",
    "}",

    "vec4 blend(vec4 bg,vec4 fg){",
    "  vec3 bgm = bg.rgb*bg.a;",
    "  vec3 fgm = fg.rgb*fg.a;",
    "  float ia = 1.0-fg.a;",
    "  float a = (fg.a + bg.a * ia);",
    "  vec3 rgb;",
    "  if(a != 0.0){",
    "    rgb = (fgm + bgm * ia) / a;",
    "  }else{",
    "    rgb = vec3(0.0,0.0,0.0);",
    "  }",
    "  return vec4(rgb,a);",
    "}",

    "vec2 pixel(){",
    "  return vec2(1.0*dpi)/tSize;",
    "}",

    "float wave(float x,float freq, float speed){",
    "  return sin(x*freq+((time*(3.1415/2.0))*speed));",
    "}",

    "vec2 waves(vec2 pos){",
    "  float mask = 1.0;",
    "  float y = 0.0;",
    "  float y2 = pow(y,2.0);",

    "  vec2 intensity = vec2(",
    "    0.5-(y2*0.5),",
    "    0.2+(y2*1.8)",
    "  )*pixel();",

    "  vec2 waves = vec2(",
    "    wave(y,400.0-(y2*200.0),-0.03),",
    "     wave(y,400.0-(y2*400.0*0.05),-0.045)",
    "    +wave(y,900.0-(y2*900.0*0.05),-0.05)",
    "    +wave(pos.x,20.0+(y2*20.0*1.5),-0.01)",
    "  );",
    "  return pos+(waves*intensity*mask);",
    "}",

    /*"ec2 depth(vec2 pos){",
    "  vec2 intensity=vec2(0.01,0.01);",
    "  float d=0.05-pow(texture2D(maps,pos).b,1.0);",
    "  return pos+(intensity*mouse*d);",
    "}",*/

    "void main(){",
    "  vec2 pos = vUv.xy;",
		"  vec2 turbulence = waves(pos);",
    "  vec4 c = texture2D(tDiffuse, turbulence);",
    "  gl_FragColor = vec4(c.rgb,1.0);",
    "}",

	].join( "\n" )
};
