'use strict';

var methods = require('methods');
var request = require('superagent');

module.exports = Bed;

function Bed() {
  this.baseUrl = '';
  this.headers = {};
}
Bed.prototype.base = function(url) {
  this.baseUrl = url;
  return this;
};
Bed.prototype.auth = function(type, token) {
  if (type === 'basic' && arguments.length === 3) {
    token = new Buffer([arguments[1], arguments[2]].join(':'), 'utf8').toString('base64');
  }
  return this.set('Authorization', [type, token].join(' '));
};
Bed.prototype.type = function(type) {
  return this.set('Content-Type', type);
};
Bed.prototype.accept = function(accept) {
  return this.set('Accept', accept);
};
Bed.prototype.set = function(name, value) {
  this.headers[name] = value;
  return this;
};
methods.forEach(function(method) {
  Bed.prototype[method] = function(path) {
    return new Builder(this, method, path);
  };
});

function Builder(bed, method, path) {
  this.bed = bed;
  this.path = new Path(path);
  this.method = method;
  this.query = null;
  this.accept = null;
  this.headers = null;
  this.body = false;
}
Builder.prototype.make = function() {
  var builder = this;
  return function(/* params, body, query */) {
    // TODO parse/validate the arguments
    return new Promise(function(resolve, reject) {
      var req = request[builder.method](builder.bed.baseUrl + builder.path);
      req.query(merge(builder.bed.query, builder.query));
      req.set(merge(builder.bed.headers, builder.headers));
      // TODO apply the other stuff (send data etc)
      req.end(function(err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  };
};

function Path(path) {
  this.path = path;
  this.regexp = null;
  this.fields = [];
  this.parse();
}
Path.prototype.parse = function() {
  // required
  var index = 0;
  var fields = [];
  var regexp = '^' + this.path.replace(/\//g, '\\/') + '$';
  regexp = regexp.replace(/<([^>]+)>/g, function(match, name){
    fields.push({name: name, required: true, index: index++});
    return '\\w+?';
  });
  regexp = regexp.replace(/\[([^\]]+)\]/g, function(match, name){
    fields.push({name: name, required: false, index: index++});
    return '\\w*?';
  });
  this.regexp = new RegExp(regexp);
  this.fields = fields;
};
Path.prototype.valid = function(path) {
  return this.regexp.test(path);
};
Path.prototype.populate = function(params) {

};

function merge() {
  var o = {};
  for(var i = 0; i < arguments.length; i++) {
    var a = arguments[i];
    if (a) {
      for(var k in a) {
        o[k] = a[k];
      }
    }
  }
  return o;
}
