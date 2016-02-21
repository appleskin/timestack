/* */ 
(function(Buffer, process) {
  var path = require('path');
  var assert = require('assert');
  exports.testDir = path.dirname(__filename);
  exports.fixturesDir = path.join(exports.testDir, 'fixtures');
  exports.libDir = path.join(exports.testDir, '../lib');
  exports.tmpDir = path.join(exports.testDir, 'tmp');
  exports.PORT = 12346;
  if (process.platform === 'win32') {
    exports.PIPE = '\\\\.\\pipe\\libuv-test';
  } else {
    exports.PIPE = exports.tmpDir + '/test.sock';
  }
  var util = require('util');
  for (var i in util)
    exports[i] = util[i];
  function protoCtrChain(o) {
    var result = [];
    for (; o; o = o.__proto__) {
      result.push(o.constructor);
    }
    return result.join();
  }
  exports.indirectInstanceOf = function(obj, cls) {
    if (obj instanceof cls) {
      return true;
    }
    var clsChain = protoCtrChain(cls.prototype);
    var objChain = protoCtrChain(obj);
    return objChain.slice(-clsChain.length) === clsChain;
  };
  exports.ddCommand = function(filename, kilobytes) {
    if (process.platform === 'win32') {
      var p = path.resolve(exports.fixturesDir, 'create-file.js');
      return '"' + process.argv[0] + '" "' + p + '" "' + filename + '" ' + (kilobytes * 1024);
    } else {
      return 'dd if=/dev/zero of="' + filename + '" bs=1024 count=' + kilobytes;
    }
  };
  exports.spawnPwd = function(options) {
    var spawn = require('child_process').spawn;
    if (process.platform === 'win32') {
      return spawn('cmd.exe', ['/c', 'cd'], options);
    } else {
      return spawn('pwd', [], options);
    }
  };
  exports.globalCheck = true;
  process.on('exit', function() {
    if (!exports.globalCheck)
      return;
    var knownGlobals = [setTimeout, setInterval, setImmediate, clearTimeout, clearInterval, clearImmediate, console, Buffer, process, global];
    if (global.errno) {
      knownGlobals.push(errno);
    }
    if (global.gc) {
      knownGlobals.push(gc);
    }
    if (global.DTRACE_HTTP_SERVER_RESPONSE) {
      knownGlobals.push(DTRACE_HTTP_SERVER_RESPONSE);
      knownGlobals.push(DTRACE_HTTP_SERVER_REQUEST);
      knownGlobals.push(DTRACE_HTTP_CLIENT_RESPONSE);
      knownGlobals.push(DTRACE_HTTP_CLIENT_REQUEST);
      knownGlobals.push(DTRACE_NET_STREAM_END);
      knownGlobals.push(DTRACE_NET_SERVER_CONNECTION);
      knownGlobals.push(DTRACE_NET_SOCKET_READ);
      knownGlobals.push(DTRACE_NET_SOCKET_WRITE);
    }
    if (global.COUNTER_NET_SERVER_CONNECTION) {
      knownGlobals.push(COUNTER_NET_SERVER_CONNECTION);
      knownGlobals.push(COUNTER_NET_SERVER_CONNECTION_CLOSE);
      knownGlobals.push(COUNTER_HTTP_SERVER_REQUEST);
      knownGlobals.push(COUNTER_HTTP_SERVER_RESPONSE);
      knownGlobals.push(COUNTER_HTTP_CLIENT_REQUEST);
      knownGlobals.push(COUNTER_HTTP_CLIENT_RESPONSE);
    }
    if (global.ArrayBuffer) {
      knownGlobals.push(ArrayBuffer);
      knownGlobals.push(Int8Array);
      knownGlobals.push(Uint8Array);
      knownGlobals.push(Uint8ClampedArray);
      knownGlobals.push(Int16Array);
      knownGlobals.push(Uint16Array);
      knownGlobals.push(Int32Array);
      knownGlobals.push(Uint32Array);
      knownGlobals.push(Float32Array);
      knownGlobals.push(Float64Array);
      knownGlobals.push(DataView);
    }
    for (var x in global) {
      var found = false;
      for (var y in knownGlobals) {
        if (global[x] === knownGlobals[y]) {
          found = true;
          break;
        }
      }
      if (!found) {
        console.error('Unknown global: %s', x);
        assert.ok(false, 'Unknown global found');
      }
    }
  });
  var mustCallChecks = [];
  function runCallChecks() {
    var failed = mustCallChecks.filter(function(context) {
      return context.actual !== context.expected;
    });
    failed.forEach(function(context) {
      console.log('Mismatched %s function calls. Expected %d, actual %d.', context.name, context.expected, context.actual);
      console.log(context.stack.split('\n').slice(2).join('\n'));
    });
    if (failed.length)
      process.exit(1);
  }
  exports.mustCall = function(fn, expected) {
    if (typeof expected !== 'number')
      expected = 1;
    var context = {
      expected: expected,
      actual: 0,
      stack: (new Error).stack,
      name: fn.name || '<anonymous>'
    };
    if (mustCallChecks.length === 0)
      process.on('exit', runCallChecks);
    mustCallChecks.push(context);
    return function() {
      context.actual++;
      return fn.apply(this, arguments);
    };
  };
})(require('buffer').Buffer, require('process'));
