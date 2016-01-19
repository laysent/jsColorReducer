"use strict";
let imageLoader = function(filepathDom) {
    let variable = {
        dom: undefined,
        onsuccess: undefined,
        onfailed: undefined,
        onchange: undefined
    };
    
    let loader = {};
    
    let wrapper = function(original, callback) {
        return function() {
            callback.apply(loader, arguments);
            if (original !== undefined)
                original.apply(loader, arguments);
        }
    };
    
    let parseDom = function(dom) {
        let isInput = obj => obj.nodeName && obj.nodeName === 'INPUT';
        let options = {
            'string': () => { variable.dom = document.querySelector(dom); },
            'object': () => {
                if (isInput(dom)) {
                    variable.dom = dom;
                } else {
                    options['default']();
                }
            },
            'default': () => { throw "Not a valid input!"; }
        }
        options[typeof dom]();
    }
    
    let regist = function() {
        if (variable.dom !== undefined && variable.onsuccess !== undefined) {
            variable.dom.onchange = function() {
                let filepath = variable.dom.files[0],
                    fr = new FileReader();
                variable.onchange && variable.onchange();
                fr.onload = function(event) {
                    let img = new Image();
                    img.src = event.target.result;
                    img.onload = function() {
                        variable.onsuccess(img);
                    };
                    img.onerror = variable.onfailed;
                };
                fr.readAsDataURL(filepath);
            }
        } else {
            throw "Regist failed!";
        }
    };
    
    loader.regist = regist;
    
    loader.dom = function(dom) {
        parseDom(dom);
        return loader;
    }
    
    loader.onsuccess = function(callback) {
        if (!arguments.length) return variable.onsuccess;
        variable.onsuccess = wrapper(variable.onsuccess, callback);
        return loader;
    }
    
    loader.onfailed = function(callback) {
        if (!arguments.length) return variable.onfailed;
        variable.onfailed = wrapper(variable.onfailed, callback);
        return loader;
    }
    
    loader.onchange = function(callback) {
        if (!arguments.length) return variable.onchange;
        variable.onchange = wrapper(variable.onchange, callback);
        return loader;
    }
    
    loader.dom(filepathDom);
    
    return loader;
};

let getRatio = function(maxSize) {
    return function(width, height) {
        const wRatio = Math.max(width / maxSize, 1),
            hRatio = Math.max(height / maxSize, 1);
        return Math.max(wRatio, hRatio);
    }
}

let previewGenerator = function(obj, size) {
    if (obj.width === undefined || obj.height === undefined) {
        throw "Invalid input parameter!";
    }
    const newCanvas = document.createElement('canvas'),
        ratio = getRatio(size || 800)(obj.width, obj.height);
    
    app.rotate.display(obj, newCanvas, ratio);
    
    return newCanvas;
};

let canvas2Image = function(canvas) {
    let image = new Image();
    image.src = canvas.toDataURL('image/png');
    return image;
}

let image2Canvas = function(img, rotate) {
    if (!img) return undefined;
    const canvas = document.createElement('canvas'),
        context = canvas.getContext('2d');
    canvas.style.display = 'none';
    if (!!rotate) {
        canvas.width = rotate.ifRotate ? img.height : img.width;
        canvas.height = rotate.ifRotate ? img.width : img.height;
        context.translate(img.width / 2, img.height / 2);
        context.rotate(rotate.angle);
        if (rotate.ifRotate) {
            context.drawImage(img, -img.height / 2, -img.width / 2, img.height, img.width);
        } else {
            context.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
        }
    } else {
        canvas.width = img.width;
        canvas.height = img.height;
    context.drawImage(img, 0, 0);
    }
    return canvas;
};

let inRangeHelper = function(val, range) {
    const inRange = val => range[0] <= val && range[1] >= val;
    return inRange(val) || inRange(val - 360);
}

let getHue = function(r, g, b) {
    const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    if (max == min) 
        return 0;
    else if (max == r)
        return 60 * (g - b) / (max - min) + ((g >= b) ? 0 : 360);
    else if (max == g)
        return 60 * (b - r) / (max - min) + 120;
    else
        return 60 * (r - g) / (max - min) + 240;
}

let toGrey = (r, g, b) => r * 0.299 + g * 0.587 + b * 0.114;

let imageConverter = function(canvas) {
    let variable = {
        canvas: undefined,
        range: undefined,
        selection: undefined
    }
    
    let ret = {};
    
    let isCanvas = obj => obj && obj.nodeName && obj.nodeName === 'CANVAS',
        isRange = obj => obj && obj[0] !== undefined && obj[1] !== undefined,
        inRange = val => inRangeHelper(val, variable.range),
        inSelection = idx => {
            let i = Math.floor(idx / 4 / variable.canvas.width),
                j = Math.floor(idx / 4 % variable.canvas.width);
            return variable.selection.x0 <= j && variable.selection.x1 >= j &&
                variable.selection.y0 <= i && variable.selection.y1 >= i;
        } 
    
    ret.canvas = function(obj) {
        if (isCanvas(obj)) {
            variable.canvas = obj;
            variable.selection = {
                'x0': 0,
                'y0': 0,
                'x1': obj.width,
                'y1': obj.height
            };
        }
        else
            throw "Not canvas!";
        return ret;
    }
    
    ret.range = function(range) {
        if (isRange(range)) {
            variable.range = [];
            variable.range[0] = range[0] / (2 * Math.PI) * 360;
            variable.range[1] = range[1] / (2 * Math.PI) * 360;
        } else {
            throw "Not Range!";
        }
        return ret;
    }
    
    ret.selection = function(selection) {
        if (selection.x0 === undefined || selection.x1 === undefined ||
            selection.y0 === undefined || selection.y1 === undefined ) throw "Not Selection!";
        else if (!variable.canvas) throw "Canvas need to be defined first!";
        else {
            variable.selection = {
                'x0': Math.max(Math.min(selection.x0, variable.canvas.width), 0),
                'y0': Math.max(Math.min(selection.y0, variable.canvas.height), 0),
                'x1': Math.min(Math.max(selection.x1, 0), variable.canvas.width),
                'y1': Math.min(Math.max(selection.y1, 0), variable.canvas.height)
            };
        }
        return ret;
    }
    
    ret.convert = function() {
        if (variable.canvas === undefined || variable.range === undefined) {
            throw "Not ready for convert!";
        }
        const context = variable.canvas.getContext('2d'),
            imageData = context.getImageData(0, 0, variable.canvas.width, variable.canvas.height),
            pixelArray = imageData.data;
        for (let i = 0; i < pixelArray.length; i += 4) {
            if (!inSelection(i) || !inRange(getHue(pixelArray[i], pixelArray[i + 1], pixelArray[i + 2]))) {
                let grey = toGrey(pixelArray[i], pixelArray[i + 1], pixelArray[i + 2]);
                pixelArray[i] = pixelArray[i + 1] = pixelArray[i + 2] = grey;
            }
        }
        context.putImageData(imageData, 0, 0);
        return variable.canvas;
    }
    
    ret.canvas(canvas);
    
    return ret;
}

let imagePreviewer = function(canvas , rect, origin, preview, rotateHelper) {
    let variable = {
        canvas: undefined,  // canvas for image with preivew size and rendered color
        preview: undefined, // canvas for displaying zoomed preview result
        origin: undefined,  // canvas for image with original size and color
    }
    let ret = {},
        isCanvas = obj => obj && obj.nodeName && obj.nodeName === 'CANVAS',
        functionDefineHelper = keyword => function(obj) {
            if (!isCanvas(obj)) throw "Not Canvas!";
            variable[keyword] = obj;
            return ret;
        };

    ret.start = function() {
        const size = 200;
        
        variable.canvas.subscription && variable.canvas.subscription.dispose();
        let move = variable.canvas.move = 
            variable.canvas.move || Rx.Observable.fromEvent(variable.canvas, 'mousemove'),
            
            rect = variable.rect, 
            previewContext = variable.preview.getContext('2d'),
            originContext = variable.origin.getContext('2d'),
            ratio = getRatio(800)(variable.origin.width, variable.origin.height),
            inRange = (r, g, b) => inRangeHelper(getHue(r, g, b), variable.range);

        variable.preview.width = size;
        variable.preview.height = size;
        variable.preview.style.display = 'block';
        
        variable.canvas.subscription = move.sample(50).map(p => {
            return {'x': p.clientX - rect.left, 'y': p.clientY - rect.top}
        }).subscribe(p => {
            if (!variable.range) return;
            let position = rotateHelper.position(p, variable.canvas),
                originPixel = originContext.getImageData(
                    Math.max(position.x * ratio - size / 2, 0),
                    Math.max(position.y * ratio - size / 2, 0),
                    size, size),
                originData = originPixel.data;
            for(let i = 0; i < originData.length; i += 4) {
                if (!inRange(originData[i], originData[i + 1], originData[i + 2])) {
                    originData[i] = originData[i + 1] = originData[i + 2] = 
                        toGrey(originData[i], originData[i + 1], originData[i + 2]);
                }
            }
            previewContext.putImageData(originPixel, 0, 0);
            previewContext.rotate(rotateHelper.angle);
            previewContext.drawImage(variable.preview, 0, 0);
        });
        return ret;
    }
    
    Object.keys(variable).forEach(keyword => {
        ret[keyword] = functionDefineHelper(keyword);
    })
    
    ret.range = function(range) {
        variable.range = [];
        variable.range[0] = range[0] / ( 2 * Math.PI ) * 360;
        variable.range[1] = range[1] / ( 2 * Math.PI ) * 360;
        return ret;
    }
    
    variable.rect = rect;
    ret.canvas(canvas);
    ret.origin(origin);
    ret.preview(preview);
    
    return ret;
}