"use strict";
!function(Object, getPropertyDescriptor) {
  // (C) WebReflection - Mit Style License
  if (!(getPropertyDescriptor in Object)) {
    var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    Object[getPropertyDescriptor] = function getPropertyDescriptor(o, name) {
      var proto = o,
        descriptor;
      while (proto && !(
          descriptor = getOwnPropertyDescriptor(proto, name))) proto = proto.__proto__;
      return descriptor;
    };
  }
}(Object, "getPropertyDescriptor");

//this has been implemented in chrome, but not yet shipped
HTMLCanvasElement.prototype.toBlob = HTMLCanvasElement.prototype.toBlob || HTMLCanvasElement.prototype.msToBlob;
if (!HTMLCanvasElement.prototype.toBlob) {
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    value: function(callback, type, quality) {
      var bin = atob(this.toDataURL(type, quality).split(',')[1]),
        len = bin.length,
        len32 = len >> 2,
        a8 = new Uint8Array(len),
        a32 = new Uint32Array(a8.buffer, 0, len32);

      for (var i = 0, j = 0; i < len32; i++) {
        a32[i] = bin.charCodeAt(j++) |
          bin.charCodeAt(j++) << 8 |
          bin.charCodeAt(j++) << 16 |
          bin.charCodeAt(j++) << 24;
      }

      var tailLength = len & 3;

      while (tailLength--) {
        a8[j] = bin.charCodeAt(j++);
      }

      setTimeout(function() {
        callback(new Blob([a8], {
          'type': type || 'image/png'
        }));
      }, 0);
    }
  });
}
var CVRCameraNotReadyyyyyyyyyException = function() {};
var CVR = function(canvas, name, fps, opts) {
  opts = opts || {};

  this.canvas = canvas;
  this.port = opts.port || 22633;
  this.ready = true;
  this.fps = fps || 30;
  this.seqNo = 0;
  this.name = name;
  this.chunkSize = opts.chunkSize || 0;
  this.chunkNo = 0;
  this.XHRpool = opts.XHRpool || 8;
  this.pendingRequests = 0;
  this.callback = null;
  this.__sizeDescriptors = [];

  this.spoofWindowSize = !!opts.spoofWindowSize;
  this.onBlobReceived = this.onBlobReceived.bind(this);
  this.lockSpoofedSize = this.lockSpoofedSize.bind(this);

  if (opts.spoofWindowSize)
    this.spoofSize(opts.spoofWindowSize[0], opts.spoofWindowSize[1]);
};
CVR.prototype.onFinish = function() {
  this.ready = false;
  if (this.spoofWindowSize)
    this.stopSpoofingSize();
};
CVR.prototype.snap = function(cb, update) {
  if (!this.ready) throw new CVRCameraNotReadyyyyyyyyyException();

  this.callback = cb;
  var _this = this;

  if (this.chunkSize && this.seqNo === this.chunkSize) {
    if (this.pendingRequests) return this.onXHRend = function() {
      _this.snap(cb, update);
    }
    return this.finish(function() {
      _this.chunkNo++;
      _this.seqNo = 0;
      _this.snap(cb, update);
    }, true);

  }

  this.ready = false;

  if (update) update();
  canvas.toBlob(this.onBlobReceived, 'image/png');
};
CVR.prototype.onBlobReceived = function(blob) {
  var xhr,
    _this = this;

  if (this.pendingRequests < this.XHRpool) {
    this.pendingRequests++;
    xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://localhost:' + this.port + '/?name=' + encodeURIComponent(this.name) + '&seq=' + this.seqNo, true);
    xhr.onload = function(res) {
      _this.pendingRequests--;
      if (_this.onXHRend) {
        var cb = _this.onXHRend;
        _this.onXHRend = null;
        cb();
      }
    };
    xhr.send(blob);

    _this.ready = true;
    _this.seqNo++;
    _this.callback && _this.callback();
  } else this.onXHRend = function() {
    _this.onBlobReceived(blob);
  }
};
CVR.prototype.finish = function(cb, chunk) {
  this.ready = false;

  var xhr = new XMLHttpRequest(),
    _this = this;
  xhr.open('GET', 'http://localhost:' + this.port + '/?name=' + encodeURIComponent(this.name) + '&fps=' + this.fps + '&finish=1' + (this.chunkSize ? '&chunk=' + this.chunkNo : ''), true);
  xhr.onload = function(res) {
    _this.ready = true;
    if (!chunk && _this.chunkSize)
      return _this._join(cb);

    if (!chunk)
      _this.onFinish();

    if (cb) cb();
  };
  xhr.send(null);
};
CVR.prototype._join = function(cb) {
  this.ready = false;

  var xhr = new XMLHttpRequest(),
    _this = this;
  xhr.open('GET', 'http://localhost:' + this.port + '/?name=' + encodeURIComponent(this.name) + '&join=1', true);
  xhr.onload = function(res) {
    _this.onFinish();
    if (cb) cb();
  };
  xhr.send(null);
};
CVR.prototype.snapFixed = function(tick, frames, finishCb, dontSpoofTime) {
  var snapped = 0,
    _this = this;
  var elapsedTime = 0,
    timeStart;

  if (!dontSpoofTime) timeStart = MTC.toggleSpoofing(true);

  this.stopRecording = function() {
    frames = 0;
  };

  var func = function() {
    if (snapped++ < frames) {
    
      elapsedTime += 1000 / _this.fps;
      if (!dontSpoofTime)
      MTC.setTime(timeStart + elapsedTime);
      tick();
      
      _this.snap(func, tick);
    } else _this.finish(onFinish);
  };
  func();
  
  var onFinish = function()
  {
   if (!dontSpoofTime) MTC.toggleSpoofing(false);
   finishCb && finishCb();
  };
};
CVR.prototype.recordFrames = function(opt) {
  if (!opt) opt = {};

  var snapped = 0;
  var elapsedTime = 0,
    timeStart;
  var oldRAF = requestAnimationFrame;
  var self = this;

  this.stopRecording = function() {
    opt.frames = -1;
  };

  if (!opt.dontSpoofTime) timeStart = MTC.toggleSpoofing(true);

  var called = false,
    nfCalled = false;
  window.requestAnimationFrame = function(x) {
    if (!called && (!opt.func || opt.func === x)) {
      if (!opt.func) opt.func = x;
      called = true;
      oldRAF(onNextFrame);
    }
  };

  var onNextFrame = function(first) {
    if ((opt.frames && snapped++ >= opt.frames) || (opt.time && elapsedTime / 1000 >= opt.time))
      self.finish(cleanUp);
    else {
      var wasFirst = !nfCalled;
      nfCalled = true;

      elapsedTime += 1000 / self.fps;
      if (!opt.dontSpoofTime)
        MTC.setTime(timeStart + elapsedTime);
      self.snap(onNextFrame, !wasFirst ? opt.func : null);
    }
  };

  var cleanUp = function() {
    window.requestAnimationFrame = oldRAF;
    MTC.toggleSpoofing(false);

    if (called)
      requestAnimationFrame(opt.func);

    if (opt.onFinish)
      opt.onFinish();
  }
};
CVR.prototype.spoofSize = function(x, y) {
  for (var ok of[[window, 'inner'], [document.documentElement, 'client'], [document.body, 'client'], [document.body, 'offset']]) {
    this.__sizeDescriptors.push(ok[0], ok[1] + 'Width', Object.getPropertyDescriptor(ok[0], ok[1] + 'Width'));
    this.__sizeDescriptors.push(ok[0], ok[1] + 'Height', Object.getPropertyDescriptor(ok[0], ok[1] + 'Height'));

    Object.defineProperty(ok[0], ok[1] + 'Width', {
      value: x,
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ok[0], ok[1] + 'Height', {
      value: y,
      enumerable: true,
      configurable: true
    });
  }

  window.addEventListener('resize', this.lockSpoofedSize, false);

  var evt = document.createEvent('UIEvents');
  evt.initUIEvent('resize', true, false, window, 0);
  window.dispatchEvent(evt);
};
CVR.__stopImmediatePropagation = function(e) {
  e.stopImmediatePropagation();
};
CVR.prototype.lockSpoofedSize = function() {
  window.removeEventListener('resize', this.lockSpoofedSize, false);
  window.addEventListener('resize', CVR.__stopImmediatePropagation, true);
};
CVR.prototype.stopSpoofingSize = function() {
  window.removeEventListener('resize', CVR.__stopImmediatePropagation, true);

  for (var t = 0; t < this.__sizeDescriptors.length; t += 3)
    Object.defineProperty(this.__sizeDescriptors[t], this.__sizeDescriptors[t + 1], this.__sizeDescriptors[t + 2]);

  for (var type of['Width', 'Height']) {
    Object.defineProperty(window, 'inner' + type, {
      get: (function(type) {
        return function() {
          return document.documentElement['client' + type];
        }
      })(type),
      enumerable: true,
      configurable: true
    });
  }

  var evt = document.createEvent('UIEvents');
  evt.initUIEvent('resize', true, false, window, 0);
  window.dispatchEvent(evt);
};