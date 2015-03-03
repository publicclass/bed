'use strict';

var methods = require('methods');
var request = require('superagent');

module.exports = Bed;

function Bed() {
  this.baseUrl = '';
  this.headers = {};
  this.qs = {};
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
Bed.prototype.set = addTo('headers');
Bed.prototype.query = addTo('qs');
methods.forEach(function(method) {
  Bed.prototype[method] = function(path) {
    return new Builder(this, method, path);
  };
});

function Builder(bed, method, path) {
  this.bed = bed;
  this.path = new Path(path);
  this.method = method;
  this.qs = {};
  this.accept = null;
  this.headers = {};
  this.body = false;
  this.formatter = function(res) { return res; };
}
Builder.prototype.set = addTo('headers');
Builder.prototype.query = addTo('qs');
Builder.prototype.format = function(fn) {
  this.formatter = fn;
  return this;
};
Builder.prototype.make = function() {
  var builder = this;
  return function(/* params..., body, query */) {
    // TODO parse/validate the arguments
    var path = builder.path.path;
    var params = [];
    var body = null;
    var query = {};

    // params must be the first arguments
    if (builder.path.has.params) {
      params = [].slice.call(arguments, 0, builder.path.has.params);
      path = builder.path.populate(params);
    }

    return new Promise(function(resolve, reject) {
      var req = request[builder.method](builder.bed.baseUrl + path);
      req.query(merge(builder.bed.qs, builder.qs, query));
      req.set(merge(builder.bed.headers, builder.headers));
      // TODO apply the other stuff (send data etc)
      req.end(function(err, res) {
        if (err) {
          reject(err);
        } else {
          try {
            res = builder.formatter(res);
          } catch(e) {
            reject(e);
          }
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
  this.has = {
    params: 0,
    required: 0,
    optional: 0
  };
  this.parse();
}
Path.prototype.parse = function() {
  // required
  var has = this.has;
  var index = 0;
  var fields = [];
  var regexp = '^' + this.path.replace(/\//g, '\\/') + '$';
  regexp = regexp.replace(/<([^>]+)>/g, function(match, name){
    fields.push({name: name, required: true, index: index++});
    has.required += 1;
    has.params += 1;
    return '(\\w+?)';
  });
  regexp = regexp.replace(/\[([^\]]+)\]/g, function(match, name){
    fields.push({name: name, required: false, index: index++});
    has.optional += 1;
    has.params += 1;
    return '(\\w*?)';
  });
  this.regexp = new RegExp(regexp);
  this.fields = fields;
};
Path.prototype.valid = function(path) {
  return this.regexp.test(path);
};
Path.prototype.populate = function(params) {
  return this.path.replace(this.regexp, function(match){
    return params[i++];
  });
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

function addTo(name) {
  return function add(key, value) {
    if (typeof key === 'object') {
      for(var k in key) {
        add.call(this, k, key[k]);
      }
    } else {
      this[name][key] = value;
    }
    return this;
  };
}