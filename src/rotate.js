"use strict";
let rotateHelper = function(orientation) {
    let ifRotate = orientation == 6 || orientation == 8,
        angle = {
            '1': 0,
            '6': Math.PI / 2,
            '3': Math.PI,
            '8': -Math.PI / 2,
            'undefined': 0
        }[orientation + ''],
        angleDeg = {
            '1': '0deg',
            'undefined': '0deg',
            '3': '180deg',
            '6': '90deg',
            '8': '-90deg'
        }[orientation + '']
    return {
        'toString': (width, height) => ifRotate ? `${height} x ${width}` : `${width} x ${height}`,
        'display': function (obj, canvas, ratio) {
            let context = canvas.getContext('2d');
            ratio = ratio || 1;
            canvas.width = (ifRotate ? obj.height : obj.width) / ratio;
            canvas.height = (ifRotate ? obj.width : obj.height) / ratio;
            context.translate(canvas.width / 2, canvas.height / 2);
            context.rotate(angle);
            if (ifRotate) {
                context.drawImage(obj, -canvas.height / 2, -canvas.width / 2, canvas.height, canvas.width);
            } else {
                context.drawImage(obj, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
            }
        },
        'ifRotate': ifRotate,
        'angle': angle,
        'angleDeg': angleDeg,
        'position': (point, canvas) => {
            return {
                '1': point,
                'undefined': point,
                '3': {'x': canvas.width - point.x, 'y': canvas.height - point.y},
                '6': {'x': point.y, 'y': canvas.width - point.x},
                '8': {'x': canvas.height - point.y, 'y': point.x}
            }[orientation + '']
        },
        'index': (i, size) => {
            return {
                '1': i,
                'undefined': i,
                '3': size * size * 4 - i - 4,
                '6': size - Math.floor(i / size) + i % size * size,
                '8': size * (size - i % size) + Math.floor(i / size)
            }[orientation + '']
        }
    }
}