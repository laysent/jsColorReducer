"use strict";
let cleanUp = function() {
    Array.prototype.slice.apply(document.querySelectorAll('canvas')).forEach(node => {
        let context = node.getContext('2d');
        context.clearRect(0, 0, node.width, node.height);
        node.width = node.height = 0;
        node.style.display = node.id == 'origin' ? '' : 'none';
    });
    
    const selection = document.querySelector('svg g.selection');
    selection && document.querySelector('svg').removeChild(selection);
    
    document.querySelector('.icon-export').disabled = true;
    
    if (document.querySelector('div.viewport img')) {
        document.querySelector('div.viewport').removeChild(document.querySelector('div.viewport img'));
    }
    
    document.querySelector('.loading').style.display = 'none';
}
let loader = imageLoader(document.querySelector('input'))
.onchange(() => {
    cleanUp();
})
.onsuccess((img) => {
    EXIF.getData(img, function() {
        app.rotate = rotateHelper(
            EXIF.getTag(this, 'Orientation')
            );
        app.preview = previewGenerator(img, 800);
        app.preview.id = 'origin';
        app.preview.style.display = '';
        
        app.origin = image2Canvas(img);
        
        document.querySelector('canvas#result').style.display = 'none';
        const dom = document.querySelector('canvas#origin');
        dom.parentNode.replaceChild(app.preview, dom);
        document.querySelector('svg').style.display = '';
        let result = document.querySelector('canvas#result');
        result.width = app.preview.width;
        result.height = app.preview.height;
        
        document.querySelector('.info-zoom').innerText = `${Math.floor((100 / getRatio(800)(img.width, img.height)))}%`
        document.querySelector('.info-resolution').innerText = app.rotate.toString(img.width, img.height);
        
        app.preivewer = imagePreviewer(result, app.preview.getBoundingClientRect(), app.origin, document.querySelector('canvas#preview'),
            app.rotate).start();
        document.querySelector('canvas#preview').style.transform = `rotate(${app.rotate.angleDeg})`;
    })
})
.onfailed(() => {
    console.log('failed!');
})
.regist();

let palette = d3.palette()
.radius(100)
.dom(document.querySelector('svg'))
.selectionChangedObservable(o => {
    o.debounce(100).forEach(d => {
        const canvas = imageConverter(image2Canvas(app.preview))
                        .range(d)
                        .convert(),
                previousCanvas = document.querySelector('canvas#result');
        app.range = d;
        previousCanvas.getContext('2d').drawImage(canvas, 0, 0);
        document.querySelector('canvas#origin').style.display = 'none';
        previousCanvas.style.display = '';
        
        document.querySelector('.icon-export').disabled = false;
        
        app.preivewer.canvas(previousCanvas).range(d);
    });
});
d3.select('svg')
.attr({
    'width': 200,
    'height': 200
})
.call(palette);

document.querySelector('.icon-export').onclick = function() {
    document.querySelector('.loading').style.display = 'block';
    setTimeout(() => {
        const canvas = imageConverter(image2Canvas(app.origin))
                            .range(app.range)
                            .convert(),
                image = canvas2Image(canvas),
                rect = document.querySelector('.viewport').getBoundingClientRect(),
                ifRotate = app.rotate.ifRotate,
                ratio = ifRotate ? 
                Math.max(1, canvas.height / rect.width, canvas.width / rect.height) :
                Math.max(1, canvas.width / rect.width, canvas.height / rect.height);
            image.style.width = canvas.width / ratio + 'px';
            image.style.height = canvas.height / ratio + 'px';
            image.style.transform = app.rotate.angle !== 0 ? `rotate(${app.rotate.angleDeg})` : '';
            image.style.marginTop = ifRotate ? (canvas.width - canvas.height) / 2 / ratio + 'px' : '0px';
            image.style.marginLeft = ( document.body.getBoundingClientRect().width - canvas.width / ratio ) / 2 + 'px';
            cleanUp();
            document.querySelector('div.viewport').appendChild(image);
            document.querySelector('svg').style.display = 'none';   
    }, 100);    
}

Array.prototype.slice.apply(document.querySelectorAll('i')).forEach(i => {
   i.mousedown = Rx.Observable.fromEvent(i, 'mousedown');
   i.mousedown.forEach(e => {
       i.className = i.className.split(' ')[0] + ' pressed';
   });
   i.mouseup = Rx.Observable.fromEvent(i, 'mouseup');
   i.mouseup.forEach(e => {
       i.className = i.className.split(' ')[0];
   }); 
});

document.querySelector('.icon-import').onclick = function() {
    document.querySelector('input').click();
}

let compare = document.querySelector('.icon-compare');
let origin = document.querySelector('.icon-origin');

origin.mousedown.forEach(e => {
    document.getElementById('origin').style.display = 'block';
    document.getElementById('result').style.display = 'none';
})

origin.mouseup.forEach(e => {
    document.getElementById('origin').style.display = 'none';
    document.getElementById('result').style.display = 'block';
})

dragndrop(document.querySelector('.viewport'),
document.querySelector('#dragndrop'),
document.querySelector('input'));

document.body.addEventListener('touchmove', e => {e.preventDefault()}, true);