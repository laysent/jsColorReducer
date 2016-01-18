"use strict";

let dragndrop = function(listener, displayer, input) {
    listener.addEventListener('dragenter', function(e) {
        e.stopPropagation();
        e.preventDefault();
        displayer.style.display = 'block'
    });
    listener.addEventListener('dragover', function(e) {
        e.stopPropagation();
        e.preventDefault();
        displayer.innerText = "Drop Here!";
        displayer.style.borderColor = 'blue';
        displayer.style.backgroundColor = 'rgba(255,255,255,.55)';
    }, false);
    listener.addEventListener('dragleave', function(e) {
       e.stopPropagation();
        e.preventDefault();
        displayer.innerText = "";
        displayer.style.borderColor = displayer.style.backgroundColor = 'rgba(255,255,255,0)';
    })
    listener.addEventListener('drop', function(e) {
        displayer.style.display = 'none';
        e.stopPropagation(); 
        e.preventDefault();
        if (e.dataTransfer.files.length > 0 && /image/.test(e.dataTransfer.files[0].type))
            input.files = e.dataTransfer.files;
    }, false);
}