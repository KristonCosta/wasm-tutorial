const vsSource = `#version 300 es

in vec2 aVertexPosition;
out vec2 pos;

void main() {
    gl_Position = vec4(aVertexPosition, 0.0, 1.0);
    pos = aVertexPosition;
}
`;

const fsSource = `#version 300 es

#ifdef GL_ES
precision lowp int;
precision highp float;
#endif

const float width = 256.0;
const float height = 256.0;

out vec4 color;
in vec2 pos;
uniform sampler2D u_map;

int getBufferValue(int idx) {
    return int(texelFetch(u_map, ivec2(idx, 0), 0).r * 255.0);
}

float index(float row, float column) {
    return row * width + column;
}

bool bitIsSet(float index) {
    int byte = int(floor(index / 8.0));
    int mask = 1 << (int(index) % 8);
    return (getBufferValue(byte) & mask) == mask;
}


void main() {
    float y = 0.5*(pos.x+1.0); // range [0,1]
    float x = 1.0 - 0.5*(pos.y+1.0); // range [0,1]
    float x_look = floor(x * width);
    float y_look = floor(y * height);
    float idx = index(x_look, y_look);
    bool alive = bitIsSet(idx);
    
    if (alive) { // (alive > 0.5) {
       color = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        color = vec4(1.0,1.0,1.0,1.0);
    }
}
`

function loadShader(gl: WebGL2RenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    
    gl.shaderSource(shader, source);

    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occured compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initShaderProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

export function initWebGlContext (gl: WebGL2RenderingContext) {
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    return {
        program: shaderProgram, 
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            mapLocation: gl.getUniformLocation(shaderProgram, "u_map")
        }
    };
}