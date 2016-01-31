"use strict";

const Rx = require('rx');

exports.select = function (registeredDom, _selectionDom, onSelectionChanged) {
  const selectionDom = _selectionDom;
  const pointExtractor = p => p.changedTouches ? p.changedTouches[0] : p;
  const cleanSelection = () => {
    selectionDom.style.left = '0px';
    selectionDom.style.top = '0px';
    selectionDom.style.width = '0px';
    selectionDom.style.height = '0px';
    selectionDom.style.display = 'block';
  };
  const parentDom = registeredDom.parentNode;
  const Downs = Rx.Observable.merge(
    Rx.Observable.fromEvent(parentDom, 'mousedown'),
    Rx.Observable.fromEvent(parentDom, 'touchstart'),
    Rx.Observable.fromEvent(selectionDom, 'mousedown'),
    Rx.Observable.fromEvent(selectionDom, 'touchstart')
  ).map((point) => {
    point.preventDefault();
    return {
      x: pointExtractor(point).clientX,
      y: pointExtractor(point).clientY,
    };
  });
  const Ups = Rx.Observable.merge(
    Rx.Observable.fromEvent(window, 'mouseup'),
    Rx.Observable.fromEvent(window, 'touchend')
  );
  const Moves = Rx.Observable.merge(
    Rx.Observable.fromEvent(parentDom, 'mousemove'),
    Rx.Observable.fromEvent(parentDom, 'touchmove')
  );
  const Drags = Downs.concatMap(startPoint => Moves
    .takeUntil(Ups)
    .map(movePoint => {
      movePoint.preventDefault();
      const point = pointExtractor(movePoint);
      return {
        x0: Math.min(startPoint.x, point.clientX),
        y0: Math.min(startPoint.y, point.clientY),
        x1: Math.max(startPoint.x, point.clientX),
        y1: Math.max(startPoint.y, point.clientY),
      };
    }));
  const downSubscription = Downs.subscribe(() => {
    cleanSelection();
  });
  const upSubscription = Ups.subscribe(() => {
    selectionDom.style.display = 'none';
  });
  const dragSubscription = Drags.sample(50).subscribe((_point) => {
    const point = _point;
    selectionDom.style.left = `${point.x0}px`;
    selectionDom.style.top = `${point.y0}px`;
    selectionDom.style.width = `${(point.x1 - point.x0)}px`;
    selectionDom.style.height = `${(point.y1 - point.y0)}px`;
  });
  onSelectionChanged(Drags);

  return () => {
    downSubscription.dispose();
    upSubscription.dispose();
    dragSubscription.dispose();
  };
};
