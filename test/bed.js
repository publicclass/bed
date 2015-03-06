'use strict';

var Bed = require('..');

describe('bed', function() {
  describe('a basic github api', function() {
    var bed = new Bed();
    bed.auth('basic', 'foo', 'bar');
    bed.base('https://api.github.com');
    bed.type('application/json');
    bed.accept('application/vnd.github.v3+json');

    var gh = {
      test: bed.head('/').make(),
      listUsers: bed.get('/users').make(),
      getUser: bed.get('/users/<id>').make(),
      createUser: bed.post('/users').make()
    };

    it('should fail to authorize', function() {
      return gh.test().should.eventually.have.property('status', 401);
    });

  });

  describe('a httpbin.org api', function() {
    var bed = new Bed();
    bed.auth('basic', 'foo', 'bar');
    bed.base('http://httpbin.org');

    var bin = {
      auth: bed.get('/basic-auth/<user>/bar').make(),
      multiAuth: bed.get('/basic-auth/<user>/<pass>').make(),
      failAuth: bed.get('/basic-auth/foo/baz').make(),
      get: bed.get('/get').make(),
      post: bed.post('/post').make()
    };

    it('should fail to authorize', function() {
      return bin.failAuth().should.eventually.have.property('status', 401);
    });

    it('should fail without required user arg', function() {
      return bin.auth().should.be.rejected;
    });

    it('should successfully authorize', function() {
      return bin.auth('foo').should.eventually.have.deep.property('body.authenticated', true);
    });

    it('should successfully authorize with multiple required args', function() {
      return bin.multiAuth('foo', 'bar').should.eventually.have.deep.property('body.authenticated', true);
    });

    it('should get back query args', function() {
      return bin.get({q: 1}).should.eventually.have.deep.property('body.args.q', '1');
    });

    it('should get back body and query args', function() {
      return bin.post({data: 1}, {q: 1}).should.eventually.have.deep.property('body.json.data', 1);
    });

  });


// yield exports.listUsers();
// yield exports.getUser(); // throws argument error (missing "id")
// yield exports.createUser({});
});
