'use strict';
/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var assert = require('assert');
var v8debugapi = require('../../lib/v8debugapi.js');
var logModule = require('@google/cloud-diagnostics-common').logger;
var config = require('../../config.js').debug;
var scanner = require('../../lib/scanner.js');
var path = require('path');
var semver = require('semver');

process.env.GCLOUD_PROJECT = 0;

function stateIsClean(api) {
  assert.equal(api.numBreakpoints_(), 0,
    'there should be no breakpoints active');
  assert.equal(api.numListeners_(), 0,
    'there should be no listeners active');
  return true;
}

describe('v8debugapi', function() {
  config.workingDirectory = path.join(process.cwd(), 'test');
  var logger = logModule.create(config.logLevel);
  var api = null;
  var foo;
  before(function () {
    if (semver.satisfies(process.version, '<4.0')) {
      // Fat arrow syntax is not recognized by these node versions - skip tests.
      console.log('Skipping fat-arrow syntax due to Node.JS version being ' +
        'lower than requirements');
      this.skip();
      return;
    }
    foo = require('../fixtures/fat-arrow.js');
  });
  beforeEach(function(done) {
    if (!api) {
      scanner.scan(true, config.workingDirectory, function(err, fileStats, hash) {
        assert(!err);
        api = v8debugapi.create(logger, config, fileStats);
        assert.ok(api, 'should be able to create the api');
        done();
      });
    } else {
      assert(stateIsClean(api));
      done();
    }
  });
  afterEach(function() { assert(stateIsClean(api)); });
  it('Should read the argument value of the fat arrow', function(done) {
      var brk = {
        id: 'fake-id-123',
        location: { path: 'fixtures/fat-arrow.js', line: 5 }
      };
    api.set(brk, function(err) {
      assert.ifError(err);
      api.wait(brk, function(err) {
        assert.ifError(err);
        var frame = brk.stackFrames[0];
        var args = frame.arguments;
        var locals = frame.locals;
        assert.equal(args.length, 1, 'There should be one argument');
        assert.equal(args[0].name, 'arguments_not_available');
        assert.equal(locals.length, 1, 'There should be one local');
        assert.deepEqual(
          locals[0],
          {name: 'b', value: '1'}
        );
        api.clear(brk);
        done();
      });
      process.nextTick(foo.bind(null, 'test'));
    });
  });
   it('Should process the argument value change of the fat arrow', function(done) {
      var brk = {
        id: 'fake-id-123',
        location: { path: 'fixtures/fat-arrow.js', line: 6 }
      };
    api.set(brk, function(err) {
      assert.ifError(err);
      api.wait(brk, function(err) {
        assert.ifError(err);
        var frame = brk.stackFrames[0];
        var args = frame.arguments;
        var locals = frame.locals;
        assert.equal(args.length, 1, 'There should be one argument');
        assert.equal(args[0].name, 'arguments_not_available');
        assert.equal(locals.length, 1, 'There should be one local');
        assert.deepEqual(
          locals[0],
          {name: 'b', value: '2'}
        );
        api.clear(brk);
        done();
      });
      process.nextTick(foo.bind(null, 'test'));
    });
  });
});
