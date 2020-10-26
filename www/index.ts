import { memory, universe_create_glider } from "wasm-time/wasm_time_bg.wasm";
import { Universe, init_panic_hook } from "wasm-time";
import { mat4 } from "gl-matrix";
// @ts-ignore
import { initWebGlContext } from "./src/gl.ts";

init_panic_hook();

const CELL_SIZE = 10;
const GRID_COLOR = '#CCCCCC';
const DEAD_COLOR = '#FFFFFF';
const ALIVE_COLOR = '#000000';

const universe = Universe.new();
const width = universe.width();
const height = universe.height();

const canvas = <HTMLCanvasElement>document.getElementById("wasm-canvas");

canvas.height = (CELL_SIZE + 1) * height + 1;
canvas.width = (CELL_SIZE + 1) * width + 1;

const gl = canvas.getContext("webgl2")
function init_canvas() {
    gl.canvas.width = (CELL_SIZE + 1) * width + 1;
    gl.canvas.height = (CELL_SIZE + 1) * height + 1;
    if (gl == null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);


}

init_canvas();
const programInfo = initWebGlContext(gl);

const ctx = canvas.getContext('2d');
let animationId: number = null;

let speed = 1;
const speedRange = <HTMLInputElement>document.getElementById("speed");

speedRange.addEventListener("change", event => {
    speed = parseInt(speedRange.value);
});

function initBuffers(gl: WebGL2RenderingContext) {
    const positionBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = [
        -1.0, 1.0,
        1.0, 1.0,
        -1.0, -1.0,
        1.0, -1.0,
    ];

    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW);

    return {
        position: positionBuffer,
    };
}

const buffers = initBuffers(gl);
let texture = gl.createTexture();


function drawScene(gl: WebGL2RenderingContext, programInfo: any, buffers: any) {

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfView = 45 * Math.PI / 180;
    const aspect = gl.canvas.width / gl.canvas.height;

    const zNear = 0.1; 
    const zFar = 100.0; 

    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    const modelViewMatrix = mat4.create();

    mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -0.0]);

    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0; 
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition, 
            numComponents, 
            type, 
            normalize, 
            stride, 
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
    }
    gl.useProgram(programInfo.program);

    gl.uniform1i(programInfo.uniformLocations.mapLocation, 0);

    const cellsPtr = universe.cells();
    const cells = new Uint8Array(memory.buffer, cellsPtr, width * height / 8);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);


    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, cells.length, 1, 0, gl.RED, gl.UNSIGNED_BYTE, cells);

    
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix, 
        false, 
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false, 
        modelViewMatrix);
    {
        const offset = 0; 
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
}

const renderLoop = () => {
    fps.render();
    console.log("Ticking {} times", speed);
    for (var i = 0; i < speed; i++) {
        universe.tick();
    }
    drawScene(gl, programInfo, buffers);
    animationId = requestAnimationFrame(renderLoop);
}


const isPaused = () => {
    return animationId === null;
};

const playPauseButton = <HTMLButtonElement>document.getElementById("play-pause");

const play = () => {
    playPauseButton.textContent = "Pause";
    renderLoop();
};

const pause = () => {
    playPauseButton.textContent = "Play";
    cancelAnimationFrame(animationId);
    animationId = null;
};

playPauseButton.addEventListener("click", event => {
    if (isPaused()) {
        play();
    } else {
        pause();
    }
});

const resetButton = <HTMLButtonElement>document.getElementById("reset");

resetButton.addEventListener("click", event => {
    universe.reset();
});

canvas.addEventListener("click", event => {
    const boundingRect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / boundingRect.width;
    const scaleY = canvas.height / boundingRect.height;

    const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
    const canvasTop = (event.clientY - boundingRect.top) * scaleY;

    const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
    const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);

    if (event.ctrlKey || event.altKey) {
        universe.create_glider(row, col);
    } else if (event.shiftKey) {
        universe.create_pulsar(row, col);
    } else {
        universe.toggle_cell(row, col);
    }
    drawScene(gl, programInfo, buffers);
})

const fps = new class {
    fps
    frames: Array<number>
    lastFrameTimestamp

    constructor() {
        this.fps = <HTMLDivElement>document.getElementById("fps");
        this.frames = [];
        this.lastFrameTimestamp = performance.now();
    }

    render() {
        const now = performance.now();
        const delta = now - this.lastFrameTimestamp;
        this.lastFrameTimestamp = now;
        const fps = 1 / delta * 1000;

        this.frames.push(fps);
        if (this.frames.length > 100) {
            this.frames.shift();
        }

        let min = Infinity;
        let max = -Infinity;
        let sum = 0;

        for (let i = 0; i < this.frames.length; i++) {
            sum += this.frames[i];
            min = Math.min(this.frames[i], min);
            max = Math.max(this.frames[i], max);
        }

        let mean = sum / this.frames.length;

        this.fps.textContent = `
Frames Per Second: 
  latest              = ${Math.round(fps)}
  average of last 100 = ${Math.round(mean)}
  min of last 100     = ${Math.round(min)}
  max of last 100     = ${Math.round(max)}       
`.trim();
    }
};



// drawGrid();
// drawCells();
play();