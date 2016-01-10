let cleanUp = function() {
    Array.prototype.slice.apply(document.querySelectorAll('canvas')).forEach(node => {
        let context = node.getContext('2d');
        context.clearRect(0, 0, node.width, node.height);
        node.width = node.height = 0;
        node.style.display = node.id == 'origin' ? '' : 'none';
    });
    
    const selection = document.querySelector('svg g.selection');
    selection && document.querySelector('svg').removeChild(selection);
    
    document.querySelector('button').disabled = true;
    
    if (document.querySelector('div#imageContainer img')) {
        document.querySelector('div#imageContainer').removeChild(document.querySelector('div#imageContainer img'));
    }
}
let module = imageLoader(document.querySelector('input'))
.onchange(() => {
    cleanUp();
})
.onsuccess((img) => {
    app.preview = previewGenerator(img);
    app.origin = image2Canvas(img);
    app.preview.id = 'origin';
    app.preview.style.display = '';
    document.querySelector('canvas#result').style.display = 'none';
    const dom = document.querySelector('canvas#origin');
    dom.parentNode.replaceChild(app.preview, dom);
    document.querySelector('svg').style.display = '';
})
.onfailed(() => {
    console.log('failed!');
})
.regist();

let palette = d3.palette()
.radius(250)
.dom(document.querySelector('svg'))
.selectionChangedObservable(o => {
    o.debounce(100).forEach(d => {
        const canvas = imageConverter(image2Canvas(app.preview))
                        .range(d)
                        .convert(),
                previousCanvas = document.querySelector('canvas#result');
        app.range = d;
        canvas.style.display = '';
        canvas.id = 'result';
        previousCanvas.parentNode.replaceChild(canvas, previousCanvas);
        document.querySelector('canvas#origin').style.display = 'none';
        
        document.querySelector('button').disabled = false;
    });
});
d3.select('svg')
.attr({
    'width': 500,
    'height': 500
})
.call(palette);

document.querySelector('button').onclick = function() {
    const canvas = imageConverter(image2Canvas(app.origin))
                        .range(app.range)
                        .convert(),
            image = canvas2Image(canvas),
            ratio = getRatio(800)(canvas.width, canvas.height);
        image.style.width = canvas.width / ratio + 'px';
        image.style.height = canvas.height / ratio + 'px';
        cleanUp();
        document.querySelector('div#imageContainer').appendChild(image);
        document.querySelector('svg').style.display = 'none';               
}