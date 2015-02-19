Bed
===

A REST Client API Generator

```
var bed = new Bed();
bed.auth('bearer', 'token');
bed.base('https://api.example.com');
bed.type('application/json');
bed.accept('application/vnd.github.v3+json');

exports.listUsers = bed.get('/users').make();
exports.getUser = bed.get('/users/<id>').make(); // <> = required, [] = optional
exports.createUser = bed.post('/users').make();

yield exports.listUsers();
yield exports.getUser(); // throws argument error (missing "id")
yield exports.createUser({});
```