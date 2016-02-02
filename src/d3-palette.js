"use strict";

const d3 = require('d3');
const Rx = require('rx');

(function () {
  // self: plugin
  // variable: object where configuration stored
  const configHelper = function (self, _variable) {
    const variable = _variable;
    // use curry to store `self` and `variable`
    return function (keyword) {
      return function (x) {
        if (!arguments.length) {
          return variable[keyword];
        }
        // type check
        if (variable[keyword] !== undefined &&
          variable[keyword] !== null &&
          typeof x !== typeof variable[keyword]) {
          throw new Error(`${(typeof x)} doesn't match ${(typeof variable[keyword])}`);
        }
        variable[keyword] = x;
        return self;
      };
    };
  };

  d3.palette = function () {
    const variable = {
      radius: 100,                    // radius of color palette
      ratio: 0.6,                     // portion of color palette in circle
      dom: undefined,                 // DOM element where mouse events attached
      selection: [],                  // store the color selection result
      onSelectionChanged: () => ({}), // callback function when selection range changed
      selectionChangedObservable: () => ({}),
    };
    // map [0, 360] to [0, 2 * PI]
    const angleMap = d3.scale.linear()
    .domain([0, 360])
    .range([0, Math.PI * 2]);
    // function to generate arc path
    const arc = d3.svg.arc()
    .startAngle((d, i) => angleMap(i))
    .endAngle((d, i) => angleMap(i + 1.3));
    // function to generate pie
    const pie = d3.layout.pie().sort(null);
    // map (x, y) to angle, where origin point is the center point of circle
    const angle = function (_x, _y) {
      // use position point to calculate the vector (x, y)
      const x = _x - variable.dom.getBoundingClientRect().left - variable.radius;
      const y = variable.radius - _y + variable.dom.getBoundingClientRect().top;
      // (cx, cy) is the vector ↑
      const cx = 0;
      const cy = variable.radius;
      const result = Math.acos(
        (x * cx + y * cy) /
        (Math.sqrt(x * x + y * y) * Math.sqrt(cx * cx + cy * cy))
      );
      // when x is greater than zero, the point is at right hand side of circle;
      // otherwise point is at left hand side of circle, where acos result in negative value.
      // acos results in range [-PI, PI], we map it to [0, 2 * PI] here
      return x > 0 ? result : (2 * Math.PI - result);
    };
    const draw = function (_selection, startX, startY) {
      let selection = _selection;
      const startAngle = angle(startX, startY);
      // clear previous selection if any
      selection.selectAll('g.selection').remove();

      // center the selection area (g), same as the place where we draw the color palette
      selection = selection.append('g').attr({
        class: 'selection',
        transform: `translate(${variable.radius}, ${variable.radius})`,
      });

      return function (x, y, ifCrossZeroAngle) {
        const myArc = arc.startAngle(d => d.start)
          .endAngle(d => d.end);
        const endAngle = angle(x, y);
        let pathData = [];

        // When selection cross the origin, we separate selection into two parts,
        // one in left side, one in right side;
        // otherwise we can put the selection in one part
        if (ifCrossZeroAngle) {
          pathData = [{
            start: Math.max(startAngle, endAngle),
            end: Math.PI * 2,
          }, {
            start: 0,
            end: Math.min(endAngle, startAngle),
          }];
        } else {
          pathData = [{
            start: startAngle,
            end: endAngle,
          }];
        }

        const paths = selection.selectAll('path.select')
        .data(pathData);

        paths
        .enter()
        .append('path')
        .attr({
          class: 'select',
        })
        .style('fill', 'rgba(0, 0, 0, 0.5)');
        // remove the non-used part
        paths.exit().remove();

        paths.attr('d', myArc);
        return;
      };
    };
    // extract point from event result:
    // For mobile usage, point value stored in .changedTouches attribute
    const pointExtractor = p => p.changedTouches ? p.changedTouches[0] : p;

    const palette = function (svg) {
      svg.on('mousedown', () => {
        const event = d3.event;
        if (!!event.preventDefault) {
          event.preventDefault();
        } else {
          event.returnValue = false;
        }
      });

      svg.append('g')
       .attr({
         transform: `translate(${variable.radius}, ${variable.radius})`,
         class: 'container',
       });

      const selection = svg.select('g.container');
      arc.outerRadius(variable.radius)
      .innerRadius(variable.radius * variable.ratio);

      selection.selectAll('path')
      .data(pie(d3.range(0, 360)))
      .enter()
      .append('path')
      .attr('d', arc)
      .on('mousedown', () => {
        const event = d3.event;
        if (!!event.preventDefault) {
          event.preventDefault();
        } else {
          event.returnValue = false;
        }
      })
      .style('fill', (d, i) => `hsl(${i},100%,50%)`);

      // Select feature requires RxJS
      if (Rx && Rx.Observable && variable.dom) {
        const Downs = Rx.Observable.merge( // merge touch and mouse events together
          Rx.Observable.fromEvent(variable.dom, 'mousedown'),
          Rx.Observable.fromEvent(variable.dom, 'touchstart'));
        const Ups = Rx.Observable.merge(
            Rx.Observable.fromEvent(window, 'mouseup'),
            Rx.Observable.fromEvent(window, 'touchend'));
        const Moves = Rx.Observable.merge(
            Rx.Observable.fromEvent(variable.dom, 'mousemove'),
            Rx.Observable.fromEvent(variable.dom, 'touchmove'));
        const Drags = Downs.concatMap(() => Moves.startWith(null)
            .takeUntil(Ups)
            .map(movePoint => movePoint === null ? null : {
              x: pointExtractor(movePoint).clientX,
              y: pointExtractor(movePoint).clientY,
            }));
        const CrossOrigin = Drags.map(point =>
            // Originally, the drag observable continues from one drag event to next drag event.
            // The end point of previous event and the beginning point of current event will
            // construct a pair via .pairwise() call later, and might produce incorrect result
            // in map() call. (For example, last drag ends in point at left hand side, current
            // drag starts at right hand side, as a pair, it shows that the drag has cross the
            // origin; but indeed, the two points belong to 2 different drag events)
            //
            // To prevent this, a `null` was added to drag event at the beginning to separate
            // each drag event.
            //
            // This function will map point to angle. For `null` point, we set the angle to be PI,
            // because no matter what the next point will be,
            // `Math.abs(pos[0] - pos[1]) > Math.PI * 1.5`
            // will be absolutely false. Hence, will not produce a CrossOrigin event.
          point === null ? Math.PI : angle(point.x, point.y)
        )
        .distinctUntilChanged()
        .pairwise()
        .map(pos =>
          // For points on left hand side, it will be close to 2 PI; for points on right hand side,
          // it will be close to 0. Thus, for drag events that cross the origin, the difference
          // of points in pair will be great (say, greater than 1.5 PI).
          Math.abs(pos[0] - pos[1]) > Math.PI * 1.5
        )
        .filter(bool => bool);

        let flag = false;
        let drawFunction = undefined;
        let startAngle = undefined;

        Downs.forEach(startPoint => {
          flag = false;
          drawFunction = draw(
            svg, pointExtractor(startPoint).clientX,
            pointExtractor(startPoint).clientY);
          startAngle = angle(
            pointExtractor(startPoint).clientX,
            pointExtractor(startPoint).clientY);
        });
        CrossOrigin.forEach(() => {
          flag = !flag;
        });
        Drags.forEach((dragPoint) => {
          if (dragPoint !== null) {
            drawFunction(dragPoint.x, dragPoint.y, flag);
          }
        });
        const observable = Drags.map((dragPoint) =>
          dragPoint === null ? null : angle(dragPoint.x, dragPoint.y)
        ).distinctUntilChanged().map((endAngle) => {
          if (endAngle === null) {
            return null;
          }
          if (flag) {
            return [(Math.max(startAngle, endAngle) - Math.PI * 2), Math.min(startAngle, endAngle)];
          }
          return [Math.min(startAngle, endAngle), Math.max(startAngle, endAngle)];
        }).filter(range => range !== null);
        observable.forEach(selectedRange => {
          palette.selection(selectedRange);
          variable.onSelectionChanged(selectedRange);
        });
        variable.selectionChangedObservable(observable);
      }
    };

    const customization = configHelper(palette, variable);
    Object.keys(variable).forEach((keyword) => {
      palette[keyword] = customization(keyword);
    });

    return palette;
  };
}());

exports.d3Palette = d3.palette;
