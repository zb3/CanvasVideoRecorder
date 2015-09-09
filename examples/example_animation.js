/*
 * stupid ugly square animation to test the recorder
**/

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var squares = [];

function newSquare() {
  var s = {};
  s.px = (Math.random() * canvas.width | 0) - canvas.width / 2;
  s.py = (Math.random() * canvas.height | 0) - canvas.height / 2;
  s.size = 50 + (Math.random() * 80 | 0);
  s.vx = Math.random() * 0.2 - 0.1;
  s.vy = Math.random() * 0.2 - 0.1;
  s.rotation = 0;

  var vl = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
  while (Math.abs(s.px) < canvas.width / 2 + s.size || Math.abs(s.py) < canvas.height / 2 + s.size) {
    s.px -= 50 * s.vx / vl;
    s.py -= 50 * s.vy / vl;
  }

  s.av = Math.random() * 0.0006 - 0.0003;

  s.style = 'hsl(' + ((Math.random() * 241 | 0)) + ', 100%, 60%)';

  squares.push(s);
}

function paintSquare(s) {
  ctx.save();
  ctx.translate(s.px + canvas.width / 2, s.py + canvas.height / 2);
  ctx.rotate(s.rotation);
  ctx.fillStyle = s.style;
  ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
  ctx.restore();
}
var lastCreationDate = 0;

function update(delta) {
  lastCreationDate = lastCreationDate || Date.now() - 1500;
  while (Date.now() - lastCreationDate > 150) {
    newSquare();
    lastCreationDate += 50;
  }
  for (var t = 0; t < squares.length; t++) {
    squares[t].px += squares[t].vx * delta;
    squares[t].py += squares[t].vy * delta;
    squares[t].rotation = ((squares[t].rotation + squares[t].av * delta) + 2 * Math.PI) % (2 * Math.PI);

    if (Math.abs(squares[t].px) > canvas.width + squares[t].size || Math.abs(squares[t].py) > canvas.height + squares[t].size)
      squares.splice(t--, 1);
  }
}

function onSizeChange() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.onresize = onSizeChange;
onSizeChange();

function paint() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  squares.forEach(paintSquare);
}

update(10000);
update(10000);