'use strict';

var debug = require('debug')('bed');
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
    var args = [].slice.call(arguments);
    var path = builder.path.path;
    var params = [];
    var body = null;
    var query = {};

    // query is the last option
    var last = args[args.length-1];
    if (typeof last === 'object') {
      query = args.pop();
    }

    // params must be the first arguments
    if (builder.path.has.params) {
      params = args.splice(0, builder.path.has.params);
      path = builder.path.populate(params);
    }

    // body is the rest...
    if (args.length) {
      body = args.length === 1 ? args.pop() : args;
    }

    // reject if it doesn't have all the required arguments 
    var missing = params.slice(0, builder.path.has.required);
    if (missing.length < builder.path.has.required) {
      var err = new Error('missing required params ' + missing.join(', '));
      return Promise.reject(err);
    }

    debug('%s(%j, %j)', builder.method, path, params);

    return new Promise(function(resolve, reject) {
      var req = request[builder.method](builder.bed.baseUrl + path);
      req.query(merge(builder.bed.qs, builder.qs, query));
      req.set(merge(builder.bed.headers, builder.headers));
      req.send(body);
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
  var position = 0;
  var regexp = this.path.replace(/<([^>]+)>|\[([^\]]+)\]/g, function(match, r, o, i, path){
    fields.push({part: path.slice(position, i)});
    fields.push({name: r || o});
    has.required += r ? 1 : 0;
    has.optional += o ? 1 : 0;
    has.params += 1;
    position = i + match.length;
    return r ? '(<[^>]+>)' : '(\\[[^\\]]+\\])';
  });
  fields.push({part: this.path.slice(position)});
  this.regexp = new RegExp('^' + regexp.replace(/\//g, '\\/') + '$');
  this.fields = fields;
};
Path.prototype.valid = function(path) {
  return this.regexp.test(path);
};
Path.prototype.populate = function(params) {
  debug('populate(%j)', params);
  var i = 0;
  return this.fields.map(function(field) {
    if (field.part) {
      return field.part;
    } else  {
      return params[i++];
    }
  }).join('');
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