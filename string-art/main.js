const patternInput = document.getElementById("pattern-input");
const imageInput = document.getElementById("image-input");
const canvas = document.getElementsByTagName("canvas")[0];
const ctx = canvas.getContext("2d");
const buffer = document.createElement("canvas").getContext("2d");

const SMOOTHING = false;
const CANVAS_SIZE = 1000;
const BUFFER_SIDE = 2000;
const NAILS_COUNT = 288;
const ITERATIONS_COUNT = 3;

const SHOW_NAILS = true;
const SHOW_LINES = true;

canvas.width = canvas.height = CANVAS_SIZE;
buffer.canvas.width = buffer.canvas.height = BUFFER_SIDE;

buffer.imageSmoothingEnabled = SMOOTHING;
ctx.imageSmoothingEnabled = SMOOTHING;

console.time("Афганистан");
const pixels = initPixelsArray();
const nails = initNailsArray();
const linesPixels = initLinesPixelsArray();
const nailsDrawOrder = [0];
console.timeEnd("Афганистан");

console.log(linesPixels);

function draw() {

    let pattern = patternInput.value.split(",");

    const get = function (i) {
        return nails[pattern[i]];
    }

    buffer.fillStyle = "white";
    buffer.fillRect(0, 0, canvas.width, canvas.height);

    buffer.strokeStyle = "black";
    buffer.beginPath();
    buffer.moveTo(get(0).x, get(0).y);
    for (let i = 1; i < pattern.length - 1; i++) {
        let xy = get(i);
        buffer.lineTo(xy.x, xy.y);
    }
    buffer.closePath();
    buffer.stroke();

    drawCanvas();
}

function createPattern() {
    let file = imageInput.files[0];
    let url = URL.createObjectURL(file);
    let image = new Image();
    image.src = url;
    image.onload = (e) => {
        drawBuffer(image);
        editImage();
        imageToPixelArray();
        console.time();
        patternInput.value = getPattern().join(",");
        console.timeEnd();
    }
}

// DRAW

function drawCanvas() {
    ctx.drawImage(
        buffer.canvas,
        0, 0, BUFFER_SIDE, BUFFER_SIDE,
        0, 0, canvas.width, canvas.height,
    )
}

function drawBuffer(img) {
    let w = img.width;
    let h = img.height;
    let canvasSide = BUFFER_SIDE;
    let minSide = Math.min(w, h);
    let ratio = canvasSide / minSide;
    w *= ratio;
    h *= ratio;
    let wOffset = -(w - canvasSide) / 2;
    let hOffset = -(h - canvasSide) / 2;
    buffer.drawImage(img, wOffset, hOffset, w, h);
}

// PATTERN

function editImage() {

    let imageData = buffer.getImageData(0, 0, BUFFER_SIDE, BUFFER_SIDE);
    let data = imageData.data;
    let i;

    const r = () => data[i];
    const g = () => data[i + 1];
    const b = () => data[i + 2];
    const a = () => data[i + 3];

    const setR = (r) => data[i] = r;
    const setG = (g) => data[i + 1] = g;
    const setB = (b) => data[i + 2] = b;
    const setA = (a) => data[i + 3] = a;

    const setRGB = (v) => {
        setR(v);
        setG(v);
        setB(v);
    };

    for (let x = 0; x < BUFFER_SIDE; x++) {
        for (let y = 0; y < BUFFER_SIDE; y++) {
            i = (x + y * BUFFER_SIDE) * 4;
            let avg = (r() + g() + b()) / 3;
            let pixelColor = 255 - a() + avg;
            setRGB(255 - pixelColor);
            setA(255);
        }
    }

    buffer.putImageData(imageData, 0, 0);
}

function imageToPixelArray() {
    let imageData = buffer.getImageData(0, 0, BUFFER_SIDE, BUFFER_SIDE);
    let data = imageData.data;
    let i;

    const r = () => data[i];

    for (let x = 0; x < BUFFER_SIDE; x++) {
        for (let y = 0; y < BUFFER_SIDE; y++) {
            i = (x + y * BUFFER_SIDE) * 4;
            pixels[x][y] = r();
        }
    }
}

function getPattern() {
    let nailsIndexes = [0];

    const last = function () {
        return nailsIndexes[nailsIndexes.length - 1];
    }

    for (let i = 0; i < ITERATIONS_COUNT; i++) {
        let next = getBlackestLineNail(last());
        forEachPixelBetween(nails[last()], nails[next], function (x, y) {
            pixels[x][y] = 0;
        });
        nailsIndexes.push(next);
    }

    return nailsIndexes;
}

function getBlackestLineNail(nailId) {
    let maxPow = Number.MIN_SAFE_INTEGER;
    let maxPowNailId = 0;
    let currPow;
    let i;

    const foo = function () {
        currPow = getLinePower(nails[nailId], nails[i]);
        if (currPow > maxPow) {
            maxPow = currPow;
            maxPowNailId = i;
        }
    }

    for (i = 0; i < nailId; i++) foo();
    for (i = nailId + 1; i < nails.length; i++) foo();

    return maxPowNailId;
}

function getLinePower(from, to) {
    let sum = 0;
    forEachPixelBetween(from, to, function (x, y) {
        sum += pixels[x][y];
    });
    return sum;
}

function forEachPixelBetween(from, to, callback) {

}

// OTHER

function initPixelsArray() {
    let arr = [];
    for (let i = 0; i < BUFFER_SIDE; i++) {
        arr.push(new Uint8Array(BUFFER_SIDE));
    }
    return arr;
}

function initNailsArray() {

    const HALF_SIDE = BUFFER_SIDE / 2;
    const PI2 = Math.PI * 2;

    let nails = [];
    let r = HALF_SIDE;
    let a = 0;

    for (let i = 0; i < NAILS_COUNT; i++) {
        a = (i / NAILS_COUNT) * PI2;
        let xy = polarToRect(r, a);
        nails.push(new Point(
            Math.round(HALF_SIDE + xy.x),
            Math.round(HALF_SIDE + xy.y)
        ));
    }

    return nails;
}

function initLinesPixelsArray() {
    let i;

    let arr = [];
    for (let j = 0; j < nails.length; j++) {
        let row = [];
        for (let k = 0; k < nails.length; k++) {
            row.push([]);
        }
        arr.push(row);
    }

    for (i = 0; i < nails.length; i++) {
        for (let j = i + 1; j < nails.length / 2; j++) {
            arr[i][j] = getPixelsBetweenPoints(nails[i], nails[j]);
        }
    }

    for (i = 0; i < nails.length; i++) {
        for (let j = i + 1; j < nails.length; j++) {
            arr[j][i] = arr[i][j];
        }
    }


    if (SHOW_LINES) {
        buffer.fillStyle = "#08f";
        for (let row of arr) {
            for (let cell of row) {
                for (let pixel of cell) {
                    buffer.fillRect(pixel.x, pixel.y, 1, 1);
                }
            }
        }
        drawCanvas();
    }
    if (SHOW_NAILS) {
        buffer.fillStyle = "#f00";
        for (let nail of nails) {
            buffer.fillRect(nail.x - 1, nail.y - 1, 3, 3);
        }
        drawCanvas();
    }

    return arr;
}

function Point(x, y) {
    this.x = x;
    this.y = y;
}

function getPixelsBetweenPoints(from, to) {

    let pixels = [];

    let dx = Math.abs(to.x - from.x);
    let dy = Math.abs(to.y - from.y);


    if (dx > dy) {
        if (from.x > to.x) {
            let tmp = to;
            to = from;
            from = tmp;
        }
        let x = from.x;
        let y = from.y;
        dx = to.x - from.x;
        dy = to.y - from.y;
        let yIncr = dy / dx;
        for (x; x <= to.x; x++) {
            pixels.push(new Point(x, Math.round(y)));
            y += yIncr;
        }
    } else {
        if (from.y > to.y) {
            let tmp = to;
            to = from;
            from = tmp;
        }
        let x = from.x;
        let y = from.y;
        dx = to.x - from.x;
        dy = to.y - from.y;
        let xIncr = dx / dy;
        for (y; y <= to.y; y++) {
            pixels.push(new Point(Math.round(x), y));
            x += xIncr;
        }
    }


    return pixels;
}

function polarToRect(r, a) {
    return {
        x: r * Math.cos(a),
        y: r * Math.sin(a),
    }
}