"use strict";

const app = require('./global.js').app;
const Rx = require('rx');

const imageLoader = function (filepathDom) {
  const variable = {
    dom: undefined,
    onsuccess: undefined,
    onfailed: undefined,
    onchange: undefined,
  };

  const loader = {};

  const wrapper = function (original, callback) {
    return function () {
      callback.apply(loader, arguments);
      if (original !== undefined) {
        original.apply(loader, arguments);
      }
    };
  };

  const parseDom = function (dom) {
    const isInput = obj => obj.nodeName && obj.nodeName === 'INPUT';
    const options = {
      string: () => { variable.dom = document.querySelector(dom); },
      object: () => {
        if (isInput(dom)) {
          variable.dom = dom;
        } else {
          (options.default)();
        }
      },
      default: () => {
        throw new Error('Not a valid input!');
      },
    };
    options[typeof dom]();
  };

  const regist = function () {
    if (variable.dom !== undefined && variable.onsuccess !== undefined) {
      variable.dom.onchange = function () {
        const filepath = variable.dom.files[0];
        const fr = new FileReader();
        if (!!variable.onchange) {
          variable.onchange();
        }
        fr.onload = function (event) {
          const img = new Image();
          img.src = event.target.result;
          img.onload = function () {
            variable.onsuccess(img);
          };
          img.onerror = variable.onfailed;
        };
        fr.readAsDataURL(filepath);
      };
    } else {
      throw new Error('Regist failed!');
    }
  };

  loader.regist = regist;

  loader.dom = function (dom) {
    parseDom(dom);
    return loader;
  };

  loader.onsuccess = function (callback) {
    if (!arguments.length) return variable.onsuccess;
    variable.onsuccess = wrapper(variable.onsuccess, callback);
    return loader;
  };

  loader.onfailed = function (callback) {
    if (!arguments.length) return variable.onfailed;
    variable.onfailed = wrapper(variable.onfailed, callback);
    return loader;
  };

  loader.onchange = function (callback) {
    if (!arguments.length) return variable.onchange;
    variable.onchange = wrapper(variable.onchange, callback);
    return loader;
  };

  loader.dom(filepathDom);

  return loader;
};

const getRatio = function (maxSize) {
  return function (width, height) {
    const wRatio = Math.max(width / maxSize, 1);
    const hRatio = Math.max(height / maxSize, 1);
    return Math.max(wRatio, hRatio);
  };
};

const previewGenerator = function (obj, size) {
  if (obj.width === undefined || obj.height === undefined) {
    throw new Error('Invalid input parameter!');
  }
  const newCanvas = document.createElement('canvas');
  const ratio = getRatio(size || 800)(obj.width, obj.height);

  app.rotate.display(obj, newCanvas, ratio);

  return newCanvas;
};

const canvas2Image = function (canvas) {
  const image = new Image();
  image.src = canvas.toDataURL('image/jpeg', 0.9);
  return image;
};

const image2Canvas = function (img, rotate) {
  if (!img) return undefined;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.style.display = 'none';
  if (!!rotate) {
    canvas.width = rotate.ifRotate ? img.height : img.width;
    canvas.height = rotate.ifRotate ? img.width : img.height;
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(rotate.angle);
    context.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
  } else {
    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0);
  }
  return canvas;
};

const inRangeHelper = function (val, range) {
  const inRange = value => range[0] <= value && range[1] >= value;
  return inRange(val) || inRange(val - 360);
};

const getHue = function (r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) {
    return 0;
  } else if (max === r) {
    return 60 * (g - b) / (max - min) + ((g >= b) ? 0 : 360);
  } else if (max === g) {
    return 60 * (b - r) / (max - min) + 120;
  }
  return 60 * (r - g) / (max - min) + 240;
};

const toGrey = (r, g, b) => r * 0.299 + g * 0.587 + b * 0.114;

const imageConverter = function (canvas) {
  const variable = {
    canvas: undefined,
    range: undefined,
    selection: undefined,
  };

  const ret = {};

  const isCanvas = obj => obj && obj.nodeName && obj.nodeName === 'CANVAS';
  const isRange = obj => obj && obj[0] !== undefined && obj[1] !== undefined;
  const inRange = val => inRangeHelper(val, variable.range);
  const inSelection = idx => {
    const i = Math.floor(idx / 4 / variable.canvas.width);
    const j = Math.floor(idx / 4 % variable.canvas.width);
    return variable.selection.x0 <= j && variable.selection.x1 >= j &&
      variable.selection.y0 <= i && variable.selection.y1 >= i;
  };

  ret.canvas = function (obj) {
    if (isCanvas(obj)) {
      variable.canvas = obj;
      variable.selection = {
        x0: 0,
        y0: 0,
        x1: obj.width,
        y1: obj.height,
      };
    } else {
      throw new Error('Not canvas!');
    }
    return ret;
  };

  ret.range = function (range) {
    if (isRange(range)) {
      variable.range = [];
      variable.range[0] = range[0] / (2 * Math.PI) * 360;
      variable.range[1] = range[1] / (2 * Math.PI) * 360;
    } else {
      throw new Error('Not Range!');
    }
    return ret;
  };

  ret.selection = function (selection) {
    if (selection.x0 === undefined || selection.x1 === undefined ||
        selection.y0 === undefined || selection.y1 === undefined) {
      throw new Error('Not Selection!');
    } else if (!variable.canvas) {
      throw new Error('Canvas need to be defined first!');
    } else {
      variable.selection = {
        x0: Math.max(Math.min(selection.x0, variable.canvas.width), 0),
        y0: Math.max(Math.min(selection.y0, variable.canvas.height), 0),
        x1: Math.min(Math.max(selection.x1, 0), variable.canvas.width),
        y1: Math.min(Math.max(selection.y1, 0), variable.canvas.height),
      };
    }
    return ret;
  };

  ret.convert = function () {
    if (variable.canvas === undefined || variable.range === undefined) {
      throw new Error('Not ready for convert!');
    }
    const context = variable.canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, variable.canvas.width, variable.canvas.height);
    const pixelArray = imageData.data;
    for (let i = 0; i < pixelArray.length; i += 4) {
      if (!inSelection(i) ||
        !inRange(getHue(pixelArray[i], pixelArray[i + 1], pixelArray[i + 2]))) {
        const grey = toGrey(pixelArray[i], pixelArray[i + 1], pixelArray[i + 2]);
        pixelArray[i] = pixelArray[i + 1] = pixelArray[i + 2] = grey;
      }
    }
    context.putImageData(imageData, 0, 0);
    return variable.canvas;
  };

  ret.canvas(canvas);

  return ret;
};

const imagePreviewer = function (canvas, rect, origin, preview, rotateHelper) {
  const variable = {
    canvas: undefined,  // canvas for image with preivew size and rendered color
    preview: undefined, // canvas for displaying zoomed preview result
    origin: undefined,  // canvas for image with original size and color
  };
  const ret = {};
  const isCanvas = obj => obj && obj.nodeName && obj.nodeName === 'CANVAS';
  const functionDefineHelper = keyword => function (obj) {
    if (!isCanvas(obj)) {
      throw new Error('Not Canvas!');
    }
    variable[keyword] = obj;
    return ret;
  };

  ret.start = function () {
    const size = 200;

    if (!!variable.canvas.subscription) {
      variable.canvas.subscription.dispose();
    }
    const move = variable.canvas.move =
      variable.canvas.move || Rx.Observable.fromEvent(variable.canvas, 'mousemove');

    const previewContext = variable.preview.getContext('2d');
    const originContext = variable.origin.getContext('2d');
    const ratio = getRatio(800)(variable.origin.width, variable.origin.height);
    const inRange = (r, g, b) => inRangeHelper(getHue(r, g, b), variable.range);
    const inSelection = (idx, position) => {
      const y = position.y * ratio - size / 2 + Math.floor(idx / 4 / size);
      const x = position.x * ratio - size / 2 + Math.floor(idx / 4 % size);
      return variable.selection.x0 * ratio <= x && variable.selection.x1 * ratio >= x &&
        variable.selection.y0 * ratio <= y && variable.selection.y1 * ratio >= y;
    };

    variable.preview.width = size;
    variable.preview.height = size;
    variable.preview.style.display = 'block';

    variable.canvas.subscription = move.sample(50).map(p => ({
      x: p.clientX - variable.rect.left,
      y: p.clientY - variable.rect.top,
    })).subscribe(position => {
      if (!variable.range || !variable.selection) return;
      const originPixel = originContext.getImageData(
        // Starting point need to be rounded first, to make sure all browser
        // returns same result after getImageData() call.
        // With starting point not rounded, Chrome will give rectangle
        // one pixel larger than given size, while IE still provides the same size
        // as given in 3rd and 4th parameters.
        //
        // Not exact size will cause `inSelection` function produce incorrect result
        Math.floor(position.x * ratio - size / 2),
        Math.floor(position.y * ratio - size / 2),
        size, size);
      const originData = originPixel.data;
      for (let i = 0; i < originData.length; i += 4) {
        if (!inSelection(i, position) ||
          !inRange(originData[i], originData[i + 1], originData[i + 2])) {
          originData[i] = originData[i + 1] = originData[i + 2] =
            toGrey(originData[i], originData[i + 1], originData[i + 2]);
        }
      }
      previewContext.putImageData(originPixel, 0, 0);
      previewContext.rotate(rotateHelper.angle);
      previewContext.drawImage(variable.preview, 0, 0);
    });
    return ret;
  };

  Object.keys(variable).forEach(keyword => {
    ret[keyword] = functionDefineHelper(keyword);
  });

  ret.range = function (range) {
    variable.range = [];
    variable.range[0] = range[0] / (2 * Math.PI) * 360;
    variable.range[1] = range[1] / (2 * Math.PI) * 360;
    return ret;
  };

  ret.selection = function (selection) {
    if (selection.x0 === undefined || selection.x1 === undefined ||
      selection.y0 === undefined || selection.y1 === undefined) {
      throw new Error('Not Selection!');
    } else if (!variable.canvas) {
      throw new Error('Canvas need to be defined first!');
    } else {
      variable.selection = {
        x0: Math.max(Math.min(selection.x0, variable.canvas.width), 0),
        y0: Math.max(Math.min(selection.y0, variable.canvas.height), 0),
        x1: Math.min(Math.max(selection.x1, 0), variable.canvas.width),
        y1: Math.min(Math.max(selection.y1, 0), variable.canvas.height),
      };
    }
    return ret;
  };

  ret.rect = function (input) {
    if (input !== undefined) {
      variable.rect = input;
    }
    return ret;
  };

  ret.rect(rect);
  ret.canvas(canvas);
  ret.origin(origin);
  ret.preview(preview);

  return ret;
};

exports.imageConverter = imageConverter;
exports.image2Canvas = image2Canvas;
exports.canvas2Image = canvas2Image;
exports.previewGenerator = previewGenerator;
exports.getRatio = getRatio;
exports.imagePreviewer = imagePreviewer;
exports.imageLoader = imageLoader;
