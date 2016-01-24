"use strict";

const Rx = require('rx');
const d3 = require('d3');
const select = require('./selection.js').select;
const EXIF = require('./exif.js').EXIF;
const app = require('./global.js').app;
const d3_palette = require('./d3-palette.js').d3_palette;
const image = require('./image.js');
const dragndrop = require('./draganddrop.js').dragndrop;
const rotateHelper = require('./rotate.js').rotateHelper;

let cleanUp = function() {
  Array.prototype.slice.apply(document.querySelectorAll('canvas')).forEach(node => {
    let context = node.getContext('2d');
    context.clearRect(0, 0, node.width, node.height);
    node.width = node.height = 0;
    node.style.display = node.id == 'origin' ? '' : 'none';
  });

  const selection = document.querySelector('svg g.selection');
  selection && document.querySelector('svg').removeChild(selection);

  if (document.querySelector('div.viewport img')) {
    document.querySelector('div.viewport').removeChild(document.querySelector('div.viewport img'));
  }

  document.querySelector('.loading').style.display = 'none';

  let selectionDom = document.querySelector('div.selection');
  selectionDom.style.width = '0px';
  selectionDom.style.height = '0px';
  selectionDom.style.top = '0px';
  selectionDom.style.left = '0px';

  document.querySelector('#dragndrop').style.display = 'none'; 
}

let previewRender = function() {
    const canvas = image.imageConverter(image.image2Canvas(app.preview))
          .range(app.range)
          .selection(app.selection)
          .convert(),
      previousCanvas = document.querySelector('canvas#result');
    previousCanvas.getContext('2d').drawImage(canvas, 0, 0);
    previousCanvas.style.display = '';
        
    app.previewer.canvas(previousCanvas).range(app.range).selection(app.selection);
}

let loader = image.imageLoader(document.querySelector('input'))
.onchange(() => {
  cleanUp();
})
.onsuccess((img) => {
  EXIF.getData(img, function() {
    app.range = [0, 2 * Math.PI];
    app.rotate = rotateHelper(
      EXIF.getTag(this, 'Orientation')
      );
    app.preview = image.previewGenerator(img, 800);
    app.preview.id = 'origin';
    app.preview.style.display = '';
    
    app.origin = image.image2Canvas(img, app.rotate);
    
    const dom = document.querySelector('canvas#origin');
    dom.parentNode.replaceChild(app.preview, dom);
    const rect = document.querySelector('canvas#origin').getBoundingClientRect();
    app.rect = rect;
    app.selection = {
      'x0': 0,
      'x1': rect.width,
      'y0': 0,
      'y1': rect.height
    }
    document.querySelector('svg').style.display = '';
    let result = document.querySelector('canvas#result');
    result.style.display = 'none';
    result.width = app.preview.width;
    result.height = app.preview.height;
    
    document.querySelector('.info-zoom').innerText = `${Math.floor((100 / image.getRatio(800)(img.width, img.height)))}%`
    document.querySelector('.info-resolution').innerText = app.rotate.toString(img.width, img.height);
    
    app.previewer = image.imagePreviewer(result, app.preview.getBoundingClientRect(), app.origin, document.querySelector('canvas#preview'),
      app.rotate).start();
    
    select(
      document.querySelector('canvas#origin'), 
      document.querySelector('div.selection'),
      selectionObservable => {
        selectionObservable.debounce(100).subscribe(selection => {
          app.selection = {
            'x0': selection.x0 - app.rect.left,
            'x1': selection.x1 - app.rect.left,
            'y0': selection.y0 - app.rect.top,
            'y1': selection.y1 - app.rect.top
          };
          previewRender();
          document.querySelector('canvas#origin').style.display = 'none';
        })
      });
  })
})
.onfailed(() => {
  console.log('failed!');
})
.regist();

let palette = d3_palette()
.radius(100)
.dom(document.querySelector('svg'))
.selectionChangedObservable(o => {
  o.debounce(100).forEach(d => {
    app.range = d;
    previewRender();
    document.querySelector('canvas#origin').style.display = 'none';
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
    const zoomRatio = image.getRatio(800)(app.origin.width, app.origin.height),
      canvas = image.imageConverter(image.image2Canvas(app.origin))
              .range(app.range)
              .selection({
                'x0': (app.selection.x0) * zoomRatio,
                'x1': (app.selection.x1) * zoomRatio,
                'y0': (app.selection.y0) * zoomRatio,
                'y1': (app.selection.y1) * zoomRatio
              })
              .convert(),
        img = image.canvas2Image(canvas),
        rect = document.querySelector('.viewport').getBoundingClientRect(),
        ratio = Math.max(1, canvas.width / rect.width, canvas.height / rect.height);
      img.style.width = canvas.width / ratio + 'px';
      img.style.height = canvas.height / ratio + 'px';
      img.style.marginTop = '0px';
      img.style.marginLeft = ( document.body.getBoundingClientRect().width - canvas.width / ratio ) / 2 + 'px';
      img.onload = function() {
        cleanUp();
        document.querySelector('div.viewport').appendChild(img);
        document.querySelector('svg').style.display = 'none';
      }
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

(function() {
  let resizeEvent = Rx.Observable.fromEvent(window, 'resize');
  resizeEvent.subscribe(e => {
    let rect = document.querySelector('canvas#origin').getBoundingClientRect();
    if (rect.width == 0 || rect.height == 0) {
      rect = document.querySelector('canvas#result').getBoundingClientRect();
    }
    if (rect.width !== 0 && rect.height !== 0) {
      app.rect = rect;
      app.previewer.rect(rect);
    }
  });
})();