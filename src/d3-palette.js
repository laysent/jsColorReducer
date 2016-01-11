"use strict";
(function() {
  // self: plugin
  // variable: object where configuration stored
  var configHelper = function (self, variable) {
    // use curry to store `self` and `variable`
    return function (keyword) {
      return function (x) {
        if (!arguments.length) return variable[keyword];
        // type check
        if (variable[keyword] !== undefined && 
            variable[keyword] !== null && 
            typeof x !== typeof variable[keyword]) {
            throw (typeof x) + " doesn't match " + (typeof variable[keyword]);
        }
        variable[keyword] = x;
        return self;
      };
    };
  };
  
  d3.palette = function() {
      var variable = {
          radius: 100,                  // radius of color palette
          ratio: .6,                    // portion of color palette in circle
          dom: undefined,               // DOM element where mouse events attached
          selection: [],                // store the color selection result
          onSelectionChanged: function(d) {
              return;
          },                            // callback function when selection range changed
          selectionChangedObservable: (o) => {}
      },
      // map [0, 360] to [0, 2 * PI]
      angleMap = d3.scale.linear()
        .domain([0, 360])
        .range([0, Math.PI * 2]),
      // function to generate arc path
      arc = d3.svg.arc()
        .startAngle(function(d, i) {
            return angleMap(i);
        })
        .endAngle(function(d, i) {
            return angleMap(i + 1.3);
        }),
      // function to generate pie
      pie = d3.layout.pie().sort(null),
      // map (x, y) to angle, where origin point is the center point of circle
      angle = function(_x, _y) {
            // use position point to calculate the vector (x, y)
          var x = _x - variable.dom.getBoundingClientRect().left - variable.radius,
            y = variable.radius - _y + variable.dom.getBoundingClientRect().top,
            // (cx, cy) is the vector ↑
            cx = 0,
            cy = variable.radius,
            result = Math.acos(
                (x * cx + y * cy) /
                (Math.sqrt(x * x + y * y) * Math.sqrt(cx * cx + cy * cy))
            );
          // when x is greater than zero, the point is at right hand side of circle;
          // otherwise point is at left hand side of circle, where acos result in negative value.
          // acos results in range [-PI, PI], we map it to [0, 2 * PI] here
          return x > 0 ? result : ( 2 * Math.PI - result );
      },
      draw = function(selection, startX, startY) {
          var startAngle = angle(startX, startY);
          // clear previous selection if any
          selection.selectAll('g.selection').remove();
          
          // center the selection area (g), same as the place where we draw the color palette
          selection = selection.append('g').attr({
              'class': 'selection',
              'transform': 'translate(' + variable.radius + ', ' + variable.radius + ')'
          });
          
          return function(x, y, ifCrossZeroAngle) {
              var myArc = arc.startAngle(function(d) {
                  return d.start;
              }).endAngle(function(d) {
                  return d.end;
              }),
              endAngle = angle(x, y),
              pathData = [];
              
              // When selection cross the origin, we separate selection into two parts,
              // one in left side, one in right side;
              // otherwise we can put the selection in one part
              if (ifCrossZeroAngle) {
                  pathData = [
                      {
                        'start': Math.max(startAngle, endAngle),
                        'end': Math.PI * 2
                      },
                      {
                          'start': 0,
                          'end': Math.min(endAngle, startAngle)
                      }
                  ];
              } else {
                  pathData = [
                      {
                          'start': startAngle,
                          'end': endAngle
                      }
                  ];
              }
              
              var paths = selection.selectAll('path.select')
                .data(pathData);

              paths
                .enter()
                .append('path')
                .attr({
                    'class': 'select'
                })
                .style('fill', 'rgba(0, 0, 0, 0.5)');
              // remove the non-used part
              paths.exit().remove();
              
              paths.attr('d', myArc);
              return;
          }
      }
      
      var palette = function(svg) {
          svg.on('mousedown', function() { event.preventDefault ? event.preventDefault() : event.returnValue = false });
          
          svg.append('g')
             .attr({
                 'transform': 'translate(' + variable.radius + ', ' + variable.radius + ')',
                 'class': 'container'
             });
          
          var selection = svg.select('g.container');
          arc.outerRadius(variable.radius)
            .innerRadius(variable.radius * variable.ratio);
          
          selection.selectAll('path')
            .data(pie(d3.range(0, 360)))
            .enter()
            .append('path')
            .attr('d', arc)
            .on('mousedown', function() { event.preventDefault ? event.preventDefault() : event.returnValue = false })
            .style('fill', function(d, i) {
                return 'hsl(' + i + ',100%,50%)';
            });
          
          // Select feature requires RxJS
          if (Rx && Rx.Observable && variable.dom) {
              var MouseDowns = Rx.Observable.fromEvent(variable.dom, 'mousedown'),
                  MouseUps = Rx.Observable.fromEvent(window, 'mouseup'),
                  MouseMoves = Rx.Observable.fromEvent(variable.dom, 'mousemove'),
                  MouseDrags = MouseDowns.concatMap(function(startPoint) {
                      return MouseMoves.startWith(null)
                        .takeUntil(MouseUps)
                        .map(function(movePoint) {
                            return movePoint == null ? null : {
                                'x': movePoint.clientX,
                                'y': movePoint.clientY
                            };
                        })
                  }),
                  CrossOrigin = MouseDrags.map(function(point) {
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
                      // because no matter what the next point will be, `Math.abs(pos[0] - pos[1]) > Math.PI * 1.5`
                      // will be absolutely false. Hence, will not produce a CrossOrigin event.
                      return point == null ? Math.PI : angle(point.x, point.y)                        
                  })
                  .distinctUntilChanged()
                  .pairwise()
                  .map(function(pos) {
                      // For points on left hand side, it will be close to 2 PI; for points on right hand side,
                      // it will be close to 0. Thus, for drag events that cross the origin, the difference 
                      // of points in pair will be great (say, greater than 1.5 PI).
                      return Math.abs(pos[0] - pos[1]) > Math.PI * 1.5;
                  })
                  .filter(function(bool) {
                      return bool;
                  });
                  
                  var flag = false, drawFunction = undefined, 
                      startAngle = undefined,
                      selectedRange = undefined;
                  
                  MouseDowns.forEach(function(startPoint) {
                      flag = false;
                      drawFunction = draw(svg, startPoint.clientX, startPoint.clientY);
                      startAngle = angle(startPoint.clientX, startPoint.clientY);
                  });
                  CrossOrigin.forEach(function(bool) {
                      flag = !flag;
                  });
                  MouseDrags.forEach(function(dragPoint) {
                      if (dragPoint !== null) {
                        drawFunction(dragPoint.x, dragPoint.y, flag);
                      }
                  });
                  var observable = MouseDrags.map(function(dragPoint) {
                      return dragPoint == null ? null : angle(dragPoint.x, dragPoint.y);
                  }).distinctUntilChanged().map(function(endAngle) {
                      if (endAngle == null) { 
                        return null;
                      }
                      if (flag) {
                          return selectedRange = [(Math.max(startAngle, endAngle) - Math.PI * 2), Math.min(startAngle, endAngle)];
                      } else {
                          return selectedRange = [Math.min(startAngle, endAngle), Math.max(startAngle, endAngle)];
                      }
                  }).filter(range => range !== null);
                  observable.forEach(function(selectedRange) {
                      palette.selection(selectedRange);
                      variable.onSelectionChanged(selectedRange);
                  });
                  variable.selectionChangedObservable(observable);
          }
          
      }
      
    var customization = configHelper(palette, variable);
    Object.keys(variable).forEach(function(keyword) {
      palette[keyword] = customization(keyword);
    });
    
    return palette;
  }
})();