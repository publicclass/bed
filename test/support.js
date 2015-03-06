'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.config.truncateThreshold = 120;
chai.use(chaiAsPromised);
chai.should();
