"use strict";

const Rx = require("Rx");

exports.select = function(registeredDom, selectionDom, onSelectionChanged) {
    const pointExtractor = p => p.changedTouches ? p.changedTouches[0] : p,
        cleanSelection = () => {
            selectionDom.style.left = '0px';
            selectionDom.style.top = '0px';
            selectionDom.style.width = '0px';
            selectionDom.style.height = '0px';
            selectionDom.style.display = 'block';
        },
        parentDom = registeredDom.parentNode;
    let Downs = Rx.Observable.merge(
        Rx.Observable.fromEvent(parentDom, 'mousedown'),
        Rx.Observable.fromEvent(parentDom, 'touchstart'),
        Rx.Observable.fromEvent(selectionDom, 'mousedown'),
        Rx.Observable.fromEvent(selectionDom, 'touchstart')
    ).map(function(point) {
        point.preventDefault();
      return {
            'x': pointExtractor(point).clientX,
            'y': pointExtractor(point).clientY
            };
    }), Ups = Rx.Observable.merge(
        Rx.Observable.fromEvent(window, 'mouseup'),
        Rx.Observable.fromEvent(window, 'touchend')
    ), Moves = Rx.Observable.merge(
        Rx.Observable.fromEvent(parentDom, 'mousemove'),
        Rx.Observable.fromEvent(parentDom, 'touchmove')
    ), Drags = Downs.concatMap(function(startPoint) {
        return Moves
        .takeUntil(Ups)
        .map(function(movePoint) {
            movePoint.preventDefault();
            let point = pointExtractor(movePoint);
            return {
                'x0': Math.min(startPoint.x, point.clientX),
                'y0': Math.min(startPoint.y, point.clientY),
                'x1': Math.max(startPoint.x, point.clientX), 
                'y1': Math.max(startPoint.y, point.clientY)
                }
            });
    });
    Downs.subscribe(function(point) {
        cleanSelection();
    });
    Ups.subscribe(function(point) {
        selectionDom.style.display = 'none';
    });
    Drags.sample(50).subscribe(function(point) {
        selectionDom.style.left = point.x0 + 'px';
        selectionDom.style.top = point.y0 + 'px';
        selectionDom.style.width = (point.x1 - point.x0) + 'px';
        selectionDom.style.height = (point.y1 - point.y0) + 'px';
    });
    
    onSelectionChanged(Drags);
}