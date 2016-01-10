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
                fr.onload = function() {
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

let previewGenerator = function(obj) {
    if (obj.width === undefined || obj.height === undefined) {
        throw "Invalid input parameter!";
    }
    const newCanvas = document.createElement('canvas'),
        context = newCanvas.getContext('2d'),
        ratio = getRatio(800)(obj.width, obj.height);
        
    newCanvas.width = obj.width / ratio;
    newCanvas.height = obj.height / ratio;
    
    context.drawImage(obj, 0, 0, newCanvas.width, newCanvas.height);
    
    return newCanvas;
};

let canvas2Image = function(canvas) {
    let image = new Image();
    image.src = canvas.toDataURL('image/png');
    return image;
}

let image2Canvas = function(img) {
    if (!img) return undefined;
    const canvas = document.createElement('canvas'),
        context = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.style.display = 'none';
    context.drawImage(img, 0, 0);
    return canvas;
};

let imageConverter = function(canvas) {
    let variable = {
        canvas: undefined,
        range: undefined
    }
    
    let ret = {};
    
    let isCanvas = obj => obj && obj.nodeName && obj.nodeName === 'CANVAS',
        isRange = obj => obj && obj[0] !== undefined && obj[1] !== undefined,
        getHue = function(r, g, b) {
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
        },
        inRange = function(hue) {
            const val = hue / 360 * (2 * Math.PI),
                inRange = (val) => variable.range[0] <= val && variable.range[1] >= val;
            return inRange(val) || inRange(val - 2 * Math.PI);
        },
        toGrey = (r, g, b) => r * 0.299 + g * 0.587 + b * 0.114;
    
    ret.canvas = function(obj) {
        if (isCanvas(obj))
            variable.canvas = obj;
        else
            throw "Not canvas!";
        return ret;
    }
    
    ret.range = function(range) {
        if (isRange(range)) {
            variable.range = range;
        } else {
            throw "Not Range!";
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
            let hue = getHue(pixelArray[i], pixelArray[i + 1], pixelArray[i + 2]);
            if (!inRange(hue)) {
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