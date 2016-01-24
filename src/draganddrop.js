"use strict";

exports.dragndrop = function (listener, _displayer, _input) {
  const displayer = _displayer;
  const input = _input;
  listener.addEventListener('dragenter', e => {
    e.stopPropagation();
    e.preventDefault();
    displayer.style.display = 'block';
  });
  listener.addEventListener('dragover', e => {
    e.stopPropagation();
    e.preventDefault();
    displayer.innerText = 'Drop Here!';
    displayer.style.borderColor = 'blue';
    displayer.style.backgroundColor = 'rgba(255,255,255,.55)';
  }, false);
  listener.addEventListener('dragleave', e => {
    e.stopPropagation();
    e.preventDefault();
    displayer.innerText = '';
    displayer.style.borderColor = displayer.style.backgroundColor = 'rgba(255,255,255,0)';
  });
  listener.addEventListener('drop', e => {
    displayer.style.display = 'none';
    e.stopPropagation();
    e.preventDefault();
    if (e.dataTransfer.files.length > 0 && /image/.test(e.dataTransfer.files[0].type)) {
      input.files = e.dataTransfer.files;
    }
  }, false);
};
