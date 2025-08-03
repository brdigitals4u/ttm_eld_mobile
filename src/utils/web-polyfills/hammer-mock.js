// Mock HammerJS for web compatibility
// This prevents the "touchAction" error when using react-native-gesture-handler on web

// Create a mock Hammer class
function Hammer(element, options) {
  this.element = element;
  this.options = options || {};
  this.handlers = {};
  
  return this;
}

// Mock methods
Hammer.prototype.on = function(eventType, callback) {
  if (!this.handlers[eventType]) {
    this.handlers[eventType] = [];
  }
  this.handlers[eventType].push(callback);
  return this;
};

Hammer.prototype.off = function(eventType, callback) {
  if (this.handlers[eventType]) {
    const index = this.handlers[eventType].indexOf(callback);
    if (index > -1) {
      this.handlers[eventType].splice(index, 1);
    }
  }
  return this;
};

Hammer.prototype.emit = function(eventType, data) {
  if (this.handlers[eventType]) {
    this.handlers[eventType].forEach(callback => callback(data));
  }
  return this;
};

Hammer.prototype.destroy = function() {
  this.handlers = {};
  return this;
};

// Mock recognizers
Hammer.prototype.get = function(recognizer) {
  return {
    set: function() { return this; },
    recognizeWith: function() { return this; },
    requireFailure: function() { return this; }
  };
};

Hammer.prototype.add = function(recognizer) {
  return recognizer;
};

Hammer.prototype.remove = function(recognizer) {
  return this;
};

// Mock constants
Hammer.DIRECTION_NONE = 1;
Hammer.DIRECTION_LEFT = 2;
Hammer.DIRECTION_RIGHT = 4;
Hammer.DIRECTION_UP = 8;
Hammer.DIRECTION_DOWN = 16;
Hammer.DIRECTION_HORIZONTAL = 6;
Hammer.DIRECTION_VERTICAL = 24;
Hammer.DIRECTION_ALL = 30;

// Mock recognizers
Hammer.Pan = function() { return this; };
Hammer.Pinch = function() { return this; };
Hammer.Press = function() { return this; };
Hammer.Rotate = function() { return this; };
Hammer.Swipe = function() { return this; };
Hammer.Tap = function() { return this; };

// Mock Manager
Hammer.Manager = function(element, options) {
  return new Hammer(element, options);
};

// Export as default and named export
module.exports = Hammer;
module.exports.default = Hammer;
