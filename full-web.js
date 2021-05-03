const patternInput = document.getElementById("pattern-input");
const imageInput = document.getElementById("image-input");
const canvas = document.getElementsByTagName("canvas")[0];
const ctx = canvas.getContext("2d");
const buffer = document.createElement("canvas").getContext("2d");
const filesRangeInput = document.getElementById("files-range-input");

const SMOOTHING = false;
const CANVAS_SIZE = 1000;
const BUFFER_SIDE = 2000;
const NAILS_COUNT = 288;
const ITERATIONS_COUNT = 4000;
const MAIN_PIXEL_MULTIPLIER = 0.2;
const NEIGHBOUR_PIXELS_MULTIPLIER = 0.7;
const FPS = 24;
const DELAY = 1000 / FPS;

const SHOW_NAILS = false;
const SHOW_LINES = false;

canvas.width = canvas.height = CANVAS_SIZE;
buffer.canvas.width = buffer.canvas.height = BUFFER_SIDE;

buffer.imageSmoothingEnabled = SMOOTHING;
ctx.imageSmoothingEnabled = SMOOTHING;

let pixels = initPixelsArray();
let nails = initNailsArray();
let linesPixels = initLinesPixelsArray();
let nailsForCanvas = initCanvasNailsArray();

init();
log();

function draw() {
    drawPattern(patternInput.value.split(","));
}

function drawPattern(pattern) {
    const get = function (i) {
        return nailsForCanvas[pattern[i]];
    }

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, BUFFER_SIDE, BUFFER_SIDE);

    ctx.lineWidth = 0.35;

    ctx.beginPath();
    ctx.moveTo(get(0).x, get(0).y);
    for (let i = 1; i < pattern.length - 1; i++) {
        let xy = get(i);
        ctx.lineTo(xy.x, xy.y);
    }
    ctx.closePath();
    ctx.stroke();
}

function createPattern() {
    let file = imageInput.files[0];
    let url = URL.createObjectURL(file);
    let image = new Image();
    image.src = url;
    image.onload = (e) => {
        convert(image);
        download("DAL_AMERICE_SOSAT.TXT", patternInput.value);
        draw();
    }
}

async function drawBadApple() {

    console.log("draw bad apple");

    let stringPatterns = [];
    let patterns = [];

    let filesRange = [1, 5259];

    console.log("loading patterns");

    for (let i = filesRange[0]; i <= filesRange[1]; i++) {
        let _i = i - filesRange[0];
        if (_i % 100 === 0) console.log(`patterns loaded: ${_i}`);
        let patternAsString = await getBadApplePatternFromRange(i);
        stringPatterns.push(patternAsString);
        patterns.push(patternAsString.split(","));
    }

    console.log(`patterns loaded: ${patterns.length}`);

    console.log("preparing frames delays");

    let baseDelay = 2000;
    let audio = new Audio("badApple.mp3");

    audio.volume = 0.1;

    const drawFrame = function (i) {
        if (i === patterns.length - 1) console.log("end playing");
        patternInput.value = stringPatterns[i];
        drawPattern(patterns[i]);
    }

    for (let i = 0; i < patterns.length; i++) {
        setTimeout(drawFrame, baseDelay + i * DELAY, i);
    }
    setTimeout(function () {
        console.log("start playing");
        audio.play();
    }, baseDelay);
}

async function getBadApplePatternFromRange(i) {
    let path = `badApplePatterns/PATTERN-${i}.txt`;
    let content = await readFile(path);
    return content;
}

async function convertManyFiles() {
    let images = filesRangeInput.value.split("-");
    images = images.map((s) => parseInt(s));
    for (let i = images[0]; i <= images[1]; i++) {
        await convertImageFromSegment(i);
    }
}

async function convertImageFromSegment(i) {
    let index = i.toString();
    index = "0".repeat(4 - index.length) + index;
    let path = `badAppleFrames/YOURIMAGE${index}.jpg`;
    await loadImage(path).then((image) => {
        convert(image);
        download(`PATTERN-${i}`, patternInput.value);
    });
}

function loadImage(path) {
    let image = new Image();
    image.src = path;
    return new Promise((resolve) => image.onload = () => resolve(image));
}

async function readFile(path) {
    let content;
    await fetch(path)
        .then((response) => response.text())
        .then((text) => content = text);
    return content;
}

function convert(image) {
    console.time("Армения");
    drawBuffer(image);
    editImage();
    imageToPixelArray();
    patternInput.value = getPattern().join(",");
    console.timeEnd("Армения");
}

// DRAW

function drawCanvas(buffer) {
    ctx.drawImage(
        buffer.canvas,
        0, 0, buffer.canvas.width, buffer.canvas.height,
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

    const r = function () {
        return data[i];
    };
    const g = function () {
        return data[i + 1];
    };
    const b = function () {
        return data[i + 2];
    };
    const a = function () {
        return data[i + 3];
    };

    const setR = function (r) {
        data[i] = r;
    };
    const setG = function (g) {
        data[i + 1] = g;
    };
    const setB = function (b) {
        data[i + 2] = b;
    };
    const setA = function (a) {
        data[i + 3] = a;
    };

    const setRGB = function (v) {
        setR(v);
        setG(v);
        setB(v);
    };

    for (let x = 0; x < BUFFER_SIDE; x++) {
        for (let y = 0; y < BUFFER_SIDE; y++) {
            i = (x + y * BUFFER_SIDE) * 4;

            setA(255);

            if (Math.hypot(BUFFER_SIDE / 2 - x, BUFFER_SIDE / 2 - y) > 1000) {
                setRGB(0)
            } else {
                setRGB(a() - (r() + g() + b()) / 3);
            }
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
        let next = getBlackestLineIndex(last());
        forEachPixelBetweenPoints(last(), next, function (x, y) {
            pixels[x][y] *= MAIN_PIXEL_MULTIPLIER;

            pixels[x + 1][y + 1] *= NEIGHBOUR_PIXELS_MULTIPLIER;
            pixels[x + 1][y - 1] *= NEIGHBOUR_PIXELS_MULTIPLIER;
            pixels[x - 1][y + 1] *= NEIGHBOUR_PIXELS_MULTIPLIER;
            pixels[x - 1][y - 1] *= NEIGHBOUR_PIXELS_MULTIPLIER;

        });
        nailsIndexes.push(next);
    }

    return nailsIndexes;
}

function getBlackestLineIndex(fromIndex) {
    let blackestId = 0;
    let blackestPower = Number.MIN_SAFE_INTEGER;
    forEachPointExcludeOne(fromIndex, function (toIndex) {
        let sum = 0;
        forEachPixelBetweenPoints(fromIndex, toIndex, function (x, y) {
            sum += pixels[x][y];
        });

        let pixelsCount = linesPixels[fromIndex][toIndex].length;
        sum /= pixelsCount;

        if (sum > blackestPower) {
            blackestPower = sum;
            blackestId = toIndex;
        }
    });
    return blackestId;
}

// OTHER

function initPixelsArray() {
    let arr = [];
    for (let i = 0; i <= BUFFER_SIDE; i++) {
        arr.push(new Uint8Array(BUFFER_SIDE + 2));
        arr[i][-1] = 0;
    }
    arr[-1] = [];
    arr[arr.length] = [];
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

function initCanvasNailsArray() {
    let multiplier = CANVAS_SIZE / BUFFER_SIDE;
    return nails.map(function (nail) {
        return {
            x: Math.round(nail.x * multiplier),
            y: Math.round(nail.y * multiplier)
        };
    })
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
        for (let j = i + 1; j < nails.length; j++) {
            arr[i][j] = getPixelsBetweenPoints(nails[i], nails[j]);
        }
    }

    for (i = 0; i < nails.length; i++) {
        for (let j = i + 1; j < nails.length; j++) {
            arr[j][i] = arr[i][j];
        }
    }

    return arr;
}

function Point(x, y) {
    this.x = x;
    this.y = y;
}

function getPixelsBetweenPoints(from, to) {

    let pixels; // x -> y -> x -> y -> ...

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
        pixels = new Uint16Array(dx * 2);
        let yIncr = dy / dx;
        let i = 0;
        for (x; x <= to.x; x++) {
            pixels[i] = x;
            pixels[i + 1] = Math.round(y);
            y += yIncr;
            i += 2;
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
        pixels = new Uint16Array(dy * 2);
        let xIncr = dx / dy;
        let i = 0;
        for (y; y <= to.y; y++) {
            pixels[i] = Math.round(x);
            pixels[i + 1] = y;
            x += xIncr;
            i += 2;
        }
    }

    return pixels;
}

function forEachPointExcludeOne(fromIndex, callback) {
    for (let i = 0; i < fromIndex; i++) {
        callback(i);
    }
    for (let i = fromIndex + 1; i < linesPixels.length; i++) {
        callback(i);
    }
}

function forEachLinePixelsFromPoint(fromIndex, callback) {
    for (let i = 0; i < fromIndex; i++) {
        forEachPixelBetweenPoints(fromIndex, i, callback);
    }
    for (let i = fromIndex + 1; i < linesPixels.length; i++) {
        forEachPixelBetweenPoints(fromIndex, i, callback);
    }
}

function forEachPixelBetweenPoints(fromIndex, toIndex, callback) {
    let pixels = linesPixels[fromIndex][toIndex];
    for (let i = 0; i < pixels.length; i += 2) {
        callback(pixels[i], pixels[i + 1]);
    }
}

function polarToRect(r, a) {
    return {
        x: r * Math.cos(a),
        y: r * Math.sin(a),
    }
}

function log() {
    if (SHOW_LINES) {
        let img = buffer.getImageData(0, 0, BUFFER_SIDE, BUFFER_SIDE);
        let data = img.data;
        let i;

        const r = function () {
            return data[i];
        };
        const g = function () {
            return data[i + 1];
        };
        const b = function () {
            return data[i + 2];
        };
        const a = function () {
            return data[i + 3];
        };

        const setR = function (r) {
            data[i] = r;
        };
        const setG = function (g) {
            data[i + 1] = g;
        };
        const setB = function (b) {
            data[i + 2] = b;
        };
        const setA = function (a) {
            data[i + 3] = a;
        };

        const setRGB = function (v) {
            setR(v);
            setG(v);
            setB(v);
        };

        for (let j = 0; j < nails.length; j++) {
            forEachLinePixelsFromPoint(j, function (x, y) {
                i = (x + y * BUFFER_SIDE) * 4;
                setR(0);
                setG(127);
                setB(255);
            });
        }
        buffer.putImageData(img, 0, 0);
        drawCanvas(buffer);
    }
    if (SHOW_NAILS) {
        buffer.fillStyle = "#f00";
        for (let nail of nails) {
            buffer.fillRect(nail.x - 1, nail.y - 1, 3, 3);
        }
        drawCanvas(buffer);
    }
}

function init() {
    let img = buffer.getImageData(0, 0, BUFFER_SIDE, BUFFER_SIDE);
    let data = img.data;
    let i;

    const r = function () {
        return data[i];
    };
    const g = function () {
        return data[i + 1];
    };
    const b = function () {
        return data[i + 2];
    };
    const a = function () {
        return data[i + 3];
    };

    const setR = function (r) {
        data[i] = r;
    };
    const setG = function (g) {
        data[i + 1] = g;
    };
    const setB = function (b) {
        data[i + 2] = b;
    };
    const setA = function (a) {
        data[i + 3] = a;
    };

    const setRGB = function (v) {
        setR(v);
        setG(v);
        setB(v);
    };

    for (let x = 0; x < BUFFER_SIDE; x++) {
        for (let y = 0; y < BUFFER_SIDE; y++) {
            i = (x + y * BUFFER_SIDE) * 4;
            setA(255);
            setRGB(255);
        }
    }

    buffer.putImageData(img, 0, 0);

    const resize = function () {
        let inputsPanel = document.getElementById("inputs");
        let leftBar = document.getElementById("left-bar");

        patternInput.style.height = `${leftBar.clientHeight - inputsPanel.clientHeight - 8}px`;

        canvas.style.top = `${(window.innerHeight - CANVAS_SIZE) / 2}px`;
    }

    resize();
    window.onresize = resize;
}

function download(filename, text) {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

async function getImagesAverageBrightness() {
    let brightness = [];
    filesRangeInput.value = "1-5259";
    let images = filesRangeInput.value.split("-");
    images = images.map((s) => parseInt(s));
    for (let i = images[0]; i <= images[1]; i++) {
        brightness.push(await getImageAverageBrightnessFromSegment(i));
    }
    download("BRIGHTNESS.txt", brightness.join(","));
}

async function getImageAverageBrightnessFromSegment(i) {
    let index = i.toString();
    index = "0".repeat(4 - index.length) + index;
    console.log(index);
    let path = `badAppleFrames/YOURIMAGE${index}.jpg`;
    let sum = 0;
    await loadImage(path).then((image) => {
        drawBuffer(image);
        editImage();
        imageToPixelArray();
        for (let row of pixels) {
            for (let cell of row) {
                sum += cell;
            }
        }
    });
    return sum * pixels.length * pixels[0].length;
}
