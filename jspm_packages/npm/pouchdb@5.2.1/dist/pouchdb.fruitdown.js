/* */ 
"format cjs";
(function(Buffer, process) {
  (function e(t, n, r) {
    function s(o, u) {
      if (!n[o]) {
        if (!t[o]) {
          var a = typeof require == "function" && require;
          if (!u && a)
            return a(o, !0);
          if (i)
            return i(o, !0);
          var f = new Error("Cannot find module '" + o + "'");
          throw f.code = "MODULE_NOT_FOUND", f;
        }
        var l = n[o] = {exports: {}};
        t[o][0].call(l.exports, function(e) {
          var n = t[o][1][e];
          return s(n ? n : e);
        }, l, l.exports, e, t, n, r);
      }
      return n[o].exports;
    }
    var i = typeof require == "function" && require;
    for (var o = 0; o < r.length; o++)
      s(r[o]);
    return s;
  })({
    1: [function(_dereq_, module, exports) {
      (function(process, global, Buffer) {
        'use strict';
        function _interopDefault(ex) {
          return 'default' in ex ? ex['default'] : ex;
        }
        var downAdapter = _interopDefault(_dereq_(18));
        var jsExtend = _dereq_(26);
        var levelup = _interopDefault(_dereq_(48));
        var sublevel = _interopDefault(_dereq_(34));
        var through2 = _dereq_(91);
        var collections = _interopDefault(_dereq_(62));
        var getArguments = _interopDefault(_dereq_(5));
        var Deque = _interopDefault(_dereq_(12));
        var events = _dereq_(15);
        var inherits = _interopDefault(_dereq_(23));
        var vuvuzela = _interopDefault(_dereq_(96));
        var Md5 = _interopDefault(_dereq_(72));
        var lie = _interopDefault(_dereq_(60));
        function isBinaryObject(object) {
          return object instanceof ArrayBuffer || (typeof Blob !== 'undefined' && object instanceof Blob);
        }
        function cloneArrayBuffer(buff) {
          if (typeof buff.slice === 'function') {
            return buff.slice(0);
          }
          var target = new ArrayBuffer(buff.byteLength);
          var targetArray = new Uint8Array(target);
          var sourceArray = new Uint8Array(buff);
          targetArray.set(sourceArray);
          return target;
        }
        function cloneBinaryObject(object) {
          if (object instanceof ArrayBuffer) {
            return cloneArrayBuffer(object);
          }
          var size = object.size;
          var type = object.type;
          if (typeof object.slice === 'function') {
            return object.slice(0, size, type);
          }
          return object.webkitSlice(0, size, type);
        }
        function clone(object) {
          var newObject;
          var i;
          var len;
          if (!object || typeof object !== 'object') {
            return object;
          }
          if (Array.isArray(object)) {
            newObject = [];
            for (i = 0, len = object.length; i < len; i++) {
              newObject[i] = clone(object[i]);
            }
            return newObject;
          }
          if (object instanceof Date) {
            return object.toISOString();
          }
          if (isBinaryObject(object)) {
            return cloneBinaryObject(object);
          }
          newObject = {};
          for (i in object) {
            if (Object.prototype.hasOwnProperty.call(object, i)) {
              var value = clone(object[i]);
              if (typeof value !== 'undefined') {
                newObject[i] = value;
              }
            }
          }
          return newObject;
        }
        function isChromeApp() {
          return (typeof chrome !== "undefined" && typeof chrome.storage !== "undefined" && typeof chrome.storage.local !== "undefined");
        }
        var hasLocal;
        if (isChromeApp()) {
          hasLocal = false;
        } else {
          try {
            localStorage.setItem('_pouch_check_localstorage', 1);
            hasLocal = !!localStorage.getItem('_pouch_check_localstorage');
          } catch (e) {
            hasLocal = false;
          }
        }
        function hasLocalStorage() {
          return hasLocal;
        }
        function pick(obj, arr) {
          var res = {};
          for (var i = 0,
              len = arr.length; i < len; i++) {
            var prop = arr[i];
            if (prop in obj) {
              res[prop] = obj[prop];
            }
          }
          return res;
        }
        inherits(Changes, events.EventEmitter);
        function attachBrowserEvents(self) {
          if (isChromeApp()) {
            chrome.storage.onChanged.addListener(function(e) {
              if (e.db_name != null) {
                self.emit(e.dbName.newValue);
              }
            });
          } else if (hasLocalStorage()) {
            if (typeof addEventListener !== 'undefined') {
              addEventListener("storage", function(e) {
                self.emit(e.key);
              });
            } else {
              window.attachEvent("storage", function(e) {
                self.emit(e.key);
              });
            }
          }
        }
        function Changes() {
          events.EventEmitter.call(this);
          this._listeners = {};
          attachBrowserEvents(this);
        }
        Changes.prototype.addListener = function(dbName, id, db, opts) {
          if (this._listeners[id]) {
            return;
          }
          var self = this;
          var inprogress = false;
          function eventFunction() {
            if (!self._listeners[id]) {
              return;
            }
            if (inprogress) {
              inprogress = 'waiting';
              return;
            }
            inprogress = true;
            var changesOpts = pick(opts, ['style', 'include_docs', 'attachments', 'conflicts', 'filter', 'doc_ids', 'view', 'since', 'query_params', 'binary']);
            function onError() {
              inprogress = false;
            }
            db.changes(changesOpts).on('change', function(c) {
              if (c.seq > opts.since && !opts.cancelled) {
                opts.since = c.seq;
                opts.onChange(c);
              }
            }).on('complete', function() {
              if (inprogress === 'waiting') {
                setTimeout(function() {
                  eventFunction();
                }, 0);
              }
              inprogress = false;
            }).on('error', onError);
          }
          this._listeners[id] = eventFunction;
          this.on(dbName, eventFunction);
        };
        Changes.prototype.removeListener = function(dbName, id) {
          if (!(id in this._listeners)) {
            return;
          }
          events.EventEmitter.prototype.removeListener.call(this, dbName, this._listeners[id]);
        };
        Changes.prototype.notifyLocalWindows = function(dbName) {
          if (isChromeApp()) {
            chrome.storage.local.set({dbName: dbName});
          } else if (hasLocalStorage()) {
            localStorage[dbName] = (localStorage[dbName] === "a") ? "b" : "a";
          }
        };
        Changes.prototype.notify = function(dbName) {
          this.emit(dbName);
          this.notifyLocalWindows(dbName);
        };
        var chars = ('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz').split('');
        function getValue(radix) {
          return 0 | Math.random() * radix;
        }
        function uuid(len, radix) {
          radix = radix || chars.length;
          var out = '';
          var i = -1;
          if (len) {
            while (++i < len) {
              out += chars[getValue(radix)];
            }
            return out;
          }
          while (++i < 36) {
            switch (i) {
              case 8:
              case 13:
              case 18:
              case 23:
                out += '-';
                break;
              case 19:
                out += chars[(getValue(16) & 0x3) | 0x8];
                break;
              default:
                out += chars[getValue(16)];
            }
          }
          return out;
        }
        inherits(PouchError, Error);
        function PouchError(opts) {
          Error.call(this, opts.reason);
          this.status = opts.status;
          this.name = opts.error;
          this.message = opts.reason;
          this.error = true;
        }
        PouchError.prototype.toString = function() {
          return JSON.stringify({
            status: this.status,
            name: this.name,
            message: this.message,
            reason: this.reason
          });
        };
        var UNAUTHORIZED = new PouchError({
          status: 401,
          error: 'unauthorized',
          reason: "Name or password is incorrect."
        });
        var MISSING_BULK_DOCS = new PouchError({
          status: 400,
          error: 'bad_request',
          reason: "Missing JSON list of 'docs'"
        });
        var MISSING_DOC = new PouchError({
          status: 404,
          error: 'not_found',
          reason: 'missing'
        });
        var REV_CONFLICT = new PouchError({
          status: 409,
          error: 'conflict',
          reason: 'Document update conflict'
        });
        var INVALID_ID = new PouchError({
          status: 400,
          error: 'invalid_id',
          reason: '_id field must contain a string'
        });
        var MISSING_ID = new PouchError({
          status: 412,
          error: 'missing_id',
          reason: '_id is required for puts'
        });
        var RESERVED_ID = new PouchError({
          status: 400,
          error: 'bad_request',
          reason: 'Only reserved document ids may start with underscore.'
        });
        var NOT_OPEN = new PouchError({
          status: 412,
          error: 'precondition_failed',
          reason: 'Database not open'
        });
        var UNKNOWN_ERROR = new PouchError({
          status: 500,
          error: 'unknown_error',
          reason: 'Database encountered an unknown error'
        });
        var BAD_ARG = new PouchError({
          status: 500,
          error: 'badarg',
          reason: 'Some query argument is invalid'
        });
        var INVALID_REQUEST = new PouchError({
          status: 400,
          error: 'invalid_request',
          reason: 'Request was invalid'
        });
        var QUERY_PARSE_ERROR = new PouchError({
          status: 400,
          error: 'query_parse_error',
          reason: 'Some query parameter is invalid'
        });
        var DOC_VALIDATION = new PouchError({
          status: 500,
          error: 'doc_validation',
          reason: 'Bad special document member'
        });
        var BAD_REQUEST = new PouchError({
          status: 400,
          error: 'bad_request',
          reason: 'Something wrong with the request'
        });
        var NOT_AN_OBJECT = new PouchError({
          status: 400,
          error: 'bad_request',
          reason: 'Document must be a JSON object'
        });
        var DB_MISSING = new PouchError({
          status: 404,
          error: 'not_found',
          reason: 'Database not found'
        });
        var IDB_ERROR = new PouchError({
          status: 500,
          error: 'indexed_db_went_bad',
          reason: 'unknown'
        });
        var WSQ_ERROR = new PouchError({
          status: 500,
          error: 'web_sql_went_bad',
          reason: 'unknown'
        });
        var LDB_ERROR = new PouchError({
          status: 500,
          error: 'levelDB_went_went_bad',
          reason: 'unknown'
        });
        var FORBIDDEN = new PouchError({
          status: 403,
          error: 'forbidden',
          reason: 'Forbidden by design doc validate_doc_update function'
        });
        var INVALID_REV = new PouchError({
          status: 400,
          error: 'bad_request',
          reason: 'Invalid rev format'
        });
        var FILE_EXISTS = new PouchError({
          status: 412,
          error: 'file_exists',
          reason: 'The database could not be created, the file already exists.'
        });
        var MISSING_STUB = new PouchError({
          status: 412,
          error: 'missing_stub'
        });
        var INVALID_URL = new PouchError({
          status: 413,
          error: 'invalid_url',
          reason: 'Provided URL is invalid'
        });
        var allErrors = {
          UNAUTHORIZED: UNAUTHORIZED,
          MISSING_BULK_DOCS: MISSING_BULK_DOCS,
          MISSING_DOC: MISSING_DOC,
          REV_CONFLICT: REV_CONFLICT,
          INVALID_ID: INVALID_ID,
          MISSING_ID: MISSING_ID,
          RESERVED_ID: RESERVED_ID,
          NOT_OPEN: NOT_OPEN,
          UNKNOWN_ERROR: UNKNOWN_ERROR,
          BAD_ARG: BAD_ARG,
          INVALID_REQUEST: INVALID_REQUEST,
          QUERY_PARSE_ERROR: QUERY_PARSE_ERROR,
          DOC_VALIDATION: DOC_VALIDATION,
          BAD_REQUEST: BAD_REQUEST,
          NOT_AN_OBJECT: NOT_AN_OBJECT,
          DB_MISSING: DB_MISSING,
          WSQ_ERROR: WSQ_ERROR,
          LDB_ERROR: LDB_ERROR,
          FORBIDDEN: FORBIDDEN,
          INVALID_REV: INVALID_REV,
          FILE_EXISTS: FILE_EXISTS,
          MISSING_STUB: MISSING_STUB,
          IDB_ERROR: IDB_ERROR,
          INVALID_URL: INVALID_URL
        };
        function createError(error, reason, name) {
          function CustomPouchError(reason) {
            for (var p in error) {
              if (typeof error[p] !== 'function') {
                this[p] = error[p];
              }
            }
            if (name !== undefined) {
              this.name = name;
            }
            if (reason !== undefined) {
              this.reason = reason;
            }
          }
          CustomPouchError.prototype = PouchError.prototype;
          return new CustomPouchError(reason);
        }
        function tryFilter(filter, doc, req) {
          try {
            return !filter(doc, req);
          } catch (err) {
            var msg = 'Filter function threw: ' + err.toString();
            return createError(BAD_REQUEST, msg);
          }
        }
        function filterChange(opts) {
          var req = {};
          var hasFilter = opts.filter && typeof opts.filter === 'function';
          req.query = opts.query_params;
          return function filter(change) {
            if (!change.doc) {
              change.doc = {};
            }
            var filterReturn = hasFilter && tryFilter(opts.filter, change.doc, req);
            if (typeof filterReturn === 'object') {
              return filterReturn;
            }
            if (filterReturn) {
              return false;
            }
            if (!opts.include_docs) {
              delete change.doc;
            } else if (!opts.attachments) {
              for (var att in change.doc._attachments) {
                if (change.doc._attachments.hasOwnProperty(att)) {
                  change.doc._attachments[att].stub = true;
                }
              }
            }
            return true;
          };
        }
        function safeJsonParse(str) {
          try {
            return JSON.parse(str);
          } catch (e) {
            return vuvuzela.parse(str);
          }
        }
        function safeJsonStringify(json) {
          try {
            return JSON.stringify(json);
          } catch (e) {
            return vuvuzela.stringify(json);
          }
        }
        function winningRev(metadata) {
          var winningId;
          var winningPos;
          var winningDeleted;
          var toVisit = metadata.rev_tree.slice();
          var node;
          while ((node = toVisit.pop())) {
            var tree = node.ids;
            var branches = tree[2];
            var pos = node.pos;
            if (branches.length) {
              for (var i = 0,
                  len = branches.length; i < len; i++) {
                toVisit.push({
                  pos: pos + 1,
                  ids: branches[i]
                });
              }
              continue;
            }
            var deleted = !!tree[1].deleted;
            var id = tree[0];
            if (!winningId || (winningDeleted !== deleted ? winningDeleted : winningPos !== pos ? winningPos < pos : winningId < id)) {
              winningId = id;
              winningPos = pos;
              winningDeleted = deleted;
            }
          }
          return winningPos + '-' + winningId;
        }
        function traverseRevTree(revs, callback) {
          var toVisit = revs.slice();
          var node;
          while ((node = toVisit.pop())) {
            var pos = node.pos;
            var tree = node.ids;
            var branches = tree[2];
            var newCtx = callback(branches.length === 0, pos, tree[0], node.ctx, tree[1]);
            for (var i = 0,
                len = branches.length; i < len; i++) {
              toVisit.push({
                pos: pos + 1,
                ids: branches[i],
                ctx: newCtx
              });
            }
          }
        }
        function compactTree(metadata) {
          var revs = [];
          traverseRevTree(metadata.rev_tree, function(isLeaf, pos, revHash, ctx, opts) {
            if (opts.status === 'available' && !isLeaf) {
              revs.push(pos + '-' + revHash);
              opts.status = 'missing';
            }
          });
          return revs;
        }
        function sortByPos(a, b) {
          return a.pos - b.pos;
        }
        function collectLeaves(revs) {
          var leaves = [];
          traverseRevTree(revs, function(isLeaf, pos, id, acc, opts) {
            if (isLeaf) {
              leaves.push({
                rev: pos + "-" + id,
                pos: pos,
                opts: opts
              });
            }
          });
          leaves.sort(sortByPos).reverse();
          for (var i = 0,
              len = leaves.length; i < len; i++) {
            delete leaves[i].pos;
          }
          return leaves;
        }
        function collectConflicts(metadata) {
          var win = winningRev(metadata);
          var leaves = collectLeaves(metadata.rev_tree);
          var conflicts = [];
          for (var i = 0,
              len = leaves.length; i < len; i++) {
            var leaf = leaves[i];
            if (leaf.rev !== win && !leaf.opts.deleted) {
              conflicts.push(leaf.rev);
            }
          }
          return conflicts;
        }
        function getTrees(node) {
          return node.ids;
        }
        function isDeleted(metadata, rev) {
          if (!rev) {
            rev = winningRev(metadata);
          }
          var id = rev.substring(rev.indexOf('-') + 1);
          var toVisit = metadata.rev_tree.map(getTrees);
          var tree;
          while ((tree = toVisit.pop())) {
            if (tree[0] === id) {
              return !!tree[1].deleted;
            }
            toVisit = toVisit.concat(tree[2]);
          }
        }
        function isLocalId(id) {
          return (/^_local/).test(id);
        }
        function toObject(array) {
          return array.reduce(function(obj, item) {
            obj[item] = true;
            return obj;
          }, {});
        }
        var reservedWords = toObject(['_id', '_rev', '_attachments', '_deleted', '_revisions', '_revs_info', '_conflicts', '_deleted_conflicts', '_local_seq', '_rev_tree', '_replication_id', '_replication_state', '_replication_state_time', '_replication_state_reason', '_replication_stats', '_removed']);
        var dataWords = toObject(['_attachments', '_replication_id', '_replication_state', '_replication_state_time', '_replication_state_reason', '_replication_stats']);
        function invalidIdError(id) {
          var err;
          if (!id) {
            err = createError(MISSING_ID);
          } else if (typeof id !== 'string') {
            err = createError(INVALID_ID);
          } else if (/^_/.test(id) && !(/^_(design|local)/).test(id)) {
            err = createError(RESERVED_ID);
          }
          if (err) {
            throw err;
          }
        }
        function parseRevisionInfo(rev) {
          if (!/^\d+\-./.test(rev)) {
            return createError(INVALID_REV);
          }
          var idx = rev.indexOf('-');
          var left = rev.substring(0, idx);
          var right = rev.substring(idx + 1);
          return {
            prefix: parseInt(left, 10),
            id: right
          };
        }
        function makeRevTreeFromRevisions(revisions, opts) {
          var pos = revisions.start - revisions.ids.length + 1;
          var revisionIds = revisions.ids;
          var ids = [revisionIds[0], opts, []];
          for (var i = 1,
              len = revisionIds.length; i < len; i++) {
            ids = [revisionIds[i], {status: 'missing'}, [ids]];
          }
          return [{
            pos: pos,
            ids: ids
          }];
        }
        function parseDoc(doc, newEdits) {
          var nRevNum;
          var newRevId;
          var revInfo;
          var opts = {status: 'available'};
          if (doc._deleted) {
            opts.deleted = true;
          }
          if (newEdits) {
            if (!doc._id) {
              doc._id = uuid();
            }
            newRevId = uuid(32, 16).toLowerCase();
            if (doc._rev) {
              revInfo = parseRevisionInfo(doc._rev);
              if (revInfo.error) {
                return revInfo;
              }
              doc._rev_tree = [{
                pos: revInfo.prefix,
                ids: [revInfo.id, {status: 'missing'}, [[newRevId, opts, []]]]
              }];
              nRevNum = revInfo.prefix + 1;
            } else {
              doc._rev_tree = [{
                pos: 1,
                ids: [newRevId, opts, []]
              }];
              nRevNum = 1;
            }
          } else {
            if (doc._revisions) {
              doc._rev_tree = makeRevTreeFromRevisions(doc._revisions, opts);
              nRevNum = doc._revisions.start;
              newRevId = doc._revisions.ids[0];
            }
            if (!doc._rev_tree) {
              revInfo = parseRevisionInfo(doc._rev);
              if (revInfo.error) {
                return revInfo;
              }
              nRevNum = revInfo.prefix;
              newRevId = revInfo.id;
              doc._rev_tree = [{
                pos: nRevNum,
                ids: [newRevId, opts, []]
              }];
            }
          }
          invalidIdError(doc._id);
          doc._rev = nRevNum + '-' + newRevId;
          var result = {
            metadata: {},
            data: {}
          };
          for (var key in doc) {
            if (Object.prototype.hasOwnProperty.call(doc, key)) {
              var specialKey = key[0] === '_';
              if (specialKey && !reservedWords[key]) {
                var error = createError(DOC_VALIDATION, key);
                error.message = DOC_VALIDATION.message + ': ' + key;
                throw error;
              } else if (specialKey && !dataWords[key]) {
                result.metadata[key.slice(1)] = doc[key];
              } else {
                result.data[key] = doc[key];
              }
            }
          }
          return result;
        }
        function rootToLeaf(revs) {
          var paths = [];
          var toVisit = revs.slice();
          var node;
          while ((node = toVisit.pop())) {
            var pos = node.pos;
            var tree = node.ids;
            var id = tree[0];
            var opts = tree[1];
            var branches = tree[2];
            var isLeaf = branches.length === 0;
            var history = node.history ? node.history.slice() : [];
            history.push({
              id: id,
              opts: opts
            });
            if (isLeaf) {
              paths.push({
                pos: (pos + 1 - history.length),
                ids: history
              });
            }
            for (var i = 0,
                len = branches.length; i < len; i++) {
              toVisit.push({
                pos: pos + 1,
                ids: branches[i],
                history: history
              });
            }
          }
          return paths.reverse();
        }
        function sortByPos$1(a, b) {
          return a.pos - b.pos;
        }
        function binarySearch(arr, item, comparator) {
          var low = 0;
          var high = arr.length;
          var mid;
          while (low < high) {
            mid = (low + high) >>> 1;
            if (comparator(arr[mid], item) < 0) {
              low = mid + 1;
            } else {
              high = mid;
            }
          }
          return low;
        }
        function insertSorted(arr, item, comparator) {
          var idx = binarySearch(arr, item, comparator);
          arr.splice(idx, 0, item);
        }
        function pathToTree(path, numStemmed) {
          var root;
          var leaf;
          for (var i = numStemmed,
              len = path.length; i < len; i++) {
            var node = path[i];
            var currentLeaf = [node.id, node.opts, []];
            if (leaf) {
              leaf[2].push(currentLeaf);
              leaf = currentLeaf;
            } else {
              root = leaf = currentLeaf;
            }
          }
          return root;
        }
        function compareTree(a, b) {
          return a[0] < b[0] ? -1 : 1;
        }
        function mergeTree(in_tree1, in_tree2) {
          var queue = [{
            tree1: in_tree1,
            tree2: in_tree2
          }];
          var conflicts = false;
          while (queue.length > 0) {
            var item = queue.pop();
            var tree1 = item.tree1;
            var tree2 = item.tree2;
            if (tree1[1].status || tree2[1].status) {
              tree1[1].status = (tree1[1].status === 'available' || tree2[1].status === 'available') ? 'available' : 'missing';
            }
            for (var i = 0; i < tree2[2].length; i++) {
              if (!tree1[2][0]) {
                conflicts = 'new_leaf';
                tree1[2][0] = tree2[2][i];
                continue;
              }
              var merged = false;
              for (var j = 0; j < tree1[2].length; j++) {
                if (tree1[2][j][0] === tree2[2][i][0]) {
                  queue.push({
                    tree1: tree1[2][j],
                    tree2: tree2[2][i]
                  });
                  merged = true;
                }
              }
              if (!merged) {
                conflicts = 'new_branch';
                insertSorted(tree1[2], tree2[2][i], compareTree);
              }
            }
          }
          return {
            conflicts: conflicts,
            tree: in_tree1
          };
        }
        function doMerge(tree, path, dontExpand) {
          var restree = [];
          var conflicts = false;
          var merged = false;
          var res;
          if (!tree.length) {
            return {
              tree: [path],
              conflicts: 'new_leaf'
            };
          }
          for (var i = 0,
              len = tree.length; i < len; i++) {
            var branch = tree[i];
            if (branch.pos === path.pos && branch.ids[0] === path.ids[0]) {
              res = mergeTree(branch.ids, path.ids);
              restree.push({
                pos: branch.pos,
                ids: res.tree
              });
              conflicts = conflicts || res.conflicts;
              merged = true;
            } else if (dontExpand !== true) {
              var t1 = branch.pos < path.pos ? branch : path;
              var t2 = branch.pos < path.pos ? path : branch;
              var diff = t2.pos - t1.pos;
              var candidateParents = [];
              var trees = [];
              trees.push({
                ids: t1.ids,
                diff: diff,
                parent: null,
                parentIdx: null
              });
              while (trees.length > 0) {
                var item = trees.pop();
                if (item.diff === 0) {
                  if (item.ids[0] === t2.ids[0]) {
                    candidateParents.push(item);
                  }
                  continue;
                }
                var elements = item.ids[2];
                for (var j = 0,
                    elementsLen = elements.length; j < elementsLen; j++) {
                  trees.push({
                    ids: elements[j],
                    diff: item.diff - 1,
                    parent: item.ids,
                    parentIdx: j
                  });
                }
              }
              var el = candidateParents[0];
              if (!el) {
                restree.push(branch);
              } else {
                res = mergeTree(el.ids, t2.ids);
                el.parent[2][el.parentIdx] = res.tree;
                restree.push({
                  pos: t1.pos,
                  ids: t1.ids
                });
                conflicts = conflicts || res.conflicts;
                merged = true;
              }
            } else {
              restree.push(branch);
            }
          }
          if (!merged) {
            restree.push(path);
          }
          restree.sort(sortByPos$1);
          return {
            tree: restree,
            conflicts: conflicts || 'internal_node'
          };
        }
        function stem(tree, depth) {
          var paths = rootToLeaf(tree);
          var result;
          for (var i = 0,
              len = paths.length; i < len; i++) {
            var path = paths[i];
            var stemmed = path.ids;
            var numStemmed = Math.max(0, stemmed.length - depth);
            var stemmedNode = {
              pos: path.pos + numStemmed,
              ids: pathToTree(stemmed, numStemmed)
            };
            if (result) {
              result = doMerge(result, stemmedNode, true).tree;
            } else {
              result = [stemmedNode];
            }
          }
          return result;
        }
        function merge(tree, path, depth) {
          var newTree = doMerge(tree, path);
          return {
            tree: stem(newTree.tree, depth),
            conflicts: newTree.conflicts
          };
        }
        function revExists(revs, rev) {
          var toVisit = revs.slice();
          var splitRev = rev.split('-');
          var targetPos = parseInt(splitRev[0], 10);
          var targetId = splitRev[1];
          var node;
          while ((node = toVisit.pop())) {
            if (node.pos === targetPos && node.ids[0] === targetId) {
              return true;
            }
            var branches = node.ids[2];
            for (var i = 0,
                len = branches.length; i < len; i++) {
              toVisit.push({
                pos: node.pos + 1,
                ids: branches[i]
              });
            }
          }
          return false;
        }
        function updateDoc(revLimit, prev, docInfo, results, i, cb, writeDoc, newEdits) {
          if (revExists(prev.rev_tree, docInfo.metadata.rev)) {
            results[i] = docInfo;
            return cb();
          }
          var previousWinningRev = prev.winningRev || winningRev(prev);
          var previouslyDeleted = 'deleted' in prev ? prev.deleted : isDeleted(prev, previousWinningRev);
          var deleted = 'deleted' in docInfo.metadata ? docInfo.metadata.deleted : isDeleted(docInfo.metadata);
          var isRoot = /^1-/.test(docInfo.metadata.rev);
          if (previouslyDeleted && !deleted && newEdits && isRoot) {
            var newDoc = docInfo.data;
            newDoc._rev = previousWinningRev;
            newDoc._id = docInfo.metadata.id;
            docInfo = parseDoc(newDoc, newEdits);
          }
          var merged = merge(prev.rev_tree, docInfo.metadata.rev_tree[0], revLimit);
          var inConflict = newEdits && (((previouslyDeleted && deleted) || (!previouslyDeleted && merged.conflicts !== 'new_leaf') || (previouslyDeleted && !deleted && merged.conflicts === 'new_branch')));
          if (inConflict) {
            var err = createError(REV_CONFLICT);
            results[i] = err;
            return cb();
          }
          var newRev = docInfo.metadata.rev;
          docInfo.metadata.rev_tree = merged.tree;
          if (prev.rev_map) {
            docInfo.metadata.rev_map = prev.rev_map;
          }
          var winningRev$$ = winningRev(docInfo.metadata);
          var winningRevIsDeleted = isDeleted(docInfo.metadata, winningRev$$);
          var delta = (previouslyDeleted === winningRevIsDeleted) ? 0 : previouslyDeleted < winningRevIsDeleted ? -1 : 1;
          var newRevIsDeleted;
          if (newRev === winningRev$$) {
            newRevIsDeleted = winningRevIsDeleted;
          } else {
            newRevIsDeleted = isDeleted(docInfo.metadata, newRev);
          }
          writeDoc(docInfo, winningRev$$, winningRevIsDeleted, newRevIsDeleted, true, delta, i, cb);
        }
        function rootIsMissing(docInfo) {
          return docInfo.metadata.rev_tree[0].ids[1].status === 'missing';
        }
        function processDocs(revLimit, docInfos, api, fetchedDocs, tx, results, writeDoc, opts, overallCallback) {
          revLimit = revLimit || 1000;
          function insertDoc(docInfo, resultsIdx, callback) {
            var winningRev$$ = winningRev(docInfo.metadata);
            var deleted = isDeleted(docInfo.metadata, winningRev$$);
            if ('was_delete' in opts && deleted) {
              results[resultsIdx] = createError(MISSING_DOC, 'deleted');
              return callback();
            }
            var inConflict = newEdits && rootIsMissing(docInfo);
            if (inConflict) {
              var err = createError(REV_CONFLICT);
              results[resultsIdx] = err;
              return callback();
            }
            var delta = deleted ? 0 : 1;
            writeDoc(docInfo, winningRev$$, deleted, deleted, false, delta, resultsIdx, callback);
          }
          var newEdits = opts.new_edits;
          var idsToDocs = new collections.Map();
          var docsDone = 0;
          var docsToDo = docInfos.length;
          function checkAllDocsDone() {
            if (++docsDone === docsToDo && overallCallback) {
              overallCallback();
            }
          }
          docInfos.forEach(function(currentDoc, resultsIdx) {
            if (currentDoc._id && isLocalId(currentDoc._id)) {
              var fun = currentDoc._deleted ? '_removeLocal' : '_putLocal';
              api[fun](currentDoc, {ctx: tx}, function(err, res) {
                results[resultsIdx] = err || res;
                checkAllDocsDone();
              });
              return;
            }
            var id = currentDoc.metadata.id;
            if (idsToDocs.has(id)) {
              docsToDo--;
              idsToDocs.get(id).push([currentDoc, resultsIdx]);
            } else {
              idsToDocs.set(id, [[currentDoc, resultsIdx]]);
            }
          });
          idsToDocs.forEach(function(docs, id) {
            var numDone = 0;
            function docWritten() {
              if (++numDone < docs.length) {
                nextDoc();
              } else {
                checkAllDocsDone();
              }
            }
            function nextDoc() {
              var value = docs[numDone];
              var currentDoc = value[0];
              var resultsIdx = value[1];
              if (fetchedDocs.has(id)) {
                updateDoc(revLimit, fetchedDocs.get(id), currentDoc, results, resultsIdx, docWritten, writeDoc, newEdits);
              } else {
                var merged = merge([], currentDoc.metadata.rev_tree[0], revLimit);
                currentDoc.metadata.rev_tree = merged.tree;
                insertDoc(currentDoc, resultsIdx, docWritten);
              }
            }
            nextDoc();
          });
        }
        var PouchPromise = typeof Promise === 'function' ? Promise : lie;
        function once(fun) {
          var called = false;
          return getArguments(function(args) {
            if (called) {
              throw new Error('once called more than once');
            } else {
              called = true;
              fun.apply(this, args);
            }
          });
        }
        function toPromise(func) {
          return getArguments(function(args) {
            args = clone(args);
            var self = this;
            var tempCB = (typeof args[args.length - 1] === 'function') ? args.pop() : false;
            var usedCB;
            if (tempCB) {
              usedCB = function(err, resp) {
                process.nextTick(function() {
                  tempCB(err, resp);
                });
              };
            }
            var promise = new PouchPromise(function(fulfill, reject) {
              var resp;
              try {
                var callback = once(function(err, mesg) {
                  if (err) {
                    reject(err);
                  } else {
                    fulfill(mesg);
                  }
                });
                args.push(callback);
                resp = func.apply(self, args);
                if (resp && typeof resp.then === 'function') {
                  fulfill(resp);
                }
              } catch (e) {
                reject(e);
              }
            });
            if (usedCB) {
              promise.then(function(result) {
                usedCB(null, result);
              }, usedCB);
            }
            return promise;
          });
        }
        var thisAtob = function(str) {
          return atob(str);
        };
        var thisBtoa = function(str) {
          return btoa(str);
        };
        var setImmediateShim = global.setImmediate || global.setTimeout;
        var MD5_CHUNK_SIZE = 32768;
        function rawToBase64(raw) {
          return thisBtoa(raw);
        }
        function appendBuffer(buffer, data, start, end) {
          if (start > 0 || end < data.byteLength) {
            data = new Uint8Array(data, start, Math.min(end, data.byteLength) - start);
          }
          buffer.append(data);
        }
        function appendString(buffer, data, start, end) {
          if (start > 0 || end < data.length) {
            data = data.substring(start, end);
          }
          buffer.appendBinary(data);
        }
        var md5 = toPromise(function(data, callback) {
          var inputIsString = typeof data === 'string';
          var len = inputIsString ? data.length : data.byteLength;
          var chunkSize = Math.min(MD5_CHUNK_SIZE, len);
          var chunks = Math.ceil(len / chunkSize);
          var currentChunk = 0;
          var buffer = inputIsString ? new Md5() : new Md5.ArrayBuffer();
          var append = inputIsString ? appendString : appendBuffer;
          function loadNextChunk() {
            var start = currentChunk * chunkSize;
            var end = start + chunkSize;
            currentChunk++;
            if (currentChunk < chunks) {
              append(buffer, data, start, end);
              setImmediateShim(loadNextChunk);
            } else {
              append(buffer, data, start, end);
              var raw = buffer.end(true);
              var base64 = rawToBase64(raw);
              callback(null, base64);
              buffer.destroy();
            }
          }
          loadNextChunk();
        });
        var toSublevel = function(name, db, callback) {
          process.nextTick(function() {
            callback();
          });
        };
        var localAndMetaStores = function(db, stores, callback) {
          process.nextTick(function() {
            callback();
          });
        };
        var migrate = {
          toSublevel: toSublevel,
          localAndMetaStores: localAndMetaStores
        };
        function f() {}
        var hasName = f.name;
        var res;
        if (hasName) {
          res = function(fun) {
            return fun.name;
          };
        } else {
          res = function(fun) {
            return fun.toString().match(/^\s*function\s*(\S*)\s*\(/)[1];
          };
        }
        var functionName = res;
        function createBlob(parts, properties) {
          parts = parts || [];
          properties = properties || {};
          try {
            return new Blob(parts, properties);
          } catch (e) {
            if (e.name !== "TypeError") {
              throw e;
            }
            var Builder = typeof BlobBuilder !== 'undefined' ? BlobBuilder : typeof MSBlobBuilder !== 'undefined' ? MSBlobBuilder : typeof MozBlobBuilder !== 'undefined' ? MozBlobBuilder : WebKitBlobBuilder;
            var builder = new Builder();
            for (var i = 0; i < parts.length; i += 1) {
              builder.append(parts[i]);
            }
            return builder.getBlob(properties.type);
          }
        }
        function readAsBlobOrBuffer(storedObject, type) {
          return createBlob([storedObject.toArrayBuffer()], {type: type});
        }
        function arrayBufferToBinaryString(buffer) {
          var binary = '';
          var bytes = new Uint8Array(buffer);
          var length = bytes.byteLength;
          for (var i = 0; i < length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return binary;
        }
        function readAsBinaryString(blob, callback) {
          if (typeof FileReader === 'undefined') {
            return callback(arrayBufferToBinaryString(new FileReaderSync().readAsArrayBuffer(blob)));
          }
          var reader = new FileReader();
          var hasBinaryString = typeof reader.readAsBinaryString === 'function';
          reader.onloadend = function(e) {
            var result = e.target.result || '';
            if (hasBinaryString) {
              return callback(result);
            }
            callback(arrayBufferToBinaryString(result));
          };
          if (hasBinaryString) {
            reader.readAsBinaryString(blob);
          } else {
            reader.readAsArrayBuffer(blob);
          }
        }
        function prepareAttachmentForStorage(attData, cb) {
          readAsBinaryString(attData, cb);
        }
        function createEmptyBlobOrBuffer(type) {
          return createBlob([''], {type: type});
        }
        function binaryStringToArrayBuffer(bin) {
          var length = bin.length;
          var buf = new ArrayBuffer(length);
          var arr = new Uint8Array(buf);
          for (var i = 0; i < length; i++) {
            arr[i] = bin.charCodeAt(i);
          }
          return buf;
        }
        function binStringToBluffer(binString, type) {
          return createBlob([binaryStringToArrayBuffer(binString)], {type: type});
        }
        function getCacheFor(transaction, store) {
          var prefix = store.prefix()[0];
          var cache = transaction._cache;
          var subCache = cache.get(prefix);
          if (!subCache) {
            subCache = new collections.Map();
            cache.set(prefix, subCache);
          }
          return subCache;
        }
        function LevelTransaction() {
          this._batch = [];
          this._cache = new collections.Map();
        }
        LevelTransaction.prototype.get = function(store, key, callback) {
          var cache = getCacheFor(this, store);
          var exists = cache.get(key);
          if (exists) {
            return process.nextTick(function() {
              callback(null, exists);
            });
          } else if (exists === null) {
            return process.nextTick(function() {
              callback({name: 'NotFoundError'});
            });
          }
          store.get(key, function(err, res) {
            if (err) {
              if (err.name === 'NotFoundError') {
                cache.set(key, null);
              }
              return callback(err);
            }
            cache.set(key, res);
            callback(null, res);
          });
        };
        LevelTransaction.prototype.batch = function(batch) {
          for (var i = 0,
              len = batch.length; i < len; i++) {
            var operation = batch[i];
            var cache = getCacheFor(this, operation.prefix);
            if (operation.type === 'put') {
              cache.set(operation.key, operation.value);
            } else {
              cache.set(operation.key, null);
            }
          }
          this._batch = this._batch.concat(batch);
        };
        LevelTransaction.prototype.execute = function(db, callback) {
          var keys = new collections.Set();
          var uniqBatches = [];
          for (var i = this._batch.length - 1; i >= 0; i--) {
            var operation = this._batch[i];
            var lookupKey = operation.prefix.prefix()[0] + '\xff' + operation.key;
            if (keys.has(lookupKey)) {
              continue;
            }
            keys.add(lookupKey);
            uniqBatches.push(operation);
          }
          db.batch(uniqBatches, callback);
        };
        var DOC_STORE = 'document-store';
        var BY_SEQ_STORE = 'by-sequence';
        var ATTACHMENT_STORE = 'attach-store';
        var BINARY_STORE = 'attach-binary-store';
        var LOCAL_STORE = 'local-store';
        var META_STORE = 'meta-store';
        var dbStores = new collections.Map();
        var UPDATE_SEQ_KEY = '_local_last_update_seq';
        var DOC_COUNT_KEY = '_local_doc_count';
        var UUID_KEY = '_local_uuid';
        var MD5_PREFIX = 'md5-';
        var safeJsonEncoding = {
          encode: safeJsonStringify,
          decode: safeJsonParse,
          buffer: false,
          type: 'cheap-json'
        };
        var requireLeveldown = function() {
          try {
            return _dereq_(7);
          } catch (err) {
            err = err || 'leveldown import error';
            if (err.code === 'MODULE_NOT_FOUND') {
              return new Error(['the \'leveldown\' package is not available. install it, or,', 'specify another storage backend using the \'db\' option'].join(' '));
            } else if (err.message && err.message.match('Module version mismatch')) {
              return new Error([err.message, 'This generally implies that leveldown was built with a different', 'version of node than that which is running now.  You may try', 'fully removing and reinstalling PouchDB or leveldown to resolve.'].join(' '));
            }
            return new Error(err.toString() + ': unable to import leveldown');
          }
        };
        function getWinningRev(metadata) {
          return 'winningRev' in metadata ? metadata.winningRev : winningRev(metadata);
        }
        function getIsDeleted(metadata, winningRev) {
          return 'deleted' in metadata ? metadata.deleted : isDeleted(metadata, winningRev);
        }
        function fetchAttachment(att, stores, opts) {
          var type = att.content_type;
          return new PouchPromise(function(resolve, reject) {
            stores.binaryStore.get(att.digest, function(err, buffer) {
              var data;
              if (err) {
                if (err.name !== 'NotFoundError') {
                  return reject(err);
                } else {
                  if (!opts.binary) {
                    data = '';
                  } else {
                    data = binStringToBluffer('', type);
                  }
                }
              } else {
                if (opts.binary) {
                  data = readAsBlobOrBuffer(buffer, type);
                } else {
                  data = buffer.toString('base64');
                }
              }
              delete att.stub;
              delete att.length;
              att.data = data;
              resolve();
            });
          });
        }
        function fetchAttachments(results, stores, opts) {
          var atts = [];
          results.forEach(function(row) {
            if (!(row.doc && row.doc._attachments)) {
              return;
            }
            var attNames = Object.keys(row.doc._attachments);
            attNames.forEach(function(attName) {
              var att = row.doc._attachments[attName];
              if (!('data' in att)) {
                atts.push(att);
              }
            });
          });
          return PouchPromise.all(atts.map(function(att) {
            return fetchAttachment(att, stores, opts);
          }));
        }
        function LevelPouch(opts, callback) {
          opts = clone(opts);
          var api = this;
          var instanceId;
          var stores = {};
          var revLimit = opts.revs_limit;
          var db;
          var name = opts.name;
          if (typeof opts.createIfMissing === 'undefined') {
            opts.createIfMissing = true;
          }
          var leveldown = opts.db || requireLeveldown();
          if (leveldown instanceof Error) {
            return callback(leveldown);
          }
          if (typeof leveldown.destroy !== 'function') {
            leveldown.destroy = function(name, cb) {
              cb();
            };
          }
          var dbStore;
          var leveldownName = functionName(leveldown);
          if (dbStores.has(leveldownName)) {
            dbStore = dbStores.get(leveldownName);
          } else {
            dbStore = new collections.Map();
            dbStores.set(leveldownName, dbStore);
          }
          if (dbStore.has(name)) {
            db = dbStore.get(name);
            afterDBCreated();
          } else {
            dbStore.set(name, sublevel(levelup(name, opts, function(err) {
              if (err) {
                dbStore["delete"](name);
                return callback(err);
              }
              db = dbStore.get(name);
              db._docCount = -1;
              db._queue = new Deque();
              if (opts.db || opts.noMigrate) {
                afterDBCreated();
              } else {
                migrate.toSublevel(name, db, afterDBCreated);
              }
            })));
          }
          function afterDBCreated() {
            stores.docStore = db.sublevel(DOC_STORE, {valueEncoding: safeJsonEncoding});
            stores.bySeqStore = db.sublevel(BY_SEQ_STORE, {valueEncoding: 'json'});
            stores.attachmentStore = db.sublevel(ATTACHMENT_STORE, {valueEncoding: 'json'});
            stores.binaryStore = db.sublevel(BINARY_STORE, {valueEncoding: 'binary'});
            stores.localStore = db.sublevel(LOCAL_STORE, {valueEncoding: 'json'});
            stores.metaStore = db.sublevel(META_STORE, {valueEncoding: 'json'});
            migrate.localAndMetaStores(db, stores, function() {
              stores.metaStore.get(UPDATE_SEQ_KEY, function(err, value) {
                if (typeof db._updateSeq === 'undefined') {
                  db._updateSeq = value || 0;
                }
                stores.metaStore.get(DOC_COUNT_KEY, function(err, value) {
                  db._docCount = !err ? value : 0;
                  stores.metaStore.get(UUID_KEY, function(err, value) {
                    instanceId = !err ? value : uuid();
                    stores.metaStore.put(UUID_KEY, instanceId, function(err, value) {
                      process.nextTick(function() {
                        callback(null, api);
                      });
                    });
                  });
                });
              });
            });
          }
          function countDocs(callback) {
            if (db.isClosed()) {
              return callback(new Error('database is closed'));
            }
            return callback(null, db._docCount);
          }
          api.type = function() {
            return 'leveldb';
          };
          api._id = function(callback) {
            callback(null, instanceId);
          };
          api._info = function(callback) {
            var res = {
              doc_count: db._docCount,
              update_seq: db._updateSeq,
              backend_adapter: functionName(leveldown)
            };
            return process.nextTick(function() {
              callback(null, res);
            });
          };
          function tryCode(fun, args) {
            try {
              fun.apply(null, args);
            } catch (err) {
              args[args.length - 1](err);
            }
          }
          function executeNext() {
            var firstTask = db._queue.peekFront();
            if (firstTask.type === 'read') {
              runReadOperation(firstTask);
            } else {
              runWriteOperation(firstTask);
            }
          }
          function runReadOperation(firstTask) {
            var readTasks = [firstTask];
            var i = 1;
            var nextTask = db._queue.get(i);
            while (typeof nextTask !== 'undefined' && nextTask.type === 'read') {
              readTasks.push(nextTask);
              i++;
              nextTask = db._queue.get(i);
            }
            var numDone = 0;
            readTasks.forEach(function(readTask) {
              var args = readTask.args;
              var callback = args[args.length - 1];
              args[args.length - 1] = getArguments(function(cbArgs) {
                callback.apply(null, cbArgs);
                if (++numDone === readTasks.length) {
                  process.nextTick(function() {
                    readTasks.forEach(function() {
                      db._queue.shift();
                    });
                    if (db._queue.length) {
                      executeNext();
                    }
                  });
                }
              });
              tryCode(readTask.fun, args);
            });
          }
          function runWriteOperation(firstTask) {
            var args = firstTask.args;
            var callback = args[args.length - 1];
            args[args.length - 1] = getArguments(function(cbArgs) {
              callback.apply(null, cbArgs);
              process.nextTick(function() {
                db._queue.shift();
                if (db._queue.length) {
                  executeNext();
                }
              });
            });
            tryCode(firstTask.fun, args);
          }
          function writeLock(fun) {
            return getArguments(function(args) {
              db._queue.push({
                fun: fun,
                args: args,
                type: 'write'
              });
              if (db._queue.length === 1) {
                process.nextTick(executeNext);
              }
            });
          }
          function readLock(fun) {
            return getArguments(function(args) {
              db._queue.push({
                fun: fun,
                args: args,
                type: 'read'
              });
              if (db._queue.length === 1) {
                process.nextTick(executeNext);
              }
            });
          }
          function formatSeq(n) {
            return ('0000000000000000' + n).slice(-16);
          }
          function parseSeq(s) {
            return parseInt(s, 10);
          }
          api._get = readLock(function(id, opts, callback) {
            opts = clone(opts);
            stores.docStore.get(id, function(err, metadata) {
              if (err || !metadata) {
                return callback(createError(MISSING_DOC, 'missing'));
              }
              var rev = getWinningRev(metadata);
              var deleted = getIsDeleted(metadata, rev);
              if (deleted && !opts.rev) {
                return callback(createError(MISSING_DOC, "deleted"));
              }
              rev = opts.rev ? opts.rev : rev;
              var seq = metadata.rev_map[rev];
              stores.bySeqStore.get(formatSeq(seq), function(err, doc) {
                if (!doc) {
                  return callback(createError(MISSING_DOC));
                }
                if ('_id' in doc && doc._id !== metadata.id) {
                  return callback(new Error('wrong doc returned'));
                }
                doc._id = metadata.id;
                if ('_rev' in doc) {
                  if (doc._rev !== rev) {
                    return callback(new Error('wrong doc returned'));
                  }
                } else {
                  doc._rev = rev;
                }
                return callback(null, {
                  doc: doc,
                  metadata: metadata
                });
              });
            });
          });
          api._getAttachment = function(attachment, opts, callback) {
            var digest = attachment.digest;
            var type = attachment.content_type;
            stores.binaryStore.get(digest, function(err, attach) {
              if (err) {
                if (err.name !== 'NotFoundError') {
                  return callback(err);
                }
                return callback(null, opts.binary ? createEmptyBlobOrBuffer(type) : '');
              }
              if (opts.binary) {
                callback(null, readAsBlobOrBuffer(attach, type));
              } else {
                callback(null, attach.toString('base64'));
              }
            });
          };
          api._bulkDocs = writeLock(function(req, opts, callback) {
            var newEdits = opts.new_edits;
            var results = new Array(req.docs.length);
            var fetchedDocs = new collections.Map();
            var txn = new LevelTransaction();
            var docCountDelta = 0;
            var newUpdateSeq = db._updateSeq;
            var userDocs = req.docs;
            var docInfos = userDocs.map(function(doc, i) {
              if (doc._id && isLocalId(doc._id)) {
                return doc;
              }
              var newDoc = parseDoc(doc, newEdits);
              if (newDoc.metadata && !newDoc.metadata.rev_map) {
                newDoc.metadata.rev_map = {};
              }
              return newDoc;
            });
            var infoErrors = docInfos.filter(function(doc) {
              return doc.error;
            });
            if (infoErrors.length) {
              return callback(infoErrors[0]);
            }
            function verifyAttachment(digest, callback) {
              txn.get(stores.attachmentStore, digest, function(levelErr) {
                if (levelErr) {
                  var err = createError(MISSING_STUB, 'unknown stub attachment with digest ' + digest);
                  callback(err);
                } else {
                  callback();
                }
              });
            }
            function verifyAttachments(finish) {
              var digests = [];
              userDocs.forEach(function(doc) {
                if (doc && doc._attachments) {
                  Object.keys(doc._attachments).forEach(function(filename) {
                    var att = doc._attachments[filename];
                    if (att.stub) {
                      digests.push(att.digest);
                    }
                  });
                }
              });
              if (!digests.length) {
                return finish();
              }
              var numDone = 0;
              var err;
              digests.forEach(function(digest) {
                verifyAttachment(digest, function(attErr) {
                  if (attErr && !err) {
                    err = attErr;
                  }
                  if (++numDone === digests.length) {
                    finish(err);
                  }
                });
              });
            }
            function fetchExistingDocs(finish) {
              var numDone = 0;
              var overallErr;
              function checkDone() {
                if (++numDone === userDocs.length) {
                  return finish(overallErr);
                }
              }
              userDocs.forEach(function(doc) {
                if (doc._id && isLocalId(doc._id)) {
                  return checkDone();
                }
                txn.get(stores.docStore, doc._id, function(err, info) {
                  if (err) {
                    if (err.name !== 'NotFoundError') {
                      overallErr = err;
                    }
                  } else {
                    fetchedDocs.set(doc._id, info);
                  }
                  checkDone();
                });
              });
            }
            function autoCompact(callback) {
              var promise = PouchPromise.resolve();
              fetchedDocs.forEach(function(metadata, docId) {
                promise = promise.then(function() {
                  return new PouchPromise(function(resolve, reject) {
                    var revs = compactTree(metadata);
                    api._doCompactionNoLock(docId, revs, {ctx: txn}, function(err) {
                      if (err) {
                        return reject(err);
                      }
                      resolve();
                    });
                  });
                });
              });
              promise.then(function() {
                callback();
              }, callback);
            }
            function finish() {
              if (api.auto_compaction) {
                return autoCompact(complete);
              }
              return complete();
            }
            function writeDoc(docInfo, winningRev, winningRevIsDeleted, newRevIsDeleted, isUpdate, delta, resultsIdx, callback2) {
              docCountDelta += delta;
              var err = null;
              var recv = 0;
              docInfo.metadata.winningRev = winningRev;
              docInfo.metadata.deleted = winningRevIsDeleted;
              docInfo.data._id = docInfo.metadata.id;
              docInfo.data._rev = docInfo.metadata.rev;
              if (newRevIsDeleted) {
                docInfo.data._deleted = true;
              }
              var attachments = docInfo.data._attachments ? Object.keys(docInfo.data._attachments) : [];
              function attachmentSaved(attachmentErr) {
                recv++;
                if (!err) {
                  if (attachmentErr) {
                    err = attachmentErr;
                    callback2(err);
                  } else if (recv === attachments.length) {
                    finish();
                  }
                }
              }
              function onMD5Load(doc, key, data, attachmentSaved) {
                return function(result) {
                  saveAttachment(doc, MD5_PREFIX + result, key, data, attachmentSaved);
                };
              }
              function doMD5(doc, key, attachmentSaved) {
                return function(data) {
                  md5(data).then(onMD5Load(doc, key, data, attachmentSaved));
                };
              }
              for (var i = 0; i < attachments.length; i++) {
                var key = attachments[i];
                var att = docInfo.data._attachments[key];
                if (att.stub) {
                  var id = docInfo.data._id;
                  var rev = docInfo.data._rev;
                  saveAttachmentRefs(id, rev, att.digest, attachmentSaved);
                  continue;
                }
                var data;
                if (typeof att.data === 'string') {
                  try {
                    data = thisAtob(att.data);
                  } catch (e) {
                    callback(createError(BAD_ARG, 'Attachment is not a valid base64 string'));
                    return;
                  }
                  doMD5(docInfo, key, attachmentSaved)(data);
                } else {
                  prepareAttachmentForStorage(att.data, doMD5(docInfo, key, attachmentSaved));
                }
              }
              function finish() {
                var seq = docInfo.metadata.rev_map[docInfo.metadata.rev];
                if (seq) {
                  return callback2();
                }
                seq = ++newUpdateSeq;
                docInfo.metadata.rev_map[docInfo.metadata.rev] = docInfo.metadata.seq = seq;
                var seqKey = formatSeq(seq);
                var batch = [{
                  key: seqKey,
                  value: docInfo.data,
                  prefix: stores.bySeqStore,
                  type: 'put'
                }, {
                  key: docInfo.metadata.id,
                  value: docInfo.metadata,
                  prefix: stores.docStore,
                  type: 'put'
                }];
                txn.batch(batch);
                results[resultsIdx] = {
                  ok: true,
                  id: docInfo.metadata.id,
                  rev: winningRev
                };
                fetchedDocs.set(docInfo.metadata.id, docInfo.metadata);
                callback2();
              }
              if (!attachments.length) {
                finish();
              }
            }
            var attachmentQueues = {};
            function saveAttachmentRefs(id, rev, digest, callback) {
              function fetchAtt() {
                return new PouchPromise(function(resolve, reject) {
                  txn.get(stores.attachmentStore, digest, function(err, oldAtt) {
                    if (err && err.name !== 'NotFoundError') {
                      return reject(err);
                    }
                    resolve(oldAtt);
                  });
                });
              }
              function saveAtt(oldAtt) {
                var ref = [id, rev].join('@');
                var newAtt = {};
                if (oldAtt) {
                  if (oldAtt.refs) {
                    newAtt.refs = oldAtt.refs;
                    newAtt.refs[ref] = true;
                  }
                } else {
                  newAtt.refs = {};
                  newAtt.refs[ref] = true;
                }
                return new PouchPromise(function(resolve, reject) {
                  txn.batch([{
                    type: 'put',
                    prefix: stores.attachmentStore,
                    key: digest,
                    value: newAtt
                  }]);
                  resolve(!oldAtt);
                });
              }
              var queue = attachmentQueues[digest] || PouchPromise.resolve();
              attachmentQueues[digest] = queue.then(function() {
                return fetchAtt().then(saveAtt).then(function(isNewAttachment) {
                  callback(null, isNewAttachment);
                }, callback);
              });
            }
            function saveAttachment(docInfo, digest, key, data, callback) {
              var att = docInfo.data._attachments[key];
              delete att.data;
              att.digest = digest;
              att.length = data.length;
              var id = docInfo.metadata.id;
              var rev = docInfo.metadata.rev;
              saveAttachmentRefs(id, rev, digest, function(err, isNewAttachment) {
                if (err) {
                  return callback(err);
                }
                if (data.length === 0) {
                  return callback(err);
                }
                if (!isNewAttachment) {
                  return callback(err);
                }
                txn.batch([{
                  type: 'put',
                  prefix: stores.binaryStore,
                  key: digest,
                  value: new Buffer(data, 'binary')
                }]);
                callback();
              });
            }
            function complete(err) {
              if (err) {
                return process.nextTick(function() {
                  callback(err);
                });
              }
              txn.batch([{
                prefix: stores.metaStore,
                type: 'put',
                key: UPDATE_SEQ_KEY,
                value: newUpdateSeq
              }, {
                prefix: stores.metaStore,
                type: 'put',
                key: DOC_COUNT_KEY,
                value: db._docCount + docCountDelta
              }]);
              txn.execute(db, function(err) {
                if (err) {
                  return callback(err);
                }
                db._docCount += docCountDelta;
                db._updateSeq = newUpdateSeq;
                LevelPouch.Changes.notify(name);
                process.nextTick(function() {
                  callback(null, results);
                });
              });
            }
            if (!docInfos.length) {
              return callback(null, []);
            }
            verifyAttachments(function(err) {
              if (err) {
                return callback(err);
              }
              fetchExistingDocs(function(err) {
                if (err) {
                  return callback(err);
                }
                processDocs(revLimit, docInfos, api, fetchedDocs, txn, results, writeDoc, opts, finish);
              });
            });
          });
          api._allDocs = readLock(function(opts, callback) {
            opts = clone(opts);
            countDocs(function(err, docCount) {
              if (err) {
                return callback(err);
              }
              var readstreamOpts = {};
              var skip = opts.skip || 0;
              if (opts.startkey) {
                readstreamOpts.gte = opts.startkey;
              }
              if (opts.endkey) {
                readstreamOpts.lte = opts.endkey;
              }
              if (opts.key) {
                readstreamOpts.gte = readstreamOpts.lte = opts.key;
              }
              if (opts.descending) {
                readstreamOpts.reverse = true;
                var tmp = readstreamOpts.lte;
                readstreamOpts.lte = readstreamOpts.gte;
                readstreamOpts.gte = tmp;
              }
              var limit;
              if (typeof opts.limit === 'number') {
                limit = opts.limit;
              }
              if (limit === 0 || ('start' in readstreamOpts && 'end' in readstreamOpts && readstreamOpts.start > readstreamOpts.end)) {
                return callback(null, {
                  total_rows: docCount,
                  offset: opts.skip,
                  rows: []
                });
              }
              var results = [];
              var docstream = stores.docStore.readStream(readstreamOpts);
              var throughStream = through2.obj(function(entry, _, next) {
                var metadata = entry.value;
                var winningRev = getWinningRev(metadata);
                var deleted = getIsDeleted(metadata, winningRev);
                if (!deleted) {
                  if (skip-- > 0) {
                    next();
                    return;
                  } else if (typeof limit === 'number' && limit-- <= 0) {
                    docstream.unpipe();
                    docstream.destroy();
                    next();
                    return;
                  }
                } else if (opts.deleted !== 'ok') {
                  next();
                  return;
                }
                function allDocsInner(data) {
                  var doc = {
                    id: metadata.id,
                    key: metadata.id,
                    value: {rev: winningRev}
                  };
                  if (opts.include_docs) {
                    doc.doc = data;
                    doc.doc._rev = doc.value.rev;
                    if (opts.conflicts) {
                      doc.doc._conflicts = collectConflicts(metadata);
                    }
                    for (var att in doc.doc._attachments) {
                      if (doc.doc._attachments.hasOwnProperty(att)) {
                        doc.doc._attachments[att].stub = true;
                      }
                    }
                  }
                  if (opts.inclusive_end === false && metadata.id === opts.endkey) {
                    return next();
                  } else if (deleted) {
                    if (opts.deleted === 'ok') {
                      doc.value.deleted = true;
                      doc.doc = null;
                    } else {
                      return next();
                    }
                  }
                  results.push(doc);
                  next();
                }
                if (opts.include_docs) {
                  var seq = metadata.rev_map[winningRev];
                  stores.bySeqStore.get(formatSeq(seq), function(err, data) {
                    allDocsInner(data);
                  });
                } else {
                  allDocsInner();
                }
              }, function(next) {
                PouchPromise.resolve().then(function() {
                  if (opts.include_docs && opts.attachments) {
                    return fetchAttachments(results, stores, opts);
                  }
                }).then(function() {
                  callback(null, {
                    total_rows: docCount,
                    offset: opts.skip,
                    rows: results
                  });
                }, callback);
                next();
              }).on('unpipe', function() {
                throughStream.end();
              });
              docstream.on('error', callback);
              docstream.pipe(throughStream);
            });
          });
          api._changes = function(opts) {
            opts = clone(opts);
            if (opts.continuous) {
              var id = name + ':' + uuid();
              LevelPouch.Changes.addListener(name, id, api, opts);
              LevelPouch.Changes.notify(name);
              return {cancel: function() {
                  LevelPouch.Changes.removeListener(name, id);
                }};
            }
            var descending = opts.descending;
            var results = [];
            var lastSeq = opts.since || 0;
            var called = 0;
            var streamOpts = {reverse: descending};
            var limit;
            if ('limit' in opts && opts.limit > 0) {
              limit = opts.limit;
            }
            if (!streamOpts.reverse) {
              streamOpts.start = formatSeq(opts.since || 0);
            }
            var docIds = opts.doc_ids && new collections.Set(opts.doc_ids);
            var filter = filterChange(opts);
            var docIdsToMetadata = new collections.Map();
            var returnDocs;
            if ('return_docs' in opts) {
              returnDocs = opts.return_docs;
            } else if ('returnDocs' in opts) {
              returnDocs = opts.returnDocs;
            } else {
              returnDocs = true;
            }
            function complete() {
              opts.done = true;
              if (returnDocs && opts.limit) {
                if (opts.limit < results.length) {
                  results.length = opts.limit;
                }
              }
              changeStream.unpipe(throughStream);
              changeStream.destroy();
              if (!opts.continuous && !opts.cancelled) {
                if (opts.include_docs && opts.attachments) {
                  fetchAttachments(results, stores, opts).then(function() {
                    opts.complete(null, {
                      results: results,
                      last_seq: lastSeq
                    });
                  });
                } else {
                  opts.complete(null, {
                    results: results,
                    last_seq: lastSeq
                  });
                }
              }
            }
            var changeStream = stores.bySeqStore.readStream(streamOpts);
            var throughStream = through2.obj(function(data, _, next) {
              if (limit && called >= limit) {
                complete();
                return next();
              }
              if (opts.cancelled || opts.done) {
                return next();
              }
              var seq = parseSeq(data.key);
              var doc = data.value;
              if (seq === opts.since && !descending) {
                return next();
              }
              if (docIds && !docIds.has(doc._id)) {
                return next();
              }
              var metadata;
              function onGetMetadata(metadata) {
                var winningRev = getWinningRev(metadata);
                function onGetWinningDoc(winningDoc) {
                  var change = opts.processChange(winningDoc, metadata, opts);
                  change.seq = metadata.seq;
                  var filtered = filter(change);
                  if (typeof filtered === 'object') {
                    return opts.complete(filtered);
                  }
                  if (filtered) {
                    called++;
                    if (opts.attachments && opts.include_docs) {
                      fetchAttachments([change], stores, opts).then(function() {
                        opts.onChange(change);
                      });
                    } else {
                      opts.onChange(change);
                    }
                    if (returnDocs) {
                      results.push(change);
                    }
                  }
                  next();
                }
                if (metadata.seq !== seq) {
                  return next();
                }
                lastSeq = seq;
                if (winningRev === doc._rev) {
                  return onGetWinningDoc(doc);
                }
                var winningSeq = metadata.rev_map[winningRev];
                stores.bySeqStore.get(formatSeq(winningSeq), function(err, doc) {
                  onGetWinningDoc(doc);
                });
              }
              metadata = docIdsToMetadata.get(doc._id);
              if (metadata) {
                return onGetMetadata(metadata);
              }
              stores.docStore.get(doc._id, function(err, metadata) {
                if (opts.cancelled || opts.done || db.isClosed() || isLocalId(metadata.id)) {
                  return next();
                }
                docIdsToMetadata.set(doc._id, metadata);
                onGetMetadata(metadata);
              });
            }, function(next) {
              if (opts.cancelled) {
                return next();
              }
              if (returnDocs && opts.limit) {
                if (opts.limit < results.length) {
                  results.length = opts.limit;
                }
              }
              next();
            }).on('unpipe', function() {
              throughStream.end();
              complete();
            });
            changeStream.pipe(throughStream);
            return {cancel: function() {
                opts.cancelled = true;
                complete();
              }};
          };
          api._close = function(callback) {
            if (db.isClosed()) {
              return callback(createError(NOT_OPEN));
            }
            db.close(function(err) {
              if (err) {
                callback(err);
              } else {
                dbStore["delete"](name);
                callback();
              }
            });
          };
          api._getRevisionTree = function(docId, callback) {
            stores.docStore.get(docId, function(err, metadata) {
              if (err) {
                callback(createError(MISSING_DOC));
              } else {
                callback(null, metadata.rev_tree);
              }
            });
          };
          api._doCompaction = writeLock(function(docId, revs, opts, callback) {
            api._doCompactionNoLock(docId, revs, opts, callback);
          });
          api._doCompactionNoLock = function(docId, revs, opts, callback) {
            if (typeof opts === 'function') {
              callback = opts;
              opts = {};
            }
            if (!revs.length) {
              return callback();
            }
            var txn = opts.ctx || new LevelTransaction();
            txn.get(stores.docStore, docId, function(err, metadata) {
              if (err) {
                return callback(err);
              }
              var seqs = metadata.rev_map;
              traverseRevTree(metadata.rev_tree, function(isLeaf, pos, revHash, ctx, opts) {
                var rev = pos + '-' + revHash;
                if (revs.indexOf(rev) !== -1) {
                  opts.status = 'missing';
                }
              });
              var batch = [];
              batch.push({
                key: metadata.id,
                value: metadata,
                type: 'put',
                prefix: stores.docStore
              });
              var digestMap = {};
              var numDone = 0;
              var overallErr;
              function checkDone(err) {
                if (err) {
                  overallErr = err;
                }
                if (++numDone === revs.length) {
                  if (overallErr) {
                    return callback(overallErr);
                  }
                  deleteOrphanedAttachments();
                }
              }
              function finish(err) {
                if (err) {
                  return callback(err);
                }
                txn.batch(batch);
                if (opts.ctx) {
                  return callback();
                }
                txn.execute(db, callback);
              }
              function deleteOrphanedAttachments() {
                var possiblyOrphanedAttachments = Object.keys(digestMap);
                if (!possiblyOrphanedAttachments.length) {
                  return finish();
                }
                var numDone = 0;
                var overallErr;
                function checkDone(err) {
                  if (err) {
                    overallErr = err;
                  }
                  if (++numDone === possiblyOrphanedAttachments.length) {
                    finish(overallErr);
                  }
                }
                var refsToDelete = new collections.Map();
                revs.forEach(function(rev) {
                  refsToDelete.set(docId + '@' + rev, true);
                });
                possiblyOrphanedAttachments.forEach(function(digest) {
                  txn.get(stores.attachmentStore, digest, function(err, attData) {
                    if (err) {
                      if (err.name === 'NotFoundError') {
                        return checkDone();
                      } else {
                        return checkDone(err);
                      }
                    }
                    var refs = Object.keys(attData.refs || {}).filter(function(ref) {
                      return !refsToDelete.has(ref);
                    });
                    var newRefs = {};
                    refs.forEach(function(ref) {
                      newRefs[ref] = true;
                    });
                    if (refs.length) {
                      batch.push({
                        key: digest,
                        type: 'put',
                        value: {refs: newRefs},
                        prefix: stores.attachmentStore
                      });
                    } else {
                      batch = batch.concat([{
                        key: digest,
                        type: 'del',
                        prefix: stores.attachmentStore
                      }, {
                        key: digest,
                        type: 'del',
                        prefix: stores.binaryStore
                      }]);
                    }
                    checkDone();
                  });
                });
              }
              revs.forEach(function(rev) {
                var seq = seqs[rev];
                batch.push({
                  key: formatSeq(seq),
                  type: 'del',
                  prefix: stores.bySeqStore
                });
                txn.get(stores.bySeqStore, formatSeq(seq), function(err, doc) {
                  if (err) {
                    if (err.name === 'NotFoundError') {
                      return checkDone();
                    } else {
                      return checkDone(err);
                    }
                  }
                  var atts = Object.keys(doc._attachments || {});
                  atts.forEach(function(attName) {
                    var digest = doc._attachments[attName].digest;
                    digestMap[digest] = true;
                  });
                  checkDone();
                });
              });
            });
          };
          api._getLocal = function(id, callback) {
            stores.localStore.get(id, function(err, doc) {
              if (err) {
                callback(createError(MISSING_DOC));
              } else {
                callback(null, doc);
              }
            });
          };
          api._putLocal = function(doc, opts, callback) {
            if (typeof opts === 'function') {
              callback = opts;
              opts = {};
            }
            if (opts.ctx) {
              api._putLocalNoLock(doc, opts, callback);
            } else {
              api._putLocalWithLock(doc, opts, callback);
            }
          };
          api._putLocalWithLock = writeLock(function(doc, opts, callback) {
            api._putLocalNoLock(doc, opts, callback);
          });
          api._putLocalNoLock = function(doc, opts, callback) {
            delete doc._revisions;
            var oldRev = doc._rev;
            var id = doc._id;
            var txn = opts.ctx || new LevelTransaction();
            txn.get(stores.localStore, id, function(err, resp) {
              if (err && oldRev) {
                return callback(createError(REV_CONFLICT));
              }
              if (resp && resp._rev !== oldRev) {
                return callback(createError(REV_CONFLICT));
              }
              doc._rev = oldRev ? '0-' + (parseInt(oldRev.split('-')[1], 10) + 1) : '0-1';
              var batch = [{
                type: 'put',
                prefix: stores.localStore,
                key: id,
                value: doc
              }];
              txn.batch(batch);
              var ret = {
                ok: true,
                id: doc._id,
                rev: doc._rev
              };
              if (opts.ctx) {
                return callback(null, ret);
              }
              txn.execute(db, function(err) {
                if (err) {
                  return callback(err);
                }
                callback(null, ret);
              });
            });
          };
          api._removeLocal = function(doc, opts, callback) {
            if (typeof opts === 'function') {
              callback = opts;
              opts = {};
            }
            if (opts.ctx) {
              api._removeLocalNoLock(doc, opts, callback);
            } else {
              api._removeLocalWithLock(doc, opts, callback);
            }
          };
          api._removeLocalWithLock = writeLock(function(doc, opts, callback) {
            api._removeLocalNoLock(doc, opts, callback);
          });
          api._removeLocalNoLock = function(doc, opts, callback) {
            var txn = opts.ctx || new LevelTransaction();
            txn.get(stores.localStore, doc._id, function(err, resp) {
              if (err) {
                if (err.name !== 'NotFoundError') {
                  return callback(err);
                } else {
                  return callback(createError(MISSING_DOC));
                }
              }
              if (resp._rev !== doc._rev) {
                return callback(createError(REV_CONFLICT));
              }
              txn.batch([{
                prefix: stores.localStore,
                type: 'del',
                key: doc._id
              }]);
              var ret = {
                ok: true,
                id: doc._id,
                rev: '0-0'
              };
              if (opts.ctx) {
                return callback(null, ret);
              }
              txn.execute(db, function(err) {
                if (err) {
                  return callback(err);
                }
                callback(null, ret);
              });
            });
          };
          api._destroy = function(opts, callback) {
            var dbStore;
            var leveldownName = functionName(leveldown);
            if (dbStores.has(leveldownName)) {
              dbStore = dbStores.get(leveldownName);
            } else {
              return callDestroy(name, callback);
            }
            if (dbStore.has(name)) {
              LevelPouch.Changes.removeAllListeners(name);
              dbStore.get(name).close(function() {
                dbStore["delete"](name);
                callDestroy(name, callback);
              });
            } else {
              callDestroy(name, callback);
            }
          };
          function callDestroy(name, cb) {
            if (typeof leveldown.destroy === 'function') {
              leveldown.destroy(name, cb);
            } else {
              process.nextTick(cb);
            }
          }
        }
        LevelPouch.valid = function() {
          return true;
        };
        LevelPouch.use_prefix = false;
        LevelPouch.Changes = new Changes();
        function altFactory(adapterConfig, downAdapter) {
          function LevelPouchAlt(opts, callback) {
            var _opts = jsExtend.extend({db: downAdapter}, opts);
            LevelPouch.call(this, _opts, callback);
          }
          LevelPouchAlt.valid = function() {
            return adapterConfig.valid();
          };
          LevelPouchAlt.use_prefix = adapterConfig.use_prefix;
          LevelPouchAlt.destroy = toPromise(function(name, opts, callback) {
            if (typeof opts === 'function') {
              callback = opts;
              opts = {};
            }
            var _opts = jsExtend.extend({db: downAdapter}, opts);
            return LevelPouch.destroy(name, _opts, callback);
          });
          return LevelPouchAlt;
        }
        function pluginBase(adapterConfig, downAdapter) {
          var adapterName = adapterConfig.name;
          var adapter = altFactory(adapterConfig, downAdapter);
          var PDB = (typeof PouchDB !== 'undefined') ? PouchDB : _dereq_("pouchdb");
          if (!PDB) {
            console.error(adapterConfig.name + ' adapter plugin error: ' + 'Cannot find global "PouchDB" object! ' + 'Did you remember to include pouchdb.js?');
          } else {
            PDB.adapter(adapterName, adapter, true);
          }
        }
        var adapterConfig = {
          name: 'fruitdown',
          valid: function() {
            return !!global.indexedDB;
          },
          use_prefix: true
        };
        pluginBase(adapterConfig, downAdapter);
      }).call(this, _dereq_(64), typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {}, _dereq_(8).Buffer);
    }, {
      "12": 12,
      "15": 15,
      "18": 18,
      "23": 23,
      "26": 26,
      "34": 34,
      "48": 48,
      "5": 5,
      "60": 60,
      "62": 62,
      "64": 64,
      "7": 7,
      "72": 72,
      "8": 8,
      "91": 91,
      "96": 96,
      "pouchdb": "pouchdb"
    }],
    2: [function(_dereq_, module, exports) {
      (function(process) {
        function AbstractChainedBatch(db) {
          this._db = db;
          this._operations = [];
          this._written = false;
        }
        AbstractChainedBatch.prototype._checkWritten = function() {
          if (this._written)
            throw new Error('write() already called on this batch');
        };
        AbstractChainedBatch.prototype.put = function(key, value) {
          this._checkWritten();
          var err = this._db._checkKeyValue(key, 'key', this._db._isBuffer);
          if (err)
            throw err;
          err = this._db._checkKeyValue(value, 'value', this._db._isBuffer);
          if (err)
            throw err;
          if (!this._db._isBuffer(key))
            key = String(key);
          if (!this._db._isBuffer(value))
            value = String(value);
          if (typeof this._put == 'function')
            this._put(key, value);
          else
            this._operations.push({
              type: 'put',
              key: key,
              value: value
            });
          return this;
        };
        AbstractChainedBatch.prototype.del = function(key) {
          this._checkWritten();
          var err = this._db._checkKeyValue(key, 'key', this._db._isBuffer);
          if (err)
            throw err;
          if (!this._db._isBuffer(key))
            key = String(key);
          if (typeof this._del == 'function')
            this._del(key);
          else
            this._operations.push({
              type: 'del',
              key: key
            });
          return this;
        };
        AbstractChainedBatch.prototype.clear = function() {
          this._checkWritten();
          this._operations = [];
          if (typeof this._clear == 'function')
            this._clear();
          return this;
        };
        AbstractChainedBatch.prototype.write = function(options, callback) {
          this._checkWritten();
          if (typeof options == 'function')
            callback = options;
          if (typeof callback != 'function')
            throw new Error('write() requires a callback argument');
          if (typeof options != 'object')
            options = {};
          this._written = true;
          if (typeof this._write == 'function')
            return this._write(callback);
          if (typeof this._db._batch == 'function')
            return this._db._batch(this._operations, options, callback);
          process.nextTick(callback);
        };
        module.exports = AbstractChainedBatch;
      }).call(this, _dereq_(64));
    }, {"64": 64}],
    3: [function(_dereq_, module, exports) {
      (function(process) {
        function AbstractIterator(db) {
          this.db = db;
          this._ended = false;
          this._nexting = false;
        }
        AbstractIterator.prototype.next = function(callback) {
          var self = this;
          if (typeof callback != 'function')
            throw new Error('next() requires a callback argument');
          if (self._ended)
            return callback(new Error('cannot call next() after end()'));
          if (self._nexting)
            return callback(new Error('cannot call next() before previous next() has completed'));
          self._nexting = true;
          if (typeof self._next == 'function') {
            return self._next(function() {
              self._nexting = false;
              callback.apply(null, arguments);
            });
          }
          process.nextTick(function() {
            self._nexting = false;
            callback();
          });
        };
        AbstractIterator.prototype.end = function(callback) {
          if (typeof callback != 'function')
            throw new Error('end() requires a callback argument');
          if (this._ended)
            return callback(new Error('end() already called on iterator'));
          this._ended = true;
          if (typeof this._end == 'function')
            return this._end(callback);
          process.nextTick(callback);
        };
        module.exports = AbstractIterator;
      }).call(this, _dereq_(64));
    }, {"64": 64}],
    4: [function(_dereq_, module, exports) {
      (function(Buffer, process) {
        var xtend = _dereq_(97),
            AbstractIterator = _dereq_(3),
            AbstractChainedBatch = _dereq_(2);
        function AbstractLevelDOWN(location) {
          if (!arguments.length || location === undefined)
            throw new Error('constructor requires at least a location argument');
          if (typeof location != 'string')
            throw new Error('constructor requires a location string argument');
          this.location = location;
        }
        AbstractLevelDOWN.prototype.open = function(options, callback) {
          if (typeof options == 'function')
            callback = options;
          if (typeof callback != 'function')
            throw new Error('open() requires a callback argument');
          if (typeof options != 'object')
            options = {};
          if (typeof this._open == 'function')
            return this._open(options, callback);
          process.nextTick(callback);
        };
        AbstractLevelDOWN.prototype.close = function(callback) {
          if (typeof callback != 'function')
            throw new Error('close() requires a callback argument');
          if (typeof this._close == 'function')
            return this._close(callback);
          process.nextTick(callback);
        };
        AbstractLevelDOWN.prototype.get = function(key, options, callback) {
          var err;
          if (typeof options == 'function')
            callback = options;
          if (typeof callback != 'function')
            throw new Error('get() requires a callback argument');
          if (err = this._checkKeyValue(key, 'key', this._isBuffer))
            return callback(err);
          if (!this._isBuffer(key))
            key = String(key);
          if (typeof options != 'object')
            options = {};
          if (typeof this._get == 'function')
            return this._get(key, options, callback);
          process.nextTick(function() {
            callback(new Error('NotFound'));
          });
        };
        AbstractLevelDOWN.prototype.put = function(key, value, options, callback) {
          var err;
          if (typeof options == 'function')
            callback = options;
          if (typeof callback != 'function')
            throw new Error('put() requires a callback argument');
          if (err = this._checkKeyValue(key, 'key', this._isBuffer))
            return callback(err);
          if (err = this._checkKeyValue(value, 'value', this._isBuffer))
            return callback(err);
          if (!this._isBuffer(key))
            key = String(key);
          if (!this._isBuffer(value) && !process.browser)
            value = String(value);
          if (typeof options != 'object')
            options = {};
          if (typeof this._put == 'function')
            return this._put(key, value, options, callback);
          process.nextTick(callback);
        };
        AbstractLevelDOWN.prototype.del = function(key, options, callback) {
          var err;
          if (typeof options == 'function')
            callback = options;
          if (typeof callback != 'function')
            throw new Error('del() requires a callback argument');
          if (err = this._checkKeyValue(key, 'key', this._isBuffer))
            return callback(err);
          if (!this._isBuffer(key))
            key = String(key);
          if (typeof options != 'object')
            options = {};
          if (typeof this._del == 'function')
            return this._del(key, options, callback);
          process.nextTick(callback);
        };
        AbstractLevelDOWN.prototype.batch = function(array, options, callback) {
          if (!arguments.length)
            return this._chainedBatch();
          if (typeof options == 'function')
            callback = options;
          if (typeof callback != 'function')
            throw new Error('batch(array) requires a callback argument');
          if (!Array.isArray(array))
            return callback(new Error('batch(array) requires an array argument'));
          if (typeof options != 'object')
            options = {};
          var i = 0,
              l = array.length,
              e,
              err;
          for (; i < l; i++) {
            e = array[i];
            if (typeof e != 'object')
              continue;
            if (err = this._checkKeyValue(e.type, 'type', this._isBuffer))
              return callback(err);
            if (err = this._checkKeyValue(e.key, 'key', this._isBuffer))
              return callback(err);
            if (e.type == 'put') {
              if (err = this._checkKeyValue(e.value, 'value', this._isBuffer))
                return callback(err);
            }
          }
          if (typeof this._batch == 'function')
            return this._batch(array, options, callback);
          process.nextTick(callback);
        };
        AbstractLevelDOWN.prototype.approximateSize = function(start, end, callback) {
          if (start == null || end == null || typeof start == 'function' || typeof end == 'function') {
            throw new Error('approximateSize() requires valid `start`, `end` and `callback` arguments');
          }
          if (typeof callback != 'function')
            throw new Error('approximateSize() requires a callback argument');
          if (!this._isBuffer(start))
            start = String(start);
          if (!this._isBuffer(end))
            end = String(end);
          if (typeof this._approximateSize == 'function')
            return this._approximateSize(start, end, callback);
          process.nextTick(function() {
            callback(null, 0);
          });
        };
        AbstractLevelDOWN.prototype._setupIteratorOptions = function(options) {
          var self = this;
          options = xtend(options);
          ;
          ['start', 'end', 'gt', 'gte', 'lt', 'lte'].forEach(function(o) {
            if (options[o] && self._isBuffer(options[o]) && options[o].length === 0)
              delete options[o];
          });
          options.reverse = !!options.reverse;
          if (options.reverse && options.lt)
            options.start = options.lt;
          if (options.reverse && options.lte)
            options.start = options.lte;
          if (!options.reverse && options.gt)
            options.start = options.gt;
          if (!options.reverse && options.gte)
            options.start = options.gte;
          if ((options.reverse && options.lt && !options.lte) || (!options.reverse && options.gt && !options.gte))
            options.exclusiveStart = true;
          return options;
        };
        AbstractLevelDOWN.prototype.iterator = function(options) {
          if (typeof options != 'object')
            options = {};
          options = this._setupIteratorOptions(options);
          if (typeof this._iterator == 'function')
            return this._iterator(options);
          return new AbstractIterator(this);
        };
        AbstractLevelDOWN.prototype._chainedBatch = function() {
          return new AbstractChainedBatch(this);
        };
        AbstractLevelDOWN.prototype._isBuffer = function(obj) {
          return Buffer.isBuffer(obj);
        };
        AbstractLevelDOWN.prototype._checkKeyValue = function(obj, type) {
          if (obj === null || obj === undefined)
            return new Error(type + ' cannot be `null` or `undefined`');
          if (obj === null || obj === undefined)
            return new Error(type + ' cannot be `null` or `undefined`');
          if (this._isBuffer(obj)) {
            if (obj.length === 0)
              return new Error(type + ' cannot be an empty Buffer');
          } else if (String(obj) === '')
            return new Error(type + ' cannot be an empty String');
        };
        module.exports.AbstractLevelDOWN = AbstractLevelDOWN;
        module.exports.AbstractIterator = AbstractIterator;
        module.exports.AbstractChainedBatch = AbstractChainedBatch;
      }).call(this, {"isBuffer": _dereq_(24)}, _dereq_(64));
    }, {
      "2": 2,
      "24": 24,
      "3": 3,
      "64": 64,
      "97": 97
    }],
    5: [function(_dereq_, module, exports) {
      'use strict';
      module.exports = argsArray;
      function argsArray(fun) {
        return function() {
          var len = arguments.length;
          if (len) {
            var args = [];
            var i = -1;
            while (++i < len) {
              args[i] = arguments[i];
            }
            return fun.call(this, args);
          } else {
            return fun.call(this, []);
          }
        };
      }
    }, {}],
    6: [function(_dereq_, module, exports) {
      var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      ;
      (function(exports) {
        'use strict';
        var Arr = (typeof Uint8Array !== 'undefined') ? Uint8Array : Array;
        var PLUS = '+'.charCodeAt(0);
        var SLASH = '/'.charCodeAt(0);
        var NUMBER = '0'.charCodeAt(0);
        var LOWER = 'a'.charCodeAt(0);
        var UPPER = 'A'.charCodeAt(0);
        var PLUS_URL_SAFE = '-'.charCodeAt(0);
        var SLASH_URL_SAFE = '_'.charCodeAt(0);
        function decode(elt) {
          var code = elt.charCodeAt(0);
          if (code === PLUS || code === PLUS_URL_SAFE)
            return 62;
          if (code === SLASH || code === SLASH_URL_SAFE)
            return 63;
          if (code < NUMBER)
            return -1;
          if (code < NUMBER + 10)
            return code - NUMBER + 26 + 26;
          if (code < UPPER + 26)
            return code - UPPER;
          if (code < LOWER + 26)
            return code - LOWER + 26;
        }
        function b64ToByteArray(b64) {
          var i,
              j,
              l,
              tmp,
              placeHolders,
              arr;
          if (b64.length % 4 > 0) {
            throw new Error('Invalid string. Length must be a multiple of 4');
          }
          var len = b64.length;
          placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0;
          arr = new Arr(b64.length * 3 / 4 - placeHolders);
          l = placeHolders > 0 ? b64.length - 4 : b64.length;
          var L = 0;
          function push(v) {
            arr[L++] = v;
          }
          for (i = 0, j = 0; i < l; i += 4, j += 3) {
            tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3));
            push((tmp & 0xFF0000) >> 16);
            push((tmp & 0xFF00) >> 8);
            push(tmp & 0xFF);
          }
          if (placeHolders === 2) {
            tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4);
            push(tmp & 0xFF);
          } else if (placeHolders === 1) {
            tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2);
            push((tmp >> 8) & 0xFF);
            push(tmp & 0xFF);
          }
          return arr;
        }
        function uint8ToBase64(uint8) {
          var i,
              extraBytes = uint8.length % 3,
              output = "",
              temp,
              length;
          function encode(num) {
            return lookup.charAt(num);
          }
          function tripletToBase64(num) {
            return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F);
          }
          for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
            temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
            output += tripletToBase64(temp);
          }
          switch (extraBytes) {
            case 1:
              temp = uint8[uint8.length - 1];
              output += encode(temp >> 2);
              output += encode((temp << 4) & 0x3F);
              output += '==';
              break;
            case 2:
              temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
              output += encode(temp >> 10);
              output += encode((temp >> 4) & 0x3F);
              output += encode((temp << 2) & 0x3F);
              output += '=';
              break;
          }
          return output;
        }
        exports.toByteArray = b64ToByteArray;
        exports.fromByteArray = uint8ToBase64;
      }(typeof exports === 'undefined' ? (this.base64js = {}) : exports));
    }, {}],
    7: [function(_dereq_, module, exports) {}, {}],
    8: [function(_dereq_, module, exports) {
      (function(global) {
        'use strict';
        var base64 = _dereq_(6);
        var ieee754 = _dereq_(21);
        var isArray = _dereq_(9);
        exports.Buffer = Buffer;
        exports.SlowBuffer = SlowBuffer;
        exports.INSPECT_MAX_BYTES = 50;
        Buffer.poolSize = 8192;
        var rootParent = {};
        Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined ? global.TYPED_ARRAY_SUPPORT : typedArraySupport();
        function typedArraySupport() {
          function Bar() {}
          try {
            var arr = new Uint8Array(1);
            arr.foo = function() {
              return 42;
            };
            arr.constructor = Bar;
            return arr.foo() === 42 && arr.constructor === Bar && typeof arr.subarray === 'function' && arr.subarray(1, 1).byteLength === 0;
          } catch (e) {
            return false;
          }
        }
        function kMaxLength() {
          return Buffer.TYPED_ARRAY_SUPPORT ? 0x7fffffff : 0x3fffffff;
        }
        function Buffer(arg) {
          if (!(this instanceof Buffer)) {
            if (arguments.length > 1)
              return new Buffer(arg, arguments[1]);
            return new Buffer(arg);
          }
          if (!Buffer.TYPED_ARRAY_SUPPORT) {
            this.length = 0;
            this.parent = undefined;
          }
          if (typeof arg === 'number') {
            return fromNumber(this, arg);
          }
          if (typeof arg === 'string') {
            return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8');
          }
          return fromObject(this, arg);
        }
        function fromNumber(that, length) {
          that = allocate(that, length < 0 ? 0 : checked(length) | 0);
          if (!Buffer.TYPED_ARRAY_SUPPORT) {
            for (var i = 0; i < length; i++) {
              that[i] = 0;
            }
          }
          return that;
        }
        function fromString(that, string, encoding) {
          if (typeof encoding !== 'string' || encoding === '')
            encoding = 'utf8';
          var length = byteLength(string, encoding) | 0;
          that = allocate(that, length);
          that.write(string, encoding);
          return that;
        }
        function fromObject(that, object) {
          if (Buffer.isBuffer(object))
            return fromBuffer(that, object);
          if (isArray(object))
            return fromArray(that, object);
          if (object == null) {
            throw new TypeError('must start with number, buffer, array or string');
          }
          if (typeof ArrayBuffer !== 'undefined') {
            if (object.buffer instanceof ArrayBuffer) {
              return fromTypedArray(that, object);
            }
            if (object instanceof ArrayBuffer) {
              return fromArrayBuffer(that, object);
            }
          }
          if (object.length)
            return fromArrayLike(that, object);
          return fromJsonObject(that, object);
        }
        function fromBuffer(that, buffer) {
          var length = checked(buffer.length) | 0;
          that = allocate(that, length);
          buffer.copy(that, 0, 0, length);
          return that;
        }
        function fromArray(that, array) {
          var length = checked(array.length) | 0;
          that = allocate(that, length);
          for (var i = 0; i < length; i += 1) {
            that[i] = array[i] & 255;
          }
          return that;
        }
        function fromTypedArray(that, array) {
          var length = checked(array.length) | 0;
          that = allocate(that, length);
          for (var i = 0; i < length; i += 1) {
            that[i] = array[i] & 255;
          }
          return that;
        }
        function fromArrayBuffer(that, array) {
          if (Buffer.TYPED_ARRAY_SUPPORT) {
            array.byteLength;
            that = Buffer._augment(new Uint8Array(array));
          } else {
            that = fromTypedArray(that, new Uint8Array(array));
          }
          return that;
        }
        function fromArrayLike(that, array) {
          var length = checked(array.length) | 0;
          that = allocate(that, length);
          for (var i = 0; i < length; i += 1) {
            that[i] = array[i] & 255;
          }
          return that;
        }
        function fromJsonObject(that, object) {
          var array;
          var length = 0;
          if (object.type === 'Buffer' && isArray(object.data)) {
            array = object.data;
            length = checked(array.length) | 0;
          }
          that = allocate(that, length);
          for (var i = 0; i < length; i += 1) {
            that[i] = array[i] & 255;
          }
          return that;
        }
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          Buffer.prototype.__proto__ = Uint8Array.prototype;
          Buffer.__proto__ = Uint8Array;
        } else {
          Buffer.prototype.length = undefined;
          Buffer.prototype.parent = undefined;
        }
        function allocate(that, length) {
          if (Buffer.TYPED_ARRAY_SUPPORT) {
            that = Buffer._augment(new Uint8Array(length));
            that.__proto__ = Buffer.prototype;
          } else {
            that.length = length;
            that._isBuffer = true;
          }
          var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1;
          if (fromPool)
            that.parent = rootParent;
          return that;
        }
        function checked(length) {
          if (length >= kMaxLength()) {
            throw new RangeError('Attempt to allocate Buffer larger than maximum ' + 'size: 0x' + kMaxLength().toString(16) + ' bytes');
          }
          return length | 0;
        }
        function SlowBuffer(subject, encoding) {
          if (!(this instanceof SlowBuffer))
            return new SlowBuffer(subject, encoding);
          var buf = new Buffer(subject, encoding);
          delete buf.parent;
          return buf;
        }
        Buffer.isBuffer = function isBuffer(b) {
          return !!(b != null && b._isBuffer);
        };
        Buffer.compare = function compare(a, b) {
          if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
            throw new TypeError('Arguments must be Buffers');
          }
          if (a === b)
            return 0;
          var x = a.length;
          var y = b.length;
          var i = 0;
          var len = Math.min(x, y);
          while (i < len) {
            if (a[i] !== b[i])
              break;
            ++i;
          }
          if (i !== len) {
            x = a[i];
            y = b[i];
          }
          if (x < y)
            return -1;
          if (y < x)
            return 1;
          return 0;
        };
        Buffer.isEncoding = function isEncoding(encoding) {
          switch (String(encoding).toLowerCase()) {
            case 'hex':
            case 'utf8':
            case 'utf-8':
            case 'ascii':
            case 'binary':
            case 'base64':
            case 'raw':
            case 'ucs2':
            case 'ucs-2':
            case 'utf16le':
            case 'utf-16le':
              return true;
            default:
              return false;
          }
        };
        Buffer.concat = function concat(list, length) {
          if (!isArray(list))
            throw new TypeError('list argument must be an Array of Buffers.');
          if (list.length === 0) {
            return new Buffer(0);
          }
          var i;
          if (length === undefined) {
            length = 0;
            for (i = 0; i < list.length; i++) {
              length += list[i].length;
            }
          }
          var buf = new Buffer(length);
          var pos = 0;
          for (i = 0; i < list.length; i++) {
            var item = list[i];
            item.copy(buf, pos);
            pos += item.length;
          }
          return buf;
        };
        function byteLength(string, encoding) {
          if (typeof string !== 'string')
            string = '' + string;
          var len = string.length;
          if (len === 0)
            return 0;
          var loweredCase = false;
          for (; ; ) {
            switch (encoding) {
              case 'ascii':
              case 'binary':
              case 'raw':
              case 'raws':
                return len;
              case 'utf8':
              case 'utf-8':
                return utf8ToBytes(string).length;
              case 'ucs2':
              case 'ucs-2':
              case 'utf16le':
              case 'utf-16le':
                return len * 2;
              case 'hex':
                return len >>> 1;
              case 'base64':
                return base64ToBytes(string).length;
              default:
                if (loweredCase)
                  return utf8ToBytes(string).length;
                encoding = ('' + encoding).toLowerCase();
                loweredCase = true;
            }
          }
        }
        Buffer.byteLength = byteLength;
        function slowToString(encoding, start, end) {
          var loweredCase = false;
          start = start | 0;
          end = end === undefined || end === Infinity ? this.length : end | 0;
          if (!encoding)
            encoding = 'utf8';
          if (start < 0)
            start = 0;
          if (end > this.length)
            end = this.length;
          if (end <= start)
            return '';
          while (true) {
            switch (encoding) {
              case 'hex':
                return hexSlice(this, start, end);
              case 'utf8':
              case 'utf-8':
                return utf8Slice(this, start, end);
              case 'ascii':
                return asciiSlice(this, start, end);
              case 'binary':
                return binarySlice(this, start, end);
              case 'base64':
                return base64Slice(this, start, end);
              case 'ucs2':
              case 'ucs-2':
              case 'utf16le':
              case 'utf-16le':
                return utf16leSlice(this, start, end);
              default:
                if (loweredCase)
                  throw new TypeError('Unknown encoding: ' + encoding);
                encoding = (encoding + '').toLowerCase();
                loweredCase = true;
            }
          }
        }
        Buffer.prototype.toString = function toString() {
          var length = this.length | 0;
          if (length === 0)
            return '';
          if (arguments.length === 0)
            return utf8Slice(this, 0, length);
          return slowToString.apply(this, arguments);
        };
        Buffer.prototype.equals = function equals(b) {
          if (!Buffer.isBuffer(b))
            throw new TypeError('Argument must be a Buffer');
          if (this === b)
            return true;
          return Buffer.compare(this, b) === 0;
        };
        Buffer.prototype.inspect = function inspect() {
          var str = '';
          var max = exports.INSPECT_MAX_BYTES;
          if (this.length > 0) {
            str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
            if (this.length > max)
              str += ' ... ';
          }
          return '<Buffer ' + str + '>';
        };
        Buffer.prototype.compare = function compare(b) {
          if (!Buffer.isBuffer(b))
            throw new TypeError('Argument must be a Buffer');
          if (this === b)
            return 0;
          return Buffer.compare(this, b);
        };
        Buffer.prototype.indexOf = function indexOf(val, byteOffset) {
          if (byteOffset > 0x7fffffff)
            byteOffset = 0x7fffffff;
          else if (byteOffset < -0x80000000)
            byteOffset = -0x80000000;
          byteOffset >>= 0;
          if (this.length === 0)
            return -1;
          if (byteOffset >= this.length)
            return -1;
          if (byteOffset < 0)
            byteOffset = Math.max(this.length + byteOffset, 0);
          if (typeof val === 'string') {
            if (val.length === 0)
              return -1;
            return String.prototype.indexOf.call(this, val, byteOffset);
          }
          if (Buffer.isBuffer(val)) {
            return arrayIndexOf(this, val, byteOffset);
          }
          if (typeof val === 'number') {
            if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
              return Uint8Array.prototype.indexOf.call(this, val, byteOffset);
            }
            return arrayIndexOf(this, [val], byteOffset);
          }
          function arrayIndexOf(arr, val, byteOffset) {
            var foundIndex = -1;
            for (var i = 0; byteOffset + i < arr.length; i++) {
              if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
                if (foundIndex === -1)
                  foundIndex = i;
                if (i - foundIndex + 1 === val.length)
                  return byteOffset + foundIndex;
              } else {
                foundIndex = -1;
              }
            }
            return -1;
          }
          throw new TypeError('val must be string, number or Buffer');
        };
        Buffer.prototype.get = function get(offset) {
          console.log('.get() is deprecated. Access using array indexes instead.');
          return this.readUInt8(offset);
        };
        Buffer.prototype.set = function set(v, offset) {
          console.log('.set() is deprecated. Access using array indexes instead.');
          return this.writeUInt8(v, offset);
        };
        function hexWrite(buf, string, offset, length) {
          offset = Number(offset) || 0;
          var remaining = buf.length - offset;
          if (!length) {
            length = remaining;
          } else {
            length = Number(length);
            if (length > remaining) {
              length = remaining;
            }
          }
          var strLen = string.length;
          if (strLen % 2 !== 0)
            throw new Error('Invalid hex string');
          if (length > strLen / 2) {
            length = strLen / 2;
          }
          for (var i = 0; i < length; i++) {
            var parsed = parseInt(string.substr(i * 2, 2), 16);
            if (isNaN(parsed))
              throw new Error('Invalid hex string');
            buf[offset + i] = parsed;
          }
          return i;
        }
        function utf8Write(buf, string, offset, length) {
          return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
        }
        function asciiWrite(buf, string, offset, length) {
          return blitBuffer(asciiToBytes(string), buf, offset, length);
        }
        function binaryWrite(buf, string, offset, length) {
          return asciiWrite(buf, string, offset, length);
        }
        function base64Write(buf, string, offset, length) {
          return blitBuffer(base64ToBytes(string), buf, offset, length);
        }
        function ucs2Write(buf, string, offset, length) {
          return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
        }
        Buffer.prototype.write = function write(string, offset, length, encoding) {
          if (offset === undefined) {
            encoding = 'utf8';
            length = this.length;
            offset = 0;
          } else if (length === undefined && typeof offset === 'string') {
            encoding = offset;
            length = this.length;
            offset = 0;
          } else if (isFinite(offset)) {
            offset = offset | 0;
            if (isFinite(length)) {
              length = length | 0;
              if (encoding === undefined)
                encoding = 'utf8';
            } else {
              encoding = length;
              length = undefined;
            }
          } else {
            var swap = encoding;
            encoding = offset;
            offset = length | 0;
            length = swap;
          }
          var remaining = this.length - offset;
          if (length === undefined || length > remaining)
            length = remaining;
          if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
            throw new RangeError('attempt to write outside buffer bounds');
          }
          if (!encoding)
            encoding = 'utf8';
          var loweredCase = false;
          for (; ; ) {
            switch (encoding) {
              case 'hex':
                return hexWrite(this, string, offset, length);
              case 'utf8':
              case 'utf-8':
                return utf8Write(this, string, offset, length);
              case 'ascii':
                return asciiWrite(this, string, offset, length);
              case 'binary':
                return binaryWrite(this, string, offset, length);
              case 'base64':
                return base64Write(this, string, offset, length);
              case 'ucs2':
              case 'ucs-2':
              case 'utf16le':
              case 'utf-16le':
                return ucs2Write(this, string, offset, length);
              default:
                if (loweredCase)
                  throw new TypeError('Unknown encoding: ' + encoding);
                encoding = ('' + encoding).toLowerCase();
                loweredCase = true;
            }
          }
        };
        Buffer.prototype.toJSON = function toJSON() {
          return {
            type: 'Buffer',
            data: Array.prototype.slice.call(this._arr || this, 0)
          };
        };
        function base64Slice(buf, start, end) {
          if (start === 0 && end === buf.length) {
            return base64.fromByteArray(buf);
          } else {
            return base64.fromByteArray(buf.slice(start, end));
          }
        }
        function utf8Slice(buf, start, end) {
          end = Math.min(buf.length, end);
          var res = [];
          var i = start;
          while (i < end) {
            var firstByte = buf[i];
            var codePoint = null;
            var bytesPerSequence = (firstByte > 0xEF) ? 4 : (firstByte > 0xDF) ? 3 : (firstByte > 0xBF) ? 2 : 1;
            if (i + bytesPerSequence <= end) {
              var secondByte,
                  thirdByte,
                  fourthByte,
                  tempCodePoint;
              switch (bytesPerSequence) {
                case 1:
                  if (firstByte < 0x80) {
                    codePoint = firstByte;
                  }
                  break;
                case 2:
                  secondByte = buf[i + 1];
                  if ((secondByte & 0xC0) === 0x80) {
                    tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
                    if (tempCodePoint > 0x7F) {
                      codePoint = tempCodePoint;
                    }
                  }
                  break;
                case 3:
                  secondByte = buf[i + 1];
                  thirdByte = buf[i + 2];
                  if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
                    tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
                    if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                      codePoint = tempCodePoint;
                    }
                  }
                  break;
                case 4:
                  secondByte = buf[i + 1];
                  thirdByte = buf[i + 2];
                  fourthByte = buf[i + 3];
                  if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
                    tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
                    if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                      codePoint = tempCodePoint;
                    }
                  }
              }
            }
            if (codePoint === null) {
              codePoint = 0xFFFD;
              bytesPerSequence = 1;
            } else if (codePoint > 0xFFFF) {
              codePoint -= 0x10000;
              res.push(codePoint >>> 10 & 0x3FF | 0xD800);
              codePoint = 0xDC00 | codePoint & 0x3FF;
            }
            res.push(codePoint);
            i += bytesPerSequence;
          }
          return decodeCodePointsArray(res);
        }
        var MAX_ARGUMENTS_LENGTH = 0x1000;
        function decodeCodePointsArray(codePoints) {
          var len = codePoints.length;
          if (len <= MAX_ARGUMENTS_LENGTH) {
            return String.fromCharCode.apply(String, codePoints);
          }
          var res = '';
          var i = 0;
          while (i < len) {
            res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
          }
          return res;
        }
        function asciiSlice(buf, start, end) {
          var ret = '';
          end = Math.min(buf.length, end);
          for (var i = start; i < end; i++) {
            ret += String.fromCharCode(buf[i] & 0x7F);
          }
          return ret;
        }
        function binarySlice(buf, start, end) {
          var ret = '';
          end = Math.min(buf.length, end);
          for (var i = start; i < end; i++) {
            ret += String.fromCharCode(buf[i]);
          }
          return ret;
        }
        function hexSlice(buf, start, end) {
          var len = buf.length;
          if (!start || start < 0)
            start = 0;
          if (!end || end < 0 || end > len)
            end = len;
          var out = '';
          for (var i = start; i < end; i++) {
            out += toHex(buf[i]);
          }
          return out;
        }
        function utf16leSlice(buf, start, end) {
          var bytes = buf.slice(start, end);
          var res = '';
          for (var i = 0; i < bytes.length; i += 2) {
            res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
          }
          return res;
        }
        Buffer.prototype.slice = function slice(start, end) {
          var len = this.length;
          start = ~~start;
          end = end === undefined ? len : ~~end;
          if (start < 0) {
            start += len;
            if (start < 0)
              start = 0;
          } else if (start > len) {
            start = len;
          }
          if (end < 0) {
            end += len;
            if (end < 0)
              end = 0;
          } else if (end > len) {
            end = len;
          }
          if (end < start)
            end = start;
          var newBuf;
          if (Buffer.TYPED_ARRAY_SUPPORT) {
            newBuf = Buffer._augment(this.subarray(start, end));
          } else {
            var sliceLen = end - start;
            newBuf = new Buffer(sliceLen, undefined);
            for (var i = 0; i < sliceLen; i++) {
              newBuf[i] = this[i + start];
            }
          }
          if (newBuf.length)
            newBuf.parent = this.parent || this;
          return newBuf;
        };
        function checkOffset(offset, ext, length) {
          if ((offset % 1) !== 0 || offset < 0)
            throw new RangeError('offset is not uint');
          if (offset + ext > length)
            throw new RangeError('Trying to access beyond buffer length');
        }
        Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength, noAssert) {
          offset = offset | 0;
          byteLength = byteLength | 0;
          if (!noAssert)
            checkOffset(offset, byteLength, this.length);
          var val = this[offset];
          var mul = 1;
          var i = 0;
          while (++i < byteLength && (mul *= 0x100)) {
            val += this[offset + i] * mul;
          }
          return val;
        };
        Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength, noAssert) {
          offset = offset | 0;
          byteLength = byteLength | 0;
          if (!noAssert) {
            checkOffset(offset, byteLength, this.length);
          }
          var val = this[offset + --byteLength];
          var mul = 1;
          while (byteLength > 0 && (mul *= 0x100)) {
            val += this[offset + --byteLength] * mul;
          }
          return val;
        };
        Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
          if (!noAssert)
            checkOffset(offset, 1, this.length);
          return this[offset];
        };
        Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
          if (!noAssert)
            checkOffset(offset, 2, this.length);
          return this[offset] | (this[offset + 1] << 8);
        };
        Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
          if (!noAssert)
            checkOffset(offset, 2, this.length);
          return (this[offset] << 8) | this[offset + 1];
        };
        Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
          if (!noAssert)
            checkOffset(offset, 4, this.length);
          return ((this[offset]) | (this[offset + 1] << 8) | (this[offset + 2] << 16)) + (this[offset + 3] * 0x1000000);
        };
        Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
          if (!noAssert)
            checkOffset(offset, 4, this.length);
          return (this[offset] * 0x1000000) + ((this[offset + 1] << 16) | (this[offset + 2] << 8) | this[offset + 3]);
        };
        Buffer.prototype.readIntLE = function readIntLE(offset, byteLength, noAssert) {
          offset = offset | 0;
          byteLength = byteLength | 0;
          if (!noAssert)
            checkOffset(offset, byteLength, this.length);
          var val = this[offset];
          var mul = 1;
          var i = 0;
          while (++i < byteLength && (mul *= 0x100)) {
            val += this[offset + i] * mul;
          }
          mul *= 0x80;
          if (val >= mul)
            val -= Math.pow(2, 8 * byteLength);
          return val;
        };
        Buffer.prototype.readIntBE = function readIntBE(offset, byteLength, noAssert) {
          offset = offset | 0;
          byteLength = byteLength | 0;
          if (!noAssert)
            checkOffset(offset, byteLength, this.length);
          var i = byteLength;
          var mul = 1;
          var val = this[offset + --i];
          while (i > 0 && (mul *= 0x100)) {
            val += this[offset + --i] * mul;
          }
          mul *= 0x80;
          if (val >= mul)
            val -= Math.pow(2, 8 * byteLength);
          return val;
        };
        Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
          if (!noAssert)
            checkOffset(offset, 1, this.length);
          if (!(this[offset] & 0x80))
            return (this[offset]);
          return ((0xff - this[offset] + 1) * -1);
        };
        Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
          if (!noAssert)
            checkOffset(offset, 2, this.length);
          var val = this[offset] | (this[offset + 1] << 8);
          return (val & 0x8000) ? val | 0xFFFF0000 : val;
        };
        Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
          if (!noAssert)
            checkOffset(offset, 2, this.length);
          var val = this[offset + 1] | (this[offset] << 8);
          return (val & 0x8000) ? val | 0xFFFF0000 : val;
        };
        Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
          if (!noAssert)
            checkOffset(offset, 4, this.length);
          return (this[offset]) | (this[offset + 1] << 8) | (this[offset + 2] << 16) | (this[offset + 3] << 24);
        };
        Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
          if (!noAssert)
            checkOffset(offset, 4, this.length);
          return (this[offset] << 24) | (this[offset + 1] << 16) | (this[offset + 2] << 8) | (this[offset + 3]);
        };
        Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
          if (!noAssert)
            checkOffset(offset, 4, this.length);
          return ieee754.read(this, offset, true, 23, 4);
        };
        Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
          if (!noAssert)
            checkOffset(offset, 4, this.length);
          return ieee754.read(this, offset, false, 23, 4);
        };
        Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
          if (!noAssert)
            checkOffset(offset, 8, this.length);
          return ieee754.read(this, offset, true, 52, 8);
        };
        Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
          if (!noAssert)
            checkOffset(offset, 8, this.length);
          return ieee754.read(this, offset, false, 52, 8);
        };
        function checkInt(buf, value, offset, ext, max, min) {
          if (!Buffer.isBuffer(buf))
            throw new TypeError('buffer must be a Buffer instance');
          if (value > max || value < min)
            throw new RangeError('value is out of bounds');
          if (offset + ext > buf.length)
            throw new RangeError('index out of range');
        }
        Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength, noAssert) {
          value = +value;
          offset = offset | 0;
          byteLength = byteLength | 0;
          if (!noAssert)
            checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0);
          var mul = 1;
          var i = 0;
          this[offset] = value & 0xFF;
          while (++i < byteLength && (mul *= 0x100)) {
            this[offset + i] = (value / mul) & 0xFF;
          }
          return offset + byteLength;
        };
        Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength, noAssert) {
          value = +value;
          offset = offset | 0;
          byteLength = byteLength | 0;
          if (!noAssert)
            checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0);
          var i = byteLength - 1;
          var mul = 1;
          this[offset + i] = value & 0xFF;
          while (--i >= 0 && (mul *= 0x100)) {
            this[offset + i] = (value / mul) & 0xFF;
          }
          return offset + byteLength;
        };
        Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
          value = +value;
          offset = offset | 0;
          if (!noAssert)
            checkInt(this, value, offset, 1, 0xff, 0);
          if (!Buffer.TYPED_ARRAY_SUPPORT)
            value = Math.floor(value);
          this[offset] = (value & 0xff);
          return offset + 1;
        };
        function objectWriteUInt16(buf, value, offset, littleEndian) {
          if (value < 0)
            value = 0xffff + value + 1;
          for (var i = 0,
              j = Math.min(buf.length - offset, 2); i < j; i++) {
            buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>> (littleEndian ? i : 1 - i) * 8;
          }
        }
        Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
          value = +value;
          offset = offset | 0;
          if (!noAssert)
            checkInt(this, value, offset, 2, 0xffff, 0);
          if (Buffer.TYPED_ARRAY_SUPPORT) {
            this[offset] = (value & 0xff);
            this[offset + 1] = (value >>> 8);
          } else {
            objectWriteUInt16(this, value, offset, true);
          }
          return offset + 2;
        };
        Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
          value = +value;
          offset = offset | 0;
          if (!noAssert)
            checkInt(this, value, offset, 2, 0xffff, 0);
          if (Buffer.TYPED_ARRAY_SUPPORT) {
            this[offset] = (value >>> 8);
            this[offset + 1] = (value & 0xff);
          } else {
            objectWriteUInt16(this, value, offset, false);
          }
          return offset + 2;
        };
        function objectWriteUInt32(buf, value, offset, littleEndian) {
          if (value < 0)
            value = 0xffffffff + value + 1;
          for (var i = 0,
              j = Math.min(buf.length - offset, 4); i < j; i++) {
            buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
          }
        }
        Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
          value = +value;
          offset = offset | 0;
          if (!noAssert)
            checkInt(this, value, offset, 4, 0xffffffff, 0);
          if (Buffer.TYPED_ARRAY_SUPPORT) {
            this[offset + 3] = (value >>> 24);
            this[offset + 2] = (value >>> 16);
            this[offset + 1] = (value >>> 8);
            this[offset] = (value & 0xff);
          } else {
            objectWriteUInt32(this, value, offset, true);
          }
          return offset + 4;
        };
        Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
          value = +value;
          offset = offset | 0;
          if (!noAssert)
            checkInt(this, value, offset, 4, 0xffffffff, 0);
          if (Buffer.TYPED_ARRAY_SUPPORT) {
            this[offset] = (value >>> 24);
            this[offset + 1] = (value >>> 16);
            this[offset + 2] = (value >>> 8);
            this[offset + 3] = (value & 0xff);
          } else {
            objectWriteUInt32(this, value, offset, false);
          }
          return offset + 4;
        };
        Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength, noAssert) {
          value = +value;
          offset = offset | 0;
          if (!noAssert) {
            var limit = Math.pow(2, 8 * byteLength - 1);
            checkInt(this, value, offset, byteLength, limit - 1, -limit);
          }
          var i = 0;
          var mul = 1;
          var sub = value < 0 ? 1 : 0;
          this[offset] = value & 0xFF;
          while (++i < byteLength && (mul *= 0x100)) {
            this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
          }
          return offset + byteLength;
        };
        Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength, noAssert) {
          value = +value;
          offset = offset | 0;
          if (!noAssert) {
            var limit = Math.pow(2, 8 * byteLength - 1);
            checkInt(this, value, offset, byteLength, limit - 1, -limit);
          }
          var i = byteLength - 1;
          var mul = 1;
          var sub = value < 0 ? 1 : 0;
          this[offset + i] = value & 0xFF;
          while (--i >= 0 && (mul *= 0x100)) {
            this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
          }
          return offset + byteLength;
        };
        Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
          value = +value;
          offset = offset | 0;
          if (!noAssert)
            checkInt(this, value, offset, 1, 0x7f, -0x80);
          if (!Buffer.TYPED_ARRAY_SUPPORT)
            value = Math.floor(value);
          if (value < 0)
            value = 0xff + value + 1;
          this[offset] = (value & 0xff);
          return offset + 1;
        };
        Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
          value = +value;
          offset = offset | 0;
          if (!noAssert)
            checkInt(this, value, offset, 2, 0x7fff, -0x8000);
          if (Buffer.TYPED_ARRAY_SUPPORT) {
            this[offset] = (value & 0xff);
            this[offset + 1] = (value >>> 8);
          } else {
            objectWriteUInt16(this, value, offset, true);
          }
          return offset + 2;
        };
        Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
          value = +value;
          offset = offset | 0;
          if (!noAssert)
            checkInt(this, value, offset, 2, 0x7fff, -0x8000);
          if (Buffer.TYPED_ARRAY_SUPPORT) {
            this[offset] = (value >>> 8);
            this[offset + 1] = (value & 0xff);
          } else {
            objectWriteUInt16(this, value, offset, false);
          }
          return offset + 2;
        };
        Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
          value = +value;
          offset = offset | 0;
          if (!noAssert)
            checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
          if (Buffer.TYPED_ARRAY_SUPPORT) {
            this[offset] = (value & 0xff);
            this[offset + 1] = (value >>> 8);
            this[offset + 2] = (value >>> 16);
            this[offset + 3] = (value >>> 24);
          } else {
            objectWriteUInt32(this, value, offset, true);
          }
          return offset + 4;
        };
        Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
          value = +value;
          offset = offset | 0;
          if (!noAssert)
            checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
          if (value < 0)
            value = 0xffffffff + value + 1;
          if (Buffer.TYPED_ARRAY_SUPPORT) {
            this[offset] = (value >>> 24);
            this[offset + 1] = (value >>> 16);
            this[offset + 2] = (value >>> 8);
            this[offset + 3] = (value & 0xff);
          } else {
            objectWriteUInt32(this, value, offset, false);
          }
          return offset + 4;
        };
        function checkIEEE754(buf, value, offset, ext, max, min) {
          if (value > max || value < min)
            throw new RangeError('value is out of bounds');
          if (offset + ext > buf.length)
            throw new RangeError('index out of range');
          if (offset < 0)
            throw new RangeError('index out of range');
        }
        function writeFloat(buf, value, offset, littleEndian, noAssert) {
          if (!noAssert) {
            checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38);
          }
          ieee754.write(buf, value, offset, littleEndian, 23, 4);
          return offset + 4;
        }
        Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
          return writeFloat(this, value, offset, true, noAssert);
        };
        Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
          return writeFloat(this, value, offset, false, noAssert);
        };
        function writeDouble(buf, value, offset, littleEndian, noAssert) {
          if (!noAssert) {
            checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308);
          }
          ieee754.write(buf, value, offset, littleEndian, 52, 8);
          return offset + 8;
        }
        Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
          return writeDouble(this, value, offset, true, noAssert);
        };
        Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
          return writeDouble(this, value, offset, false, noAssert);
        };
        Buffer.prototype.copy = function copy(target, targetStart, start, end) {
          if (!start)
            start = 0;
          if (!end && end !== 0)
            end = this.length;
          if (targetStart >= target.length)
            targetStart = target.length;
          if (!targetStart)
            targetStart = 0;
          if (end > 0 && end < start)
            end = start;
          if (end === start)
            return 0;
          if (target.length === 0 || this.length === 0)
            return 0;
          if (targetStart < 0) {
            throw new RangeError('targetStart out of bounds');
          }
          if (start < 0 || start >= this.length)
            throw new RangeError('sourceStart out of bounds');
          if (end < 0)
            throw new RangeError('sourceEnd out of bounds');
          if (end > this.length)
            end = this.length;
          if (target.length - targetStart < end - start) {
            end = target.length - targetStart + start;
          }
          var len = end - start;
          var i;
          if (this === target && start < targetStart && targetStart < end) {
            for (i = len - 1; i >= 0; i--) {
              target[i + targetStart] = this[i + start];
            }
          } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
            for (i = 0; i < len; i++) {
              target[i + targetStart] = this[i + start];
            }
          } else {
            target._set(this.subarray(start, start + len), targetStart);
          }
          return len;
        };
        Buffer.prototype.fill = function fill(value, start, end) {
          if (!value)
            value = 0;
          if (!start)
            start = 0;
          if (!end)
            end = this.length;
          if (end < start)
            throw new RangeError('end < start');
          if (end === start)
            return;
          if (this.length === 0)
            return;
          if (start < 0 || start >= this.length)
            throw new RangeError('start out of bounds');
          if (end < 0 || end > this.length)
            throw new RangeError('end out of bounds');
          var i;
          if (typeof value === 'number') {
            for (i = start; i < end; i++) {
              this[i] = value;
            }
          } else {
            var bytes = utf8ToBytes(value.toString());
            var len = bytes.length;
            for (i = start; i < end; i++) {
              this[i] = bytes[i % len];
            }
          }
          return this;
        };
        Buffer.prototype.toArrayBuffer = function toArrayBuffer() {
          if (typeof Uint8Array !== 'undefined') {
            if (Buffer.TYPED_ARRAY_SUPPORT) {
              return (new Buffer(this)).buffer;
            } else {
              var buf = new Uint8Array(this.length);
              for (var i = 0,
                  len = buf.length; i < len; i += 1) {
                buf[i] = this[i];
              }
              return buf.buffer;
            }
          } else {
            throw new TypeError('Buffer.toArrayBuffer not supported in this browser');
          }
        };
        var BP = Buffer.prototype;
        Buffer._augment = function _augment(arr) {
          arr.constructor = Buffer;
          arr._isBuffer = true;
          arr._set = arr.set;
          arr.get = BP.get;
          arr.set = BP.set;
          arr.write = BP.write;
          arr.toString = BP.toString;
          arr.toLocaleString = BP.toString;
          arr.toJSON = BP.toJSON;
          arr.equals = BP.equals;
          arr.compare = BP.compare;
          arr.indexOf = BP.indexOf;
          arr.copy = BP.copy;
          arr.slice = BP.slice;
          arr.readUIntLE = BP.readUIntLE;
          arr.readUIntBE = BP.readUIntBE;
          arr.readUInt8 = BP.readUInt8;
          arr.readUInt16LE = BP.readUInt16LE;
          arr.readUInt16BE = BP.readUInt16BE;
          arr.readUInt32LE = BP.readUInt32LE;
          arr.readUInt32BE = BP.readUInt32BE;
          arr.readIntLE = BP.readIntLE;
          arr.readIntBE = BP.readIntBE;
          arr.readInt8 = BP.readInt8;
          arr.readInt16LE = BP.readInt16LE;
          arr.readInt16BE = BP.readInt16BE;
          arr.readInt32LE = BP.readInt32LE;
          arr.readInt32BE = BP.readInt32BE;
          arr.readFloatLE = BP.readFloatLE;
          arr.readFloatBE = BP.readFloatBE;
          arr.readDoubleLE = BP.readDoubleLE;
          arr.readDoubleBE = BP.readDoubleBE;
          arr.writeUInt8 = BP.writeUInt8;
          arr.writeUIntLE = BP.writeUIntLE;
          arr.writeUIntBE = BP.writeUIntBE;
          arr.writeUInt16LE = BP.writeUInt16LE;
          arr.writeUInt16BE = BP.writeUInt16BE;
          arr.writeUInt32LE = BP.writeUInt32LE;
          arr.writeUInt32BE = BP.writeUInt32BE;
          arr.writeIntLE = BP.writeIntLE;
          arr.writeIntBE = BP.writeIntBE;
          arr.writeInt8 = BP.writeInt8;
          arr.writeInt16LE = BP.writeInt16LE;
          arr.writeInt16BE = BP.writeInt16BE;
          arr.writeInt32LE = BP.writeInt32LE;
          arr.writeInt32BE = BP.writeInt32BE;
          arr.writeFloatLE = BP.writeFloatLE;
          arr.writeFloatBE = BP.writeFloatBE;
          arr.writeDoubleLE = BP.writeDoubleLE;
          arr.writeDoubleBE = BP.writeDoubleBE;
          arr.fill = BP.fill;
          arr.inspect = BP.inspect;
          arr.toArrayBuffer = BP.toArrayBuffer;
          return arr;
        };
        var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;
        function base64clean(str) {
          str = stringtrim(str).replace(INVALID_BASE64_RE, '');
          if (str.length < 2)
            return '';
          while (str.length % 4 !== 0) {
            str = str + '=';
          }
          return str;
        }
        function stringtrim(str) {
          if (str.trim)
            return str.trim();
          return str.replace(/^\s+|\s+$/g, '');
        }
        function toHex(n) {
          if (n < 16)
            return '0' + n.toString(16);
          return n.toString(16);
        }
        function utf8ToBytes(string, units) {
          units = units || Infinity;
          var codePoint;
          var length = string.length;
          var leadSurrogate = null;
          var bytes = [];
          for (var i = 0; i < length; i++) {
            codePoint = string.charCodeAt(i);
            if (codePoint > 0xD7FF && codePoint < 0xE000) {
              if (!leadSurrogate) {
                if (codePoint > 0xDBFF) {
                  if ((units -= 3) > -1)
                    bytes.push(0xEF, 0xBF, 0xBD);
                  continue;
                } else if (i + 1 === length) {
                  if ((units -= 3) > -1)
                    bytes.push(0xEF, 0xBF, 0xBD);
                  continue;
                }
                leadSurrogate = codePoint;
                continue;
              }
              if (codePoint < 0xDC00) {
                if ((units -= 3) > -1)
                  bytes.push(0xEF, 0xBF, 0xBD);
                leadSurrogate = codePoint;
                continue;
              }
              codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
            } else if (leadSurrogate) {
              if ((units -= 3) > -1)
                bytes.push(0xEF, 0xBF, 0xBD);
            }
            leadSurrogate = null;
            if (codePoint < 0x80) {
              if ((units -= 1) < 0)
                break;
              bytes.push(codePoint);
            } else if (codePoint < 0x800) {
              if ((units -= 2) < 0)
                break;
              bytes.push(codePoint >> 0x6 | 0xC0, codePoint & 0x3F | 0x80);
            } else if (codePoint < 0x10000) {
              if ((units -= 3) < 0)
                break;
              bytes.push(codePoint >> 0xC | 0xE0, codePoint >> 0x6 & 0x3F | 0x80, codePoint & 0x3F | 0x80);
            } else if (codePoint < 0x110000) {
              if ((units -= 4) < 0)
                break;
              bytes.push(codePoint >> 0x12 | 0xF0, codePoint >> 0xC & 0x3F | 0x80, codePoint >> 0x6 & 0x3F | 0x80, codePoint & 0x3F | 0x80);
            } else {
              throw new Error('Invalid code point');
            }
          }
          return bytes;
        }
        function asciiToBytes(str) {
          var byteArray = [];
          for (var i = 0; i < str.length; i++) {
            byteArray.push(str.charCodeAt(i) & 0xFF);
          }
          return byteArray;
        }
        function utf16leToBytes(str, units) {
          var c,
              hi,
              lo;
          var byteArray = [];
          for (var i = 0; i < str.length; i++) {
            if ((units -= 2) < 0)
              break;
            c = str.charCodeAt(i);
            hi = c >> 8;
            lo = c % 256;
            byteArray.push(lo);
            byteArray.push(hi);
          }
          return byteArray;
        }
        function base64ToBytes(str) {
          return base64.toByteArray(base64clean(str));
        }
        function blitBuffer(src, dst, offset, length) {
          for (var i = 0; i < length; i++) {
            if ((i + offset >= dst.length) || (i >= src.length))
              break;
            dst[i + offset] = src[i];
          }
          return i;
        }
      }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {
      "21": 21,
      "6": 6,
      "9": 9
    }],
    9: [function(_dereq_, module, exports) {
      var toString = {}.toString;
      module.exports = Array.isArray || function(arr) {
        return toString.call(arr) == '[object Array]';
      };
    }, {}],
    10: [function(_dereq_, module, exports) {
      (function(Buffer) {
        function isArray(arg) {
          if (Array.isArray) {
            return Array.isArray(arg);
          }
          return objectToString(arg) === '[object Array]';
        }
        exports.isArray = isArray;
        function isBoolean(arg) {
          return typeof arg === 'boolean';
        }
        exports.isBoolean = isBoolean;
        function isNull(arg) {
          return arg === null;
        }
        exports.isNull = isNull;
        function isNullOrUndefined(arg) {
          return arg == null;
        }
        exports.isNullOrUndefined = isNullOrUndefined;
        function isNumber(arg) {
          return typeof arg === 'number';
        }
        exports.isNumber = isNumber;
        function isString(arg) {
          return typeof arg === 'string';
        }
        exports.isString = isString;
        function isSymbol(arg) {
          return typeof arg === 'symbol';
        }
        exports.isSymbol = isSymbol;
        function isUndefined(arg) {
          return arg === void 0;
        }
        exports.isUndefined = isUndefined;
        function isRegExp(re) {
          return objectToString(re) === '[object RegExp]';
        }
        exports.isRegExp = isRegExp;
        function isObject(arg) {
          return typeof arg === 'object' && arg !== null;
        }
        exports.isObject = isObject;
        function isDate(d) {
          return objectToString(d) === '[object Date]';
        }
        exports.isDate = isDate;
        function isError(e) {
          return (objectToString(e) === '[object Error]' || e instanceof Error);
        }
        exports.isError = isError;
        function isFunction(arg) {
          return typeof arg === 'function';
        }
        exports.isFunction = isFunction;
        function isPrimitive(arg) {
          return arg === null || typeof arg === 'boolean' || typeof arg === 'number' || typeof arg === 'string' || typeof arg === 'symbol' || typeof arg === 'undefined';
        }
        exports.isPrimitive = isPrimitive;
        exports.isBuffer = Buffer.isBuffer;
        function objectToString(o) {
          return Object.prototype.toString.call(o);
        }
      }).call(this, {"isBuffer": _dereq_(24)});
    }, {"24": 24}],
    11: [function(_dereq_, module, exports) {
      var Buffer = _dereq_(8).Buffer;
      var CHARS = '.PYFGCRLAOEUIDHTNSQJKXBMWVZ_pyfgcrlaoeuidhtnsqjkxbmwvz1234567890'.split('').sort().join('');
      module.exports = function(chars, exports) {
        chars = chars || CHARS;
        exports = exports || {};
        if (chars.length !== 64)
          throw new Error('a base 64 encoding requires 64 chars');
        var codeToIndex = new Buffer(128);
        codeToIndex.fill();
        for (var i = 0; i < 64; i++) {
          var code = chars.charCodeAt(i);
          codeToIndex[code] = i;
        }
        exports.encode = function(data) {
          var s = '',
              l = data.length,
              hang = 0;
          for (var i = 0; i < l; i++) {
            var v = data[i];
            switch (i % 3) {
              case 0:
                s += chars[v >> 2];
                hang = (v & 3) << 4;
                break;
              case 1:
                s += chars[hang | v >> 4];
                hang = (v & 0xf) << 2;
                break;
              case 2:
                s += chars[hang | v >> 6];
                s += chars[v & 0x3f];
                hang = 0;
                break;
            }
          }
          if (l % 3)
            s += chars[hang];
          return s;
        };
        exports.decode = function(str) {
          var l = str.length,
              j = 0;
          var b = new Buffer(~~((l / 4) * 3)),
              hang = 0;
          for (var i = 0; i < l; i++) {
            var v = codeToIndex[str.charCodeAt(i)];
            switch (i % 4) {
              case 0:
                hang = v << 2;
                break;
              case 1:
                b[j++] = hang | v >> 4;
                hang = (v << 4) & 0xff;
                break;
              case 2:
                b[j++] = hang | v >> 2;
                hang = (v << 6) & 0xff;
                break;
              case 3:
                b[j++] = hang | v;
                break;
            }
          }
          return b;
        };
        return exports;
      };
      module.exports(CHARS, module.exports);
    }, {"8": 8}],
    12: [function(_dereq_, module, exports) {
      "use strict";
      function Deque(capacity) {
        this._capacity = getCapacity(capacity);
        this._length = 0;
        this._front = 0;
        this._makeCapacity();
        if (isArray(capacity)) {
          var len = capacity.length;
          for (var i = 0; i < len; ++i) {
            this[i] = capacity[i];
          }
          this._length = len;
        }
      }
      Deque.prototype.toArray = function Deque$toArray() {
        var len = this._length;
        var ret = new Array(len);
        var front = this._front;
        var capacity = this._capacity;
        for (var j = 0; j < len; ++j) {
          ret[j] = this[(front + j) & (capacity - 1)];
        }
        return ret;
      };
      Deque.prototype.push = function Deque$push(item) {
        var argsLength = arguments.length;
        var length = this._length;
        if (argsLength > 1) {
          var capacity = this._capacity;
          if (length + argsLength > capacity) {
            for (var i = 0; i < argsLength; ++i) {
              this._checkCapacity(length + 1);
              var j = (this._front + length) & (this._capacity - 1);
              this[j] = arguments[i];
              length++;
              this._length = length;
            }
            return length;
          } else {
            var j = this._front;
            for (var i = 0; i < argsLength; ++i) {
              this[(j + length) & (capacity - 1)] = arguments[i];
              j++;
            }
            this._length = length + argsLength;
            return length + argsLength;
          }
        }
        if (argsLength === 0)
          return length;
        this._checkCapacity(length + 1);
        var i = (this._front + length) & (this._capacity - 1);
        this[i] = item;
        this._length = length + 1;
        return length + 1;
      };
      Deque.prototype.pop = function Deque$pop() {
        var length = this._length;
        if (length === 0) {
          return void 0;
        }
        var i = (this._front + length - 1) & (this._capacity - 1);
        var ret = this[i];
        this[i] = void 0;
        this._length = length - 1;
        return ret;
      };
      Deque.prototype.shift = function Deque$shift() {
        var length = this._length;
        if (length === 0) {
          return void 0;
        }
        var front = this._front;
        var ret = this[front];
        this[front] = void 0;
        this._front = (front + 1) & (this._capacity - 1);
        this._length = length - 1;
        return ret;
      };
      Deque.prototype.unshift = function Deque$unshift(item) {
        var length = this._length;
        var argsLength = arguments.length;
        if (argsLength > 1) {
          var capacity = this._capacity;
          if (length + argsLength > capacity) {
            for (var i = argsLength - 1; i >= 0; i--) {
              this._checkCapacity(length + 1);
              var capacity = this._capacity;
              var j = ((((this._front - 1) & (capacity - 1)) ^ capacity) - capacity);
              this[j] = arguments[i];
              length++;
              this._length = length;
              this._front = j;
            }
            return length;
          } else {
            var front = this._front;
            for (var i = argsLength - 1; i >= 0; i--) {
              var j = ((((front - 1) & (capacity - 1)) ^ capacity) - capacity);
              this[j] = arguments[i];
              front = j;
            }
            this._front = front;
            this._length = length + argsLength;
            return length + argsLength;
          }
        }
        if (argsLength === 0)
          return length;
        this._checkCapacity(length + 1);
        var capacity = this._capacity;
        var i = ((((this._front - 1) & (capacity - 1)) ^ capacity) - capacity);
        this[i] = item;
        this._length = length + 1;
        this._front = i;
        return length + 1;
      };
      Deque.prototype.peekBack = function Deque$peekBack() {
        var length = this._length;
        if (length === 0) {
          return void 0;
        }
        var index = (this._front + length - 1) & (this._capacity - 1);
        return this[index];
      };
      Deque.prototype.peekFront = function Deque$peekFront() {
        if (this._length === 0) {
          return void 0;
        }
        return this[this._front];
      };
      Deque.prototype.get = function Deque$get(index) {
        var i = index;
        if ((i !== (i | 0))) {
          return void 0;
        }
        var len = this._length;
        if (i < 0) {
          i = i + len;
        }
        if (i < 0 || i >= len) {
          return void 0;
        }
        return this[(this._front + i) & (this._capacity - 1)];
      };
      Deque.prototype.isEmpty = function Deque$isEmpty() {
        return this._length === 0;
      };
      Deque.prototype.clear = function Deque$clear() {
        this._length = 0;
        this._front = 0;
        this._makeCapacity();
      };
      Deque.prototype.toString = function Deque$toString() {
        return this.toArray().toString();
      };
      Deque.prototype.valueOf = Deque.prototype.toString;
      Deque.prototype.removeFront = Deque.prototype.shift;
      Deque.prototype.removeBack = Deque.prototype.pop;
      Deque.prototype.insertFront = Deque.prototype.unshift;
      Deque.prototype.insertBack = Deque.prototype.push;
      Deque.prototype.enqueue = Deque.prototype.push;
      Deque.prototype.dequeue = Deque.prototype.shift;
      Deque.prototype.toJSON = Deque.prototype.toArray;
      Object.defineProperty(Deque.prototype, "length", {
        get: function() {
          return this._length;
        },
        set: function() {
          throw new RangeError("");
        }
      });
      Deque.prototype._makeCapacity = function Deque$_makeCapacity() {
        var len = this._capacity;
        for (var i = 0; i < len; ++i) {
          this[i] = void 0;
        }
      };
      Deque.prototype._checkCapacity = function Deque$_checkCapacity(size) {
        if (this._capacity < size) {
          this._resizeTo(getCapacity(this._capacity * 1.5 + 16));
        }
      };
      Deque.prototype._resizeTo = function Deque$_resizeTo(capacity) {
        var oldFront = this._front;
        var oldCapacity = this._capacity;
        var oldDeque = new Array(oldCapacity);
        var length = this._length;
        arrayCopy(this, 0, oldDeque, 0, oldCapacity);
        this._capacity = capacity;
        this._makeCapacity();
        this._front = 0;
        if (oldFront + length <= oldCapacity) {
          arrayCopy(oldDeque, oldFront, this, 0, length);
        } else {
          var lengthBeforeWrapping = length - ((oldFront + length) & (oldCapacity - 1));
          arrayCopy(oldDeque, oldFront, this, 0, lengthBeforeWrapping);
          arrayCopy(oldDeque, 0, this, lengthBeforeWrapping, length - lengthBeforeWrapping);
        }
      };
      var isArray = Array.isArray;
      function arrayCopy(src, srcIndex, dst, dstIndex, len) {
        for (var j = 0; j < len; ++j) {
          dst[j + dstIndex] = src[j + srcIndex];
        }
      }
      function pow2AtLeast(n) {
        n = n >>> 0;
        n = n - 1;
        n = n | (n >> 1);
        n = n | (n >> 2);
        n = n | (n >> 4);
        n = n | (n >> 8);
        n = n | (n >> 16);
        return n + 1;
      }
      function getCapacity(capacity) {
        if (typeof capacity !== "number") {
          if (isArray(capacity)) {
            capacity = capacity.length;
          } else {
            return 16;
          }
        }
        return pow2AtLeast(Math.min(Math.max(16, capacity), 1073741824));
      }
      module.exports = Deque;
    }, {}],
    13: [function(_dereq_, module, exports) {
      var prr = _dereq_(65);
      function init(type, message, cause) {
        prr(this, {
          type: type,
          name: type,
          cause: typeof message != 'string' ? message : cause,
          message: !!message && typeof message != 'string' ? message.message : message
        }, 'ewr');
      }
      function CustomError(message, cause) {
        Error.call(this);
        if (Error.captureStackTrace)
          Error.captureStackTrace(this, arguments.callee);
        init.call(this, 'CustomError', message, cause);
      }
      CustomError.prototype = new Error();
      function createError(errno, type, proto) {
        var err = function(message, cause) {
          init.call(this, type, message, cause);
          if (type == 'FilesystemError') {
            this.code = this.cause.code;
            this.path = this.cause.path;
            this.errno = this.cause.errno;
            this.message = (errno.errno[this.cause.errno] ? errno.errno[this.cause.errno].description : this.cause.message) + (this.cause.path ? ' [' + this.cause.path + ']' : '');
          }
          Error.call(this);
          if (Error.captureStackTrace)
            Error.captureStackTrace(this, arguments.callee);
        };
        err.prototype = !!proto ? new proto() : new CustomError();
        return err;
      }
      module.exports = function(errno) {
        var ce = function(type, proto) {
          return createError(errno, type, proto);
        };
        return {
          CustomError: CustomError,
          FilesystemError: ce('FilesystemError'),
          createError: ce
        };
      };
    }, {"65": 65}],
    14: [function(_dereq_, module, exports) {
      var all = module.exports.all = [{
        errno: -2,
        code: 'ENOENT',
        description: 'no such file or directory'
      }, {
        errno: -1,
        code: 'UNKNOWN',
        description: 'unknown error'
      }, {
        errno: 0,
        code: 'OK',
        description: 'success'
      }, {
        errno: 1,
        code: 'EOF',
        description: 'end of file'
      }, {
        errno: 2,
        code: 'EADDRINFO',
        description: 'getaddrinfo error'
      }, {
        errno: 3,
        code: 'EACCES',
        description: 'permission denied'
      }, {
        errno: 4,
        code: 'EAGAIN',
        description: 'resource temporarily unavailable'
      }, {
        errno: 5,
        code: 'EADDRINUSE',
        description: 'address already in use'
      }, {
        errno: 6,
        code: 'EADDRNOTAVAIL',
        description: 'address not available'
      }, {
        errno: 7,
        code: 'EAFNOSUPPORT',
        description: 'address family not supported'
      }, {
        errno: 8,
        code: 'EALREADY',
        description: 'connection already in progress'
      }, {
        errno: 9,
        code: 'EBADF',
        description: 'bad file descriptor'
      }, {
        errno: 10,
        code: 'EBUSY',
        description: 'resource busy or locked'
      }, {
        errno: 11,
        code: 'ECONNABORTED',
        description: 'software caused connection abort'
      }, {
        errno: 12,
        code: 'ECONNREFUSED',
        description: 'connection refused'
      }, {
        errno: 13,
        code: 'ECONNRESET',
        description: 'connection reset by peer'
      }, {
        errno: 14,
        code: 'EDESTADDRREQ',
        description: 'destination address required'
      }, {
        errno: 15,
        code: 'EFAULT',
        description: 'bad address in system call argument'
      }, {
        errno: 16,
        code: 'EHOSTUNREACH',
        description: 'host is unreachable'
      }, {
        errno: 17,
        code: 'EINTR',
        description: 'interrupted system call'
      }, {
        errno: 18,
        code: 'EINVAL',
        description: 'invalid argument'
      }, {
        errno: 19,
        code: 'EISCONN',
        description: 'socket is already connected'
      }, {
        errno: 20,
        code: 'EMFILE',
        description: 'too many open files'
      }, {
        errno: 21,
        code: 'EMSGSIZE',
        description: 'message too long'
      }, {
        errno: 22,
        code: 'ENETDOWN',
        description: 'network is down'
      }, {
        errno: 23,
        code: 'ENETUNREACH',
        description: 'network is unreachable'
      }, {
        errno: 24,
        code: 'ENFILE',
        description: 'file table overflow'
      }, {
        errno: 25,
        code: 'ENOBUFS',
        description: 'no buffer space available'
      }, {
        errno: 26,
        code: 'ENOMEM',
        description: 'not enough memory'
      }, {
        errno: 27,
        code: 'ENOTDIR',
        description: 'not a directory'
      }, {
        errno: 28,
        code: 'EISDIR',
        description: 'illegal operation on a directory'
      }, {
        errno: 29,
        code: 'ENONET',
        description: 'machine is not on the network'
      }, {
        errno: 31,
        code: 'ENOTCONN',
        description: 'socket is not connected'
      }, {
        errno: 32,
        code: 'ENOTSOCK',
        description: 'socket operation on non-socket'
      }, {
        errno: 33,
        code: 'ENOTSUP',
        description: 'operation not supported on socket'
      }, {
        errno: 34,
        code: 'ENOENT',
        description: 'no such file or directory'
      }, {
        errno: 35,
        code: 'ENOSYS',
        description: 'function not implemented'
      }, {
        errno: 36,
        code: 'EPIPE',
        description: 'broken pipe'
      }, {
        errno: 37,
        code: 'EPROTO',
        description: 'protocol error'
      }, {
        errno: 38,
        code: 'EPROTONOSUPPORT',
        description: 'protocol not supported'
      }, {
        errno: 39,
        code: 'EPROTOTYPE',
        description: 'protocol wrong type for socket'
      }, {
        errno: 40,
        code: 'ETIMEDOUT',
        description: 'connection timed out'
      }, {
        errno: 41,
        code: 'ECHARSET',
        description: 'invalid Unicode character'
      }, {
        errno: 42,
        code: 'EAIFAMNOSUPPORT',
        description: 'address family for hostname not supported'
      }, {
        errno: 44,
        code: 'EAISERVICE',
        description: 'servname not supported for ai_socktype'
      }, {
        errno: 45,
        code: 'EAISOCKTYPE',
        description: 'ai_socktype not supported'
      }, {
        errno: 46,
        code: 'ESHUTDOWN',
        description: 'cannot send after transport endpoint shutdown'
      }, {
        errno: 47,
        code: 'EEXIST',
        description: 'file already exists'
      }, {
        errno: 48,
        code: 'ESRCH',
        description: 'no such process'
      }, {
        errno: 49,
        code: 'ENAMETOOLONG',
        description: 'name too long'
      }, {
        errno: 50,
        code: 'EPERM',
        description: 'operation not permitted'
      }, {
        errno: 51,
        code: 'ELOOP',
        description: 'too many symbolic links encountered'
      }, {
        errno: 52,
        code: 'EXDEV',
        description: 'cross-device link not permitted'
      }, {
        errno: 53,
        code: 'ENOTEMPTY',
        description: 'directory not empty'
      }, {
        errno: 54,
        code: 'ENOSPC',
        description: 'no space left on device'
      }, {
        errno: 55,
        code: 'EIO',
        description: 'i/o error'
      }, {
        errno: 56,
        code: 'EROFS',
        description: 'read-only file system'
      }, {
        errno: 57,
        code: 'ENODEV',
        description: 'no such device'
      }, {
        errno: 58,
        code: 'ESPIPE',
        description: 'invalid seek'
      }, {
        errno: 59,
        code: 'ECANCELED',
        description: 'operation canceled'
      }];
      module.exports.errno = {};
      module.exports.code = {};
      all.forEach(function(error) {
        module.exports.errno[error.errno] = error;
        module.exports.code[error.code] = error;
      });
      module.exports.custom = _dereq_(13)(module.exports);
      module.exports.create = module.exports.custom.createError;
    }, {"13": 13}],
    15: [function(_dereq_, module, exports) {
      function EventEmitter() {
        this._events = this._events || {};
        this._maxListeners = this._maxListeners || undefined;
      }
      module.exports = EventEmitter;
      EventEmitter.EventEmitter = EventEmitter;
      EventEmitter.prototype._events = undefined;
      EventEmitter.prototype._maxListeners = undefined;
      EventEmitter.defaultMaxListeners = 10;
      EventEmitter.prototype.setMaxListeners = function(n) {
        if (!isNumber(n) || n < 0 || isNaN(n))
          throw TypeError('n must be a positive number');
        this._maxListeners = n;
        return this;
      };
      EventEmitter.prototype.emit = function(type) {
        var er,
            handler,
            len,
            args,
            i,
            listeners;
        if (!this._events)
          this._events = {};
        if (type === 'error') {
          if (!this._events.error || (isObject(this._events.error) && !this._events.error.length)) {
            er = arguments[1];
            if (er instanceof Error) {
              throw er;
            }
            throw TypeError('Uncaught, unspecified "error" event.');
          }
        }
        handler = this._events[type];
        if (isUndefined(handler))
          return false;
        if (isFunction(handler)) {
          switch (arguments.length) {
            case 1:
              handler.call(this);
              break;
            case 2:
              handler.call(this, arguments[1]);
              break;
            case 3:
              handler.call(this, arguments[1], arguments[2]);
              break;
            default:
              args = Array.prototype.slice.call(arguments, 1);
              handler.apply(this, args);
          }
        } else if (isObject(handler)) {
          args = Array.prototype.slice.call(arguments, 1);
          listeners = handler.slice();
          len = listeners.length;
          for (i = 0; i < len; i++)
            listeners[i].apply(this, args);
        }
        return true;
      };
      EventEmitter.prototype.addListener = function(type, listener) {
        var m;
        if (!isFunction(listener))
          throw TypeError('listener must be a function');
        if (!this._events)
          this._events = {};
        if (this._events.newListener)
          this.emit('newListener', type, isFunction(listener.listener) ? listener.listener : listener);
        if (!this._events[type])
          this._events[type] = listener;
        else if (isObject(this._events[type]))
          this._events[type].push(listener);
        else
          this._events[type] = [this._events[type], listener];
        if (isObject(this._events[type]) && !this._events[type].warned) {
          if (!isUndefined(this._maxListeners)) {
            m = this._maxListeners;
          } else {
            m = EventEmitter.defaultMaxListeners;
          }
          if (m && m > 0 && this._events[type].length > m) {
            this._events[type].warned = true;
            console.error('(node) warning: possible EventEmitter memory ' + 'leak detected. %d listeners added. ' + 'Use emitter.setMaxListeners() to increase limit.', this._events[type].length);
            if (typeof console.trace === 'function') {
              console.trace();
            }
          }
        }
        return this;
      };
      EventEmitter.prototype.on = EventEmitter.prototype.addListener;
      EventEmitter.prototype.once = function(type, listener) {
        if (!isFunction(listener))
          throw TypeError('listener must be a function');
        var fired = false;
        function g() {
          this.removeListener(type, g);
          if (!fired) {
            fired = true;
            listener.apply(this, arguments);
          }
        }
        g.listener = listener;
        this.on(type, g);
        return this;
      };
      EventEmitter.prototype.removeListener = function(type, listener) {
        var list,
            position,
            length,
            i;
        if (!isFunction(listener))
          throw TypeError('listener must be a function');
        if (!this._events || !this._events[type])
          return this;
        list = this._events[type];
        length = list.length;
        position = -1;
        if (list === listener || (isFunction(list.listener) && list.listener === listener)) {
          delete this._events[type];
          if (this._events.removeListener)
            this.emit('removeListener', type, listener);
        } else if (isObject(list)) {
          for (i = length; i-- > 0; ) {
            if (list[i] === listener || (list[i].listener && list[i].listener === listener)) {
              position = i;
              break;
            }
          }
          if (position < 0)
            return this;
          if (list.length === 1) {
            list.length = 0;
            delete this._events[type];
          } else {
            list.splice(position, 1);
          }
          if (this._events.removeListener)
            this.emit('removeListener', type, listener);
        }
        return this;
      };
      EventEmitter.prototype.removeAllListeners = function(type) {
        var key,
            listeners;
        if (!this._events)
          return this;
        if (!this._events.removeListener) {
          if (arguments.length === 0)
            this._events = {};
          else if (this._events[type])
            delete this._events[type];
          return this;
        }
        if (arguments.length === 0) {
          for (key in this._events) {
            if (key === 'removeListener')
              continue;
            this.removeAllListeners(key);
          }
          this.removeAllListeners('removeListener');
          this._events = {};
          return this;
        }
        listeners = this._events[type];
        if (isFunction(listeners)) {
          this.removeListener(type, listeners);
        } else if (listeners) {
          while (listeners.length)
            this.removeListener(type, listeners[listeners.length - 1]);
        }
        delete this._events[type];
        return this;
      };
      EventEmitter.prototype.listeners = function(type) {
        var ret;
        if (!this._events || !this._events[type])
          ret = [];
        else if (isFunction(this._events[type]))
          ret = [this._events[type]];
        else
          ret = this._events[type].slice();
        return ret;
      };
      EventEmitter.prototype.listenerCount = function(type) {
        if (this._events) {
          var evlistener = this._events[type];
          if (isFunction(evlistener))
            return 1;
          else if (evlistener)
            return evlistener.length;
        }
        return 0;
      };
      EventEmitter.listenerCount = function(emitter, type) {
        return emitter.listenerCount(type);
      };
      function isFunction(arg) {
        return typeof arg === 'function';
      }
      function isNumber(arg) {
        return typeof arg === 'number';
      }
      function isObject(arg) {
        return typeof arg === 'object' && arg !== null;
      }
      function isUndefined(arg) {
        return arg === void 0;
      }
    }, {}],
    16: [function(_dereq_, module, exports) {
      (function(process, global) {
        'use strict';
        var STORE = 'fruitdown';
        var nextTick = global.setImmediate || process.nextTick;
        var cachedDBs = {};
        var openReqList = {};
        function StorageCore(dbName) {
          this._dbName = dbName;
        }
        function getDatabase(dbName, callback) {
          if (cachedDBs[dbName]) {
            return nextTick(function() {
              callback(null, cachedDBs[dbName]);
            });
          }
          var req = indexedDB.open(dbName, 1);
          openReqList[dbName] = req;
          req.onupgradeneeded = function(e) {
            var db = e.target.result;
            if (e.oldVersion === 1) {
              return;
            }
            db.createObjectStore(STORE).createIndex('fakeKey', 'fakeKey');
          };
          req.onsuccess = function(e) {
            var db = cachedDBs[dbName] = e.target.result;
            callback(null, db);
          };
          req.onerror = function(e) {
            var msg = 'Failed to open indexedDB, are you in private browsing mode?';
            console.error(msg);
            callback(e);
          };
        }
        function openTransactionSafely(db, mode) {
          try {
            return {txn: db.transaction(STORE, mode)};
          } catch (err) {
            return {error: err};
          }
        }
        StorageCore.prototype.getKeys = function(callback) {
          getDatabase(this._dbName, function(err, db) {
            if (err) {
              return callback(err);
            }
            var txnRes = openTransactionSafely(db, 'readonly');
            if (txnRes.error) {
              return callback(txnRes.error);
            }
            var txn = txnRes.txn;
            var store = txn.objectStore(STORE);
            txn.onerror = callback;
            var keys = [];
            txn.oncomplete = function() {
              callback(null, keys.sort());
            };
            var req = store.index('fakeKey').openKeyCursor();
            req.onsuccess = function(e) {
              var cursor = e.target.result;
              if (!cursor) {
                return;
              }
              keys.push(cursor.primaryKey);
              cursor.continue();
            };
          });
        };
        StorageCore.prototype.put = function(key, value, callback) {
          getDatabase(this._dbName, function(err, db) {
            if (err) {
              return callback(err);
            }
            var txnRes = openTransactionSafely(db, 'readwrite');
            if (txnRes.error) {
              return callback(txnRes.error);
            }
            var txn = txnRes.txn;
            var store = txn.objectStore(STORE);
            var valueToStore = typeof value === 'string' ? value : value.toString();
            txn.onerror = callback;
            txn.oncomplete = function() {
              callback();
            };
            store.put({
              value: valueToStore,
              fakeKey: 0
            }, key);
          });
        };
        StorageCore.prototype.get = function(key, callback) {
          getDatabase(this._dbName, function(err, db) {
            if (err) {
              return callback(err);
            }
            var txnRes = openTransactionSafely(db, 'readonly');
            if (txnRes.error) {
              return callback(txnRes.error);
            }
            var txn = txnRes.txn;
            var store = txn.objectStore(STORE);
            var gotten;
            var req = store.get(key);
            req.onsuccess = function(e) {
              if (e.target.result) {
                gotten = e.target.result.value;
              }
            };
            txn.onerror = callback;
            txn.oncomplete = function() {
              callback(null, gotten);
            };
          });
        };
        StorageCore.prototype.remove = function(key, callback) {
          getDatabase(this._dbName, function(err, db) {
            if (err) {
              return callback(err);
            }
            var txnRes = openTransactionSafely(db, 'readwrite');
            if (txnRes.error) {
              return callback(txnRes.error);
            }
            var txn = txnRes.txn;
            var store = txn.objectStore(STORE);
            store.delete(key);
            txn.onerror = callback;
            txn.oncomplete = function() {
              callback();
            };
          });
        };
        StorageCore.destroy = function(dbName, callback) {
          nextTick(function() {
            if (openReqList[dbName] && openReqList[dbName].result) {
              openReqList[dbName].result.close();
              delete cachedDBs[dbName];
            }
            var req = indexedDB.deleteDatabase(dbName);
            req.onsuccess = function() {
              if (openReqList[dbName]) {
                openReqList[dbName] = null;
              }
              callback(null);
            };
            req.onerror = callback;
          });
        };
        module.exports = StorageCore;
      }).call(this, _dereq_(64), typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {"64": 64}],
    17: [function(_dereq_, module, exports) {
      (function(Buffer) {
        'use strict';
        var arrayBuffPrefix = 'ArrayBuffer:';
        var arrayBuffRegex = new RegExp('^' + arrayBuffPrefix);
        var uintPrefix = 'Uint8Array:';
        var uintRegex = new RegExp('^' + uintPrefix);
        var bufferPrefix = 'Buff:';
        var bufferRegex = new RegExp('^' + bufferPrefix);
        var utils = _dereq_(20);
        var DatabaseCore = _dereq_(16);
        var TaskQueue = _dereq_(19);
        var d64 = _dereq_(11);
        function Database(dbname) {
          this._store = new DatabaseCore(dbname);
          this._queue = new TaskQueue();
        }
        Database.prototype.sequentialize = function(callback, fun) {
          this._queue.add(fun, callback);
        };
        Database.prototype.init = function(callback) {
          var self = this;
          self.sequentialize(callback, function(callback) {
            self._store.getKeys(function(err, keys) {
              if (err) {
                return callback(err);
              }
              self._keys = keys;
              return callback();
            });
          });
        };
        Database.prototype.keys = function(callback) {
          var self = this;
          self.sequentialize(callback, function(callback) {
            callback(null, self._keys.slice());
          });
        };
        Database.prototype.setItem = function(key, value, callback) {
          var self = this;
          self.sequentialize(callback, function(callback) {
            if (Buffer.isBuffer(value)) {
              value = bufferPrefix + d64.encode(value);
            }
            var idx = utils.sortedIndexOf(self._keys, key);
            if (self._keys[idx] !== key) {
              self._keys.splice(idx, 0, key);
            }
            self._store.put(key, value, callback);
          });
        };
        Database.prototype.getItem = function(key, callback) {
          var self = this;
          self.sequentialize(callback, function(callback) {
            self._store.get(key, function(err, retval) {
              if (err) {
                return callback(err);
              }
              if (typeof retval === 'undefined' || retval === null) {
                return callback(new Error('NotFound'));
              }
              if (typeof retval !== 'undefined') {
                if (bufferRegex.test(retval)) {
                  retval = d64.decode(retval.substring(bufferPrefix.length));
                } else if (arrayBuffRegex.test(retval)) {
                  retval = retval.substring(arrayBuffPrefix.length);
                  retval = new ArrayBuffer(atob(retval).split('').map(function(c) {
                    return c.charCodeAt(0);
                  }));
                } else if (uintRegex.test(retval)) {
                  retval = retval.substring(uintPrefix.length);
                  retval = new Uint8Array(atob(retval).split('').map(function(c) {
                    return c.charCodeAt(0);
                  }));
                }
              }
              callback(null, retval);
            });
          });
        };
        Database.prototype.removeItem = function(key, callback) {
          var self = this;
          self.sequentialize(callback, function(callback) {
            var idx = utils.sortedIndexOf(self._keys, key);
            if (self._keys[idx] === key) {
              self._keys.splice(idx, 1);
              self._store.remove(key, function(err) {
                if (err) {
                  return callback(err);
                }
                callback();
              });
            } else {
              callback();
            }
          });
        };
        Database.prototype.length = function(callback) {
          var self = this;
          self.sequentialize(callback, function(callback) {
            callback(null, self._keys.length);
          });
        };
        module.exports = Database;
      }).call(this, {"isBuffer": _dereq_(24)});
    }, {
      "11": 11,
      "16": 16,
      "19": 19,
      "20": 20,
      "24": 24
    }],
    18: [function(_dereq_, module, exports) {
      (function(process, global, Buffer) {
        'use strict';
        var inherits = _dereq_(23);
        var AbstractLevelDOWN = _dereq_(4).AbstractLevelDOWN;
        var AbstractIterator = _dereq_(4).AbstractIterator;
        var Database = _dereq_(17);
        var DatabaseCore = _dereq_(16);
        var utils = _dereq_(20);
        var nextTick = global.setImmediate || process.nextTick;
        function DatabaseIterator(db, options) {
          AbstractIterator.call(this, db);
          this._reverse = !!options.reverse;
          this._endkey = options.end;
          this._startkey = options.start;
          this._gt = options.gt;
          this._gte = options.gte;
          this._lt = options.lt;
          this._lte = options.lte;
          this._exclusiveStart = options.exclusiveStart;
          this._limit = options.limit;
          this._count = 0;
          this.onInitCompleteListeners = [];
        }
        inherits(DatabaseIterator, AbstractIterator);
        DatabaseIterator.prototype._init = function(callback) {
          nextTick(function() {
            callback();
          });
        };
        DatabaseIterator.prototype._next = function(callback) {
          var self = this;
          function onInitComplete() {
            if (self._pos === self._keys.length || self._pos < 0) {
              return callback();
            }
            var key = self._keys[self._pos];
            if (!!self._endkey && (self._reverse ? key < self._endkey : key > self._endkey)) {
              return callback();
            }
            if (!!self._limit && self._limit > 0 && self._count++ >= self._limit) {
              return callback();
            }
            if ((self._lt && key >= self._lt) || (self._lte && key > self._lte) || (self._gt && key <= self._gt) || (self._gte && key < self._gte)) {
              return callback();
            }
            self._pos += self._reverse ? -1 : 1;
            self.db.container.getItem(key, function(err, value) {
              if (err) {
                if (err.message === 'NotFound') {
                  return nextTick(function() {
                    self._next(callback);
                  });
                }
                return callback(err);
              }
              callback(null, key, value);
            });
          }
          if (!self.initStarted) {
            self.initStarted = true;
            self._init(function(err) {
              if (err) {
                return callback(err);
              }
              self.db.container.keys(function(err, keys) {
                if (err) {
                  return callback(err);
                }
                self._keys = keys;
                if (self._startkey) {
                  var index = utils.sortedIndexOf(self._keys, self._startkey);
                  var startkey = (index >= self._keys.length || index < 0) ? undefined : self._keys[index];
                  self._pos = index;
                  if (self._reverse) {
                    if (self._exclusiveStart || startkey !== self._startkey) {
                      self._pos--;
                    }
                  } else if (self._exclusiveStart && startkey === self._startkey) {
                    self._pos++;
                  }
                } else {
                  self._pos = self._reverse ? self._keys.length - 1 : 0;
                }
                onInitComplete();
                self.initCompleted = true;
                var i = -1;
                while (++i < self.onInitCompleteListeners) {
                  nextTick(self.onInitCompleteListeners[i]);
                }
              });
            });
          } else if (!self.initCompleted) {
            self.onInitCompleteListeners.push(onInitComplete);
          } else {
            onInitComplete();
          }
        };
        function FruitDown(location) {
          if (!(this instanceof FruitDown)) {
            return new FruitDown(location);
          }
          AbstractLevelDOWN.call(this, location);
          this.container = new Database(location);
        }
        inherits(FruitDown, AbstractLevelDOWN);
        FruitDown.prototype._open = function(options, callback) {
          this.container.init(callback);
        };
        FruitDown.prototype._put = function(key, value, options, callback) {
          var err = checkKeyValue(key, 'key');
          if (err) {
            return nextTick(function() {
              callback(err);
            });
          }
          err = checkKeyValue(value, 'value');
          if (err) {
            return nextTick(function() {
              callback(err);
            });
          }
          if (typeof value === 'object' && !Buffer.isBuffer(value) && value.buffer === undefined) {
            var obj = {};
            obj.storetype = "json";
            obj.data = value;
            value = JSON.stringify(obj);
          }
          this.container.setItem(key, value, callback);
        };
        FruitDown.prototype._get = function(key, options, callback) {
          var err = checkKeyValue(key, 'key');
          if (err) {
            return nextTick(function() {
              callback(err);
            });
          }
          if (!Buffer.isBuffer(key)) {
            key = String(key);
          }
          this.container.getItem(key, function(err, value) {
            if (err) {
              return callback(err);
            }
            if (options.asBuffer !== false && !Buffer.isBuffer(value)) {
              value = new Buffer(value);
            }
            if (options.asBuffer === false) {
              if (value.indexOf("{\"storetype\":\"json\",\"data\"") > -1) {
                var res = JSON.parse(value);
                value = res.data;
              }
            }
            callback(null, value);
          });
        };
        FruitDown.prototype._del = function(key, options, callback) {
          var err = checkKeyValue(key, 'key');
          if (err) {
            return nextTick(function() {
              callback(err);
            });
          }
          if (!Buffer.isBuffer(key)) {
            key = String(key);
          }
          this.container.removeItem(key, callback);
        };
        FruitDown.prototype._batch = function(array, options, callback) {
          var self = this;
          nextTick(function() {
            var err;
            var key;
            var value;
            var numDone = 0;
            var overallErr;
            function checkDone() {
              if (++numDone === array.length) {
                callback(overallErr);
              }
            }
            if (Array.isArray(array) && array.length) {
              for (var i = 0; i < array.length; i++) {
                var task = array[i];
                if (task) {
                  key = Buffer.isBuffer(task.key) ? task.key : String(task.key);
                  err = checkKeyValue(key, 'key');
                  if (err) {
                    overallErr = err;
                    checkDone();
                  } else if (task.type === 'del') {
                    self._del(task.key, options, checkDone);
                  } else if (task.type === 'put') {
                    value = Buffer.isBuffer(task.value) ? task.value : String(task.value);
                    err = checkKeyValue(value, 'value');
                    if (err) {
                      overallErr = err;
                      checkDone();
                    } else {
                      self._put(key, value, options, checkDone);
                    }
                  }
                } else {
                  checkDone();
                }
              }
            } else {
              callback();
            }
          });
        };
        FruitDown.prototype._iterator = function(options) {
          return new DatabaseIterator(this, options);
        };
        FruitDown.destroy = function(name, callback) {
          DatabaseCore.destroy(name, callback);
        };
        function checkKeyValue(obj, type) {
          if (obj === null || obj === undefined) {
            return new Error(type + ' cannot be `null` or `undefined`');
          }
          if (obj === null || obj === undefined) {
            return new Error(type + ' cannot be `null` or `undefined`');
          }
          if (type === 'key') {
            if (obj instanceof Boolean) {
              return new Error(type + ' cannot be `null` or `undefined`');
            }
            if (obj === '') {
              return new Error(type + ' cannot be empty');
            }
          }
          if (obj.toString().indexOf("[object ArrayBuffer]") === 0) {
            if (obj.byteLength === 0 || obj.byteLength === undefined) {
              return new Error(type + ' cannot be an empty Buffer');
            }
          }
          if (Buffer.isBuffer(obj)) {
            if (obj.length === 0) {
              return new Error(type + ' cannot be an empty Buffer');
            }
          } else if (String(obj) === '') {
            return new Error(type + ' cannot be an empty String');
          }
        }
        module.exports = FruitDown;
      }).call(this, _dereq_(64), typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {}, _dereq_(8).Buffer);
    }, {
      "16": 16,
      "17": 17,
      "20": 20,
      "23": 23,
      "4": 4,
      "64": 64,
      "8": 8
    }],
    19: [function(_dereq_, module, exports) {
      (function(process, global) {
        'use strict';
        var argsarray = _dereq_(5);
        var Queue = _dereq_(92);
        var nextTick = global.setImmediate || process.nextTick;
        function TaskQueue() {
          this.queue = new Queue();
          this.running = false;
        }
        TaskQueue.prototype.add = function(fun, callback) {
          this.queue.push({
            fun: fun,
            callback: callback
          });
          this.processNext();
        };
        TaskQueue.prototype.processNext = function() {
          var self = this;
          if (self.running || !self.queue.length) {
            return;
          }
          self.running = true;
          var task = self.queue.shift();
          nextTick(function() {
            task.fun(argsarray(function(args) {
              task.callback.apply(null, args);
              self.running = false;
              self.processNext();
            }));
          });
        };
        module.exports = TaskQueue;
      }).call(this, _dereq_(64), typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {
      "5": 5,
      "64": 64,
      "92": 92
    }],
    20: [function(_dereq_, module, exports) {
      'use strict';
      exports.sortedIndexOf = function(arr, item) {
        var low = 0;
        var high = arr.length;
        var mid;
        while (low < high) {
          mid = (low + high) >>> 1;
          if (arr[mid] < item) {
            low = mid + 1;
          } else {
            high = mid;
          }
        }
        return low;
      };
    }, {}],
    21: [function(_dereq_, module, exports) {
      exports.read = function(buffer, offset, isLE, mLen, nBytes) {
        var e,
            m;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var nBits = -7;
        var i = isLE ? (nBytes - 1) : 0;
        var d = isLE ? -1 : 1;
        var s = buffer[offset + i];
        i += d;
        e = s & ((1 << (-nBits)) - 1);
        s >>= (-nBits);
        nBits += eLen;
        for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}
        m = e & ((1 << (-nBits)) - 1);
        e >>= (-nBits);
        nBits += mLen;
        for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}
        if (e === 0) {
          e = 1 - eBias;
        } else if (e === eMax) {
          return m ? NaN : ((s ? -1 : 1) * Infinity);
        } else {
          m = m + Math.pow(2, mLen);
          e = e - eBias;
        }
        return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
      };
      exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
        var e,
            m,
            c;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
        var i = isLE ? 0 : (nBytes - 1);
        var d = isLE ? 1 : -1;
        var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;
        value = Math.abs(value);
        if (isNaN(value) || value === Infinity) {
          m = isNaN(value) ? 1 : 0;
          e = eMax;
        } else {
          e = Math.floor(Math.log(value) / Math.LN2);
          if (value * (c = Math.pow(2, -e)) < 1) {
            e--;
            c *= 2;
          }
          if (e + eBias >= 1) {
            value += rt / c;
          } else {
            value += rt * Math.pow(2, 1 - eBias);
          }
          if (value * c >= 2) {
            e++;
            c /= 2;
          }
          if (e + eBias >= eMax) {
            m = 0;
            e = eMax;
          } else if (e + eBias >= 1) {
            m = (value * c - 1) * Math.pow(2, mLen);
            e = e + eBias;
          } else {
            m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
            e = 0;
          }
        }
        for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}
        e = (e << mLen) | m;
        eLen += mLen;
        for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}
        buffer[offset + i - d] |= s * 128;
      };
    }, {}],
    22: [function(_dereq_, module, exports) {
      (function(global) {
        'use strict';
        var Mutation = global.MutationObserver || global.WebKitMutationObserver;
        var scheduleDrain;
        {
          if (Mutation) {
            var called = 0;
            var observer = new Mutation(nextTick);
            var element = global.document.createTextNode('');
            observer.observe(element, {characterData: true});
            scheduleDrain = function() {
              element.data = (called = ++called % 2);
            };
          } else if (!global.setImmediate && typeof global.MessageChannel !== 'undefined') {
            var channel = new global.MessageChannel();
            channel.port1.onmessage = nextTick;
            scheduleDrain = function() {
              channel.port2.postMessage(0);
            };
          } else if ('document' in global && 'onreadystatechange' in global.document.createElement('script')) {
            scheduleDrain = function() {
              var scriptEl = global.document.createElement('script');
              scriptEl.onreadystatechange = function() {
                nextTick();
                scriptEl.onreadystatechange = null;
                scriptEl.parentNode.removeChild(scriptEl);
                scriptEl = null;
              };
              global.document.documentElement.appendChild(scriptEl);
            };
          } else {
            scheduleDrain = function() {
              setTimeout(nextTick, 0);
            };
          }
        }
        var draining;
        var queue = [];
        function nextTick() {
          draining = true;
          var i,
              oldQueue;
          var len = queue.length;
          while (len) {
            oldQueue = queue;
            queue = [];
            i = -1;
            while (++i < len) {
              oldQueue[i]();
            }
            len = queue.length;
          }
          draining = false;
        }
        module.exports = immediate;
        function immediate(task) {
          if (queue.push(task) === 1 && !draining) {
            scheduleDrain();
          }
        }
      }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {}],
    23: [function(_dereq_, module, exports) {
      if (typeof Object.create === 'function') {
        module.exports = function inherits(ctor, superCtor) {
          ctor.super_ = superCtor;
          ctor.prototype = Object.create(superCtor.prototype, {constructor: {
              value: ctor,
              enumerable: false,
              writable: true,
              configurable: true
            }});
        };
      } else {
        module.exports = function inherits(ctor, superCtor) {
          ctor.super_ = superCtor;
          var TempCtor = function() {};
          TempCtor.prototype = superCtor.prototype;
          ctor.prototype = new TempCtor();
          ctor.prototype.constructor = ctor;
        };
      }
    }, {}],
    24: [function(_dereq_, module, exports) {
      module.exports = function(obj) {
        return !!(obj != null && (obj._isBuffer || (obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj))));
      };
    }, {}],
    25: [function(_dereq_, module, exports) {
      module.exports = Array.isArray || function(arr) {
        return Object.prototype.toString.call(arr) == '[object Array]';
      };
    }, {}],
    26: [function(_dereq_, module, exports) {
      (function(factory) {
        if (typeof exports === 'object') {
          factory(exports);
        } else {
          factory(this);
        }
      }).call(this, function(root) {
        var slice = Array.prototype.slice,
            each = Array.prototype.forEach;
        var extend = function(obj) {
          if (typeof obj !== 'object')
            throw obj + ' is not an object';
          var sources = slice.call(arguments, 1);
          each.call(sources, function(source) {
            if (source) {
              for (var prop in source) {
                if (typeof source[prop] === 'object' && obj[prop]) {
                  extend.call(obj, obj[prop], source[prop]);
                } else {
                  obj[prop] = source[prop];
                }
              }
            }
          });
          return obj;
        };
        root.extend = extend;
      });
    }, {}],
    27: [function(_dereq_, module, exports) {
      var encodings = _dereq_(28);
      module.exports = Codec;
      function Codec(opts) {
        this.opts = opts || {};
        this.encodings = encodings;
      }
      Codec.prototype._encoding = function(encoding) {
        if (typeof encoding == 'string')
          encoding = encodings[encoding];
        if (!encoding)
          encoding = encodings.id;
        return encoding;
      };
      Codec.prototype._keyEncoding = function(opts, batchOpts) {
        return this._encoding(batchOpts && batchOpts.keyEncoding || opts && opts.keyEncoding || this.opts.keyEncoding);
      };
      Codec.prototype._valueEncoding = function(opts, batchOpts) {
        return this._encoding(batchOpts && (batchOpts.valueEncoding || batchOpts.encoding) || opts && (opts.valueEncoding || opts.encoding) || (this.opts.valueEncoding || this.opts.encoding));
      };
      Codec.prototype.encodeKey = function(key, opts, batchOpts) {
        return this._keyEncoding(opts, batchOpts).encode(key);
      };
      Codec.prototype.encodeValue = function(value, opts, batchOpts) {
        return this._valueEncoding(opts, batchOpts).encode(value);
      };
      Codec.prototype.decodeKey = function(key, opts) {
        return this._keyEncoding(opts).decode(key);
      };
      Codec.prototype.decodeValue = function(value, opts) {
        return this._valueEncoding(opts).decode(value);
      };
      Codec.prototype.encodeBatch = function(ops, opts) {
        var self = this;
        return ops.map(function(_op) {
          var op = {
            type: _op.type,
            key: self.encodeKey(_op.key, opts, _op)
          };
          if (self.keyAsBuffer(opts, _op))
            op.keyEncoding = 'binary';
          if (_op.prefix)
            op.prefix = _op.prefix;
          if ('value' in _op) {
            op.value = self.encodeValue(_op.value, opts, _op);
            if (self.valueAsBuffer(opts, _op))
              op.valueEncoding = 'binary';
          }
          return op;
        });
      };
      var ltgtKeys = ['lt', 'gt', 'lte', 'gte', 'start', 'end'];
      Codec.prototype.encodeLtgt = function(ltgt) {
        var self = this;
        var ret = {};
        Object.keys(ltgt).forEach(function(key) {
          ret[key] = ltgtKeys.indexOf(key) > -1 ? self.encodeKey(ltgt[key], ltgt) : ltgt[key];
        });
        return ret;
      };
      Codec.prototype.createStreamDecoder = function(opts) {
        var self = this;
        if (opts.keys && opts.values) {
          return function(key, value) {
            return {
              key: self.decodeKey(key, opts),
              value: self.decodeValue(value, opts)
            };
          };
        } else if (opts.keys) {
          return function(key) {
            return self.decodeKey(key, opts);
          };
        } else if (opts.values) {
          return function(_, value) {
            return self.decodeValue(value, opts);
          };
        } else {
          return function() {};
        }
      };
      Codec.prototype.keyAsBuffer = function(opts) {
        return this._keyEncoding(opts).buffer;
      };
      Codec.prototype.valueAsBuffer = function(opts) {
        return this._valueEncoding(opts).buffer;
      };
    }, {"28": 28}],
    28: [function(_dereq_, module, exports) {
      (function(Buffer) {
        exports.utf8 = exports['utf-8'] = {
          encode: function(data) {
            return isBinary(data) ? data : String(data);
          },
          decode: identity,
          buffer: false,
          type: 'utf8'
        };
        exports.json = {
          encode: JSON.stringify,
          decode: JSON.parse,
          buffer: false,
          type: 'json'
        };
        exports.binary = {
          encode: function(data) {
            return isBinary(data) ? data : new Buffer(data);
          },
          decode: identity,
          buffer: true,
          type: 'binary'
        };
        exports.id = {
          encode: function(data) {
            return data;
          },
          decode: function(data) {
            return data;
          },
          buffer: false,
          type: 'id'
        };
        var bufferEncodings = ['hex', 'ascii', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le'];
        bufferEncodings.forEach(function(type) {
          exports[type] = {
            encode: function(data) {
              return isBinary(data) ? data : new Buffer(data, type);
            },
            decode: function(buffer) {
              return buffer.toString(type);
            },
            buffer: true,
            type: type
          };
        });
        function identity(value) {
          return value;
        }
        function isBinary(data) {
          return data === undefined || data === null || Buffer.isBuffer(data);
        }
      }).call(this, _dereq_(8).Buffer);
    }, {"8": 8}],
    29: [function(_dereq_, module, exports) {
      var createError = _dereq_(14).create,
          LevelUPError = createError('LevelUPError'),
          NotFoundError = createError('NotFoundError', LevelUPError);
      NotFoundError.prototype.notFound = true;
      NotFoundError.prototype.status = 404;
      module.exports = {
        LevelUPError: LevelUPError,
        InitializationError: createError('InitializationError', LevelUPError),
        OpenError: createError('OpenError', LevelUPError),
        ReadError: createError('ReadError', LevelUPError),
        WriteError: createError('WriteError', LevelUPError),
        NotFoundError: NotFoundError,
        EncodingError: createError('EncodingError', LevelUPError)
      };
    }, {"14": 14}],
    30: [function(_dereq_, module, exports) {
      var inherits = _dereq_(23);
      var Readable = _dereq_(71).Readable;
      var extend = _dereq_(31);
      var EncodingError = _dereq_(29).EncodingError;
      module.exports = ReadStream;
      inherits(ReadStream, Readable);
      function ReadStream(iterator, options) {
        if (!(this instanceof ReadStream))
          return new ReadStream(iterator, options);
        Readable.call(this, extend(options, {objectMode: true}));
        this._iterator = iterator;
        this._destroyed = false;
        this._decoder = null;
        if (options && options.decoder)
          this._decoder = options.decoder;
        this.on('end', this._cleanup.bind(this));
      }
      ReadStream.prototype._read = function() {
        var self = this;
        if (this._destroyed)
          return;
        this._iterator.next(function(err, key, value) {
          if (self._destroyed)
            return;
          if (err)
            return self.emit('error', err);
          if (key === undefined && value === undefined) {
            self.push(null);
          } else {
            if (!self._decoder)
              return self.push({
                key: key,
                value: value
              });
            try {
              var value = self._decoder(key, value);
            } catch (err) {
              self.emit('error', new EncodingError(err));
              self.push(null);
              return;
            }
            self.push(value);
          }
        });
      };
      ReadStream.prototype.destroy = ReadStream.prototype._cleanup = function() {
        var self = this;
        if (this._destroyed)
          return;
        this._destroyed = true;
        this._iterator.end(function(err) {
          if (err)
            return self.emit('error', err);
          self.emit('close');
        });
      };
    }, {
      "23": 23,
      "29": 29,
      "31": 31,
      "71": 71
    }],
    31: [function(_dereq_, module, exports) {
      module.exports = extend;
      var hasOwnProperty = Object.prototype.hasOwnProperty;
      function extend() {
        var target = {};
        for (var i = 0; i < arguments.length; i++) {
          var source = arguments[i];
          for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }
        return target;
      }
    }, {}],
    32: [function(_dereq_, module, exports) {
      module.exports = {
        encode: function(e) {
          var s = '';
          var prefix = e[0].slice();
          while (prefix.length) {
            s += '\xff' + prefix.shift().toString() + '\xff';
          }
          return s + (e[1] || '').toString();
        },
        decode: function(e) {
          var k = e.toString().split('\xff').filter(Boolean);
          var j = k.pop();
          return [k, j];
        },
        lowerBound: '\x00',
        upperBound: '\xff'
      };
    }, {}],
    33: [function(_dereq_, module, exports) {
      var inRange = _dereq_(45);
      module.exports = function(compare) {
        var hooks = [];
        return {
          add: function(range, hook) {
            var m = {
              range: range,
              hook: hook
            };
            hooks.push(m);
            return function() {
              var i = hooks.indexOf(m);
              if (~i)
                return hooks.splice(i, 1);
            };
          },
          removeAll: function(range) {
            throw new Error('not implemented');
          },
          trigger: function(key, args) {
            for (var i = 0; i < hooks.length; i++) {
              var test = hooks[i];
              if (inRange(test.range, key, compare))
                test.hook.apply(this, args);
            }
          }
        };
      };
    }, {"45": 45}],
    34: [function(_dereq_, module, exports) {
      var nut = _dereq_(43);
      var shell = _dereq_(46);
      var codec = _dereq_(35);
      var merge = _dereq_(42);
      var ReadStream = _dereq_(38);
      var precodec = _dereq_(32);
      module.exports = function(db, opts) {
        opts = merge(db.options, opts);
        return shell(nut(db, precodec, codec), [], ReadStream, db.options);
      };
    }, {
      "32": 32,
      "35": 35,
      "38": 38,
      "42": 42,
      "43": 43,
      "46": 46
    }],
    35: [function(_dereq_, module, exports) {
      var encodings = _dereq_(36);
      function getKeyEncoder(options, op) {
        var type = ((op && op.keyEncoding) || options.keyEncoding) || 'utf8';
        return encodings[type] || type;
      }
      function getValueEncoder(options, op) {
        var type = (((op && (op.valueEncoding || op.encoding)) || options.valueEncoding || options.encoding)) || 'utf8';
        return encodings[type] || type;
      }
      function encodeKey(key, options, op) {
        return getKeyEncoder(options, op).encode(key);
      }
      function encodeValue(value, options, op) {
        return getValueEncoder(options, op).encode(value);
      }
      function decodeKey(key, options) {
        return getKeyEncoder(options).decode(key);
      }
      function decodeValue(value, options) {
        return getValueEncoder(options).decode(value);
      }
      function isValueAsBuffer(options, op) {
        return getValueEncoder(options, op).buffer;
      }
      function isKeyAsBuffer(options, op) {
        return getKeyEncoder(options, op).buffer;
      }
      module.exports = {
        encodeKey: encodeKey,
        encodeValue: encodeValue,
        isValueAsBuffer: isValueAsBuffer,
        isKeyAsBuffer: isKeyAsBuffer,
        decodeValue: decodeValue,
        decodeKey: decodeKey
      };
    }, {"36": 36}],
    36: [function(_dereq_, module, exports) {
      (function(Buffer) {
        var encodingNames = ['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le'];
        module.exports = (function() {
          function isBinary(data) {
            return data === undefined || data === null || Buffer.isBuffer(data);
          }
          var encodings = {};
          encodings.utf8 = encodings['utf-8'] = {
            encode: function(data) {
              return isBinary(data) ? data : String(data);
            },
            decode: function(data) {
              return data;
            },
            buffer: false,
            type: 'utf8'
          };
          encodings.json = {
            encode: JSON.stringify,
            decode: JSON.parse,
            buffer: false,
            type: 'json'
          };
          encodings.binary = {
            encode: function(data) {
              return isBinary(data) ? data : new Buffer(data);
            },
            decode: function(data) {
              return data;
            },
            buffer: true,
            type: 'binary'
          };
          encodingNames.forEach(function(type) {
            if (encodings[type])
              return;
            encodings[type] = {
              encode: function(data) {
                return isBinary(data) ? data : new Buffer(data, type);
              },
              decode: function(buffer) {
                return buffer.toString(type);
              },
              buffer: true,
              type: type
            };
          });
          return encodings;
        })();
      }).call(this, _dereq_(8).Buffer);
    }, {"8": 8}],
    37: [function(_dereq_, module, exports) {
      var createError = _dereq_(14).create,
          LevelUPError = createError('LevelUPError'),
          NotFoundError = createError('NotFoundError', LevelUPError);
      NotFoundError.prototype.notFound = true;
      NotFoundError.prototype.status = 404;
      module.exports = {
        LevelUPError: LevelUPError,
        InitializationError: createError('InitializationError', LevelUPError),
        OpenError: createError('OpenError', LevelUPError),
        ReadError: createError('ReadError', LevelUPError),
        WriteError: createError('WriteError', LevelUPError),
        NotFoundError: NotFoundError,
        EncodingError: createError('EncodingError', LevelUPError)
      };
    }, {"14": 14}],
    38: [function(_dereq_, module, exports) {
      var Readable = _dereq_(71).Readable,
          inherits = _dereq_(95).inherits,
          extend = _dereq_(40),
          EncodingError = _dereq_(37).EncodingError,
          util = _dereq_(39);
      function ReadStream(options, makeData) {
        if (!(this instanceof ReadStream))
          return new ReadStream(options, makeData);
        Readable.call(this, {
          objectMode: true,
          highWaterMark: options.highWaterMark
        });
        this._waiting = false;
        this._options = options;
        this._makeData = makeData;
      }
      inherits(ReadStream, Readable);
      ReadStream.prototype.setIterator = function(it) {
        var self = this;
        this._iterator = it;
        if (this._destroyed)
          return it.end(function() {});
        if (this._waiting) {
          this._waiting = false;
          return this._read();
        }
        return this;
      };
      ReadStream.prototype._read = function read() {
        var self = this;
        if (self._destroyed)
          return;
        if (!self._iterator)
          return this._waiting = true;
        self._iterator.next(function(err, key, value) {
          if (err || (key === undefined && value === undefined)) {
            if (!err && !self._destroyed)
              self.push(null);
            return self._cleanup(err);
          }
          try {
            value = self._makeData(key, value);
          } catch (e) {
            return self._cleanup(new EncodingError(e));
          }
          if (!self._destroyed)
            self.push(value);
        });
      };
      ReadStream.prototype._cleanup = function(err) {
        if (this._destroyed)
          return;
        this._destroyed = true;
        var self = this;
        if (err)
          self.emit('error', err);
        if (self._iterator) {
          self._iterator.end(function() {
            self._iterator = null;
            self.emit('close');
          });
        } else {
          self.emit('close');
        }
      };
      ReadStream.prototype.destroy = function() {
        this._cleanup();
      };
      ReadStream.prototype.toString = function() {
        return 'LevelUP.ReadStream';
      };
      module.exports = ReadStream;
    }, {
      "37": 37,
      "39": 39,
      "40": 40,
      "71": 71,
      "95": 95
    }],
    39: [function(_dereq_, module, exports) {
      var extend = _dereq_(40),
          LevelUPError = _dereq_(37).LevelUPError,
          encodings = _dereq_(36),
          defaultOptions = {
            createIfMissing: true,
            errorIfExists: false,
            keyEncoding: 'utf8',
            valueEncoding: 'utf8',
            compression: true
          },
          leveldown,
          encodingOpts = (function() {
            var eo = {};
            for (var e in encodings)
              eo[e] = {valueEncoding: encodings[e]};
            return eo;
          }());
      function copy(srcdb, dstdb, callback) {
        srcdb.readStream().pipe(dstdb.writeStream()).on('close', callback ? callback : function() {}).on('error', callback ? callback : function(err) {
          throw err;
        });
      }
      function getOptions(levelup, options) {
        var s = typeof options == 'string';
        if (!s && options && options.encoding && !options.valueEncoding)
          options.valueEncoding = options.encoding;
        return extend((levelup && levelup.options) || {}, s ? encodingOpts[options] || encodingOpts[defaultOptions.valueEncoding] : options);
      }
      function getLevelDOWN() {
        if (leveldown)
          return leveldown;
        var requiredVersion = _dereq_(41).devDependencies.leveldown,
            missingLevelDOWNError = 'Could not locate LevelDOWN, try `npm install leveldown`',
            leveldownVersion;
        try {
          leveldownVersion = _dereq_(7).version;
        } catch (e) {
          throw new LevelUPError(missingLevelDOWNError);
        }
        if (!_dereq_(7).satisfies(leveldownVersion, requiredVersion)) {
          throw new LevelUPError('Installed version of LevelDOWN (' + leveldownVersion + ') does not match required version (' + requiredVersion + ')');
        }
        try {
          return leveldown = _dereq_(7);
        } catch (e) {
          throw new LevelUPError(missingLevelDOWNError);
        }
      }
      function dispatchError(levelup, error, callback) {
        return typeof callback == 'function' ? callback(error) : levelup.emit('error', error);
      }
      function isDefined(v) {
        return typeof v !== 'undefined';
      }
      module.exports = {
        defaultOptions: defaultOptions,
        copy: copy,
        getOptions: getOptions,
        getLevelDOWN: getLevelDOWN,
        dispatchError: dispatchError,
        isDefined: isDefined
      };
    }, {
      "36": 36,
      "37": 37,
      "40": 40,
      "41": 41,
      "7": 7
    }],
    40: [function(_dereq_, module, exports) {
      module.exports = extend;
      function extend() {
        var target = {};
        for (var i = 0; i < arguments.length; i++) {
          var source = arguments[i];
          for (var key in source) {
            if (source.hasOwnProperty(key)) {
              target[key] = source[key];
            }
          }
        }
        return target;
      }
    }, {}],
    41: [function(_dereq_, module, exports) {
      module.exports = {
        "_args": [["levelup@~0.19.0", "/Users/nolan/workspace/pouchdb/node_modules/level-sublevel"]],
        "_from": "levelup@>=0.19.0 <0.20.0",
        "_id": "levelup@0.19.1",
        "_inCache": true,
        "_installable": true,
        "_location": "/level-sublevel/levelup",
        "_nodeVersion": "5.5.0",
        "_npmUser": {
          "email": "ralphtheninja@riseup.net",
          "name": "ralphtheninja"
        },
        "_npmVersion": "3.3.12",
        "_phantomChildren": {},
        "_requested": {
          "name": "levelup",
          "raw": "levelup@~0.19.0",
          "rawSpec": "~0.19.0",
          "scope": null,
          "spec": ">=0.19.0 <0.20.0",
          "type": "range"
        },
        "_requiredBy": ["/level-sublevel"],
        "_resolved": "https://registry.npmjs.org/levelup/-/levelup-0.19.1.tgz",
        "_shasum": "f3a6a7205272c4b5f35e412ff004a03a0aedf50b",
        "_shrinkwrap": null,
        "_spec": "levelup@~0.19.0",
        "_where": "/Users/nolan/workspace/pouchdb/node_modules/level-sublevel",
        "browser": {
          "leveldown": false,
          "leveldown/package": false,
          "semver": false
        },
        "bugs": {"url": "https://github.com/rvagg/node-levelup/issues"},
        "contributors": [{
          "name": "David Björklund",
          "email": "david.bjorklund@gmail.com",
          "url": "https://github.com/kesla"
        }, {
          "name": "Rod Vagg",
          "email": "r@va.gg",
          "url": "https://github.com/rvagg"
        }, {
          "name": "Jake Verbaten",
          "email": "raynos2@gmail.com",
          "url": "https://github.com/raynos"
        }, {
          "name": "Dominic Tarr",
          "email": "dominic.tarr@gmail.com",
          "url": "https://github.com/dominictarr"
        }, {
          "name": "Max Ogden",
          "email": "max@maxogden.com",
          "url": "https://github.com/maxogden"
        }, {
          "name": "Lars-Magnus Skog",
          "email": "lars.magnus.skog@gmail.com",
          "url": "https://github.com/ralphtheninja"
        }, {
          "name": "John Chesley",
          "email": "john@chesl.es",
          "url": "https://github.com/chesles/"
        }, {
          "name": "Julian Gruber",
          "email": "julian@juliangruber.com",
          "url": "https://github.com/juliangruber"
        }, {
          "name": "Paolo Fragomeni",
          "email": "paolo@async.ly",
          "url": "https://github.com/hij1nx"
        }, {
          "name": "Anton Whalley",
          "email": "anton.whalley@nearform.com",
          "url": "https://github.com/No9"
        }, {
          "name": "Matteo Collina",
          "email": "matteo.collina@gmail.com",
          "url": "https://github.com/mcollina"
        }, {
          "name": "Pedro Teixeira",
          "email": "pedro.teixeira@gmail.com",
          "url": "https://github.com/pgte"
        }, {
          "name": "James Halliday",
          "email": "mail@substack.net",
          "url": "https://github.com/substack"
        }],
        "dependencies": {
          "bl": "~0.8.1",
          "deferred-leveldown": "~0.2.0",
          "errno": "~0.1.1",
          "prr": "~0.0.0",
          "readable-stream": "~1.0.26",
          "semver": "~5.1.0",
          "xtend": "~3.0.0"
        },
        "description": "Fast & simple storage - a Node.js-style LevelDB wrapper",
        "devDependencies": {
          "async": "*",
          "boganipsum": "*",
          "bustermove": "~1.0.1",
          "delayed": "*",
          "du": "*",
          "fstream": "*",
          "leveldown": "~0.10.0",
          "memdown": "^0.11.0",
          "mkfiletree": "*",
          "msgpack-js": "*",
          "readfiletree": "*",
          "referee": "*",
          "rimraf": "*",
          "slow-stream": ">=0.0.4",
          "tap": "2.x.x",
          "tape": "4.x.x",
          "tar": "*"
        },
        "directories": {},
        "dist": {
          "shasum": "f3a6a7205272c4b5f35e412ff004a03a0aedf50b",
          "tarball": "http://registry.npmjs.org/levelup/-/levelup-0.19.1.tgz"
        },
        "gitHead": "2847795d54c6eceb865e2c6b5157bccf68132c55",
        "homepage": "https://github.com/rvagg/node-levelup",
        "keywords": ["database", "db", "json", "leveldb", "storage", "store", "stream"],
        "license": "MIT",
        "main": "lib/levelup.js",
        "maintainers": [{
          "name": "rvagg",
          "email": "rod@vagg.org"
        }, {
          "name": "ralphtheninja",
          "email": "ralphtheninja@riseup.net"
        }, {
          "name": "juliangruber",
          "email": "julian@juliangruber.com"
        }],
        "name": "levelup",
        "optionalDependencies": {},
        "readme": "ERROR: No README data found!",
        "repository": {
          "type": "git",
          "url": "git+https://github.com/rvagg/node-levelup.git"
        },
        "scripts": {
          "alltests": "npm test && npm run-script functionaltests",
          "functionaltests": "node ./test/functional/fstream-test.js && node ./test/functional/binary-data-test.js && node ./test/functional/compat-test.js",
          "test": "tap test/*-test.js"
        },
        "version": "0.19.1"
      };
    }, {}],
    42: [function(_dereq_, module, exports) {
      arguments[4][31][0].apply(exports, arguments);
    }, {"31": 31}],
    43: [function(_dereq_, module, exports) {
      var hooks = _dereq_(33);
      var ltgt = _dereq_(61);
      function isFunction(f) {
        return 'function' === typeof f;
      }
      function getPrefix(db) {
        if (db == null)
          return db;
        if (isFunction(db.prefix))
          return db.prefix();
        return db;
      }
      function has(obj, name) {
        return Object.hasOwnProperty.call(obj, name);
      }
      function clone(_obj) {
        var obj = {};
        for (var k in _obj)
          obj[k] = _obj[k];
        return obj;
      }
      module.exports = function(db, precodec, codec, compare) {
        var prehooks = hooks(compare);
        var posthooks = hooks(compare);
        var waiting = [],
            ready = false;
        function encodePrefix(prefix, key, opts1, opts2) {
          return precodec.encode([prefix, codec.encodeKey(key, opts1, opts2)]);
        }
        function decodePrefix(data) {
          return precodec.decode(data);
        }
        function addEncodings(op, prefix) {
          if (prefix && prefix.options) {
            op.keyEncoding = op.keyEncoding || prefix.options.keyEncoding;
            op.valueEncoding = op.valueEncoding || prefix.options.valueEncoding;
          }
          return op;
        }
        function start() {
          ready = true;
          while (waiting.length)
            waiting.shift()();
        }
        if (isFunction(db.isOpen)) {
          if (db.isOpen())
            ready = true;
          else
            db.open(start);
        } else {
          db.open(start);
        }
        return {
          apply: function(ops, opts, cb) {
            for (var i = 0; i < ops.length; i++) {
              var op = ops[i];
              function add(op) {
                if (op === false)
                  return delete ops[i];
                ops.push(op);
              }
              addEncodings(op, op.prefix);
              op.prefix = getPrefix(op.prefix);
              prehooks.trigger([op.prefix, op.key], [op, add, ops]);
            }
            opts = opts || {};
            if ('object' !== typeof opts)
              throw new Error('opts must be object, was:' + opts);
            if ('function' === typeof opts)
              cb = opts, opts = {};
            if (ops.length)
              (db.db || db).batch(ops.map(function(op) {
                return {
                  key: encodePrefix(op.prefix, op.key, opts, op),
                  value: op.type !== 'del' ? codec.encodeValue(op.value, opts, op) : undefined,
                  type: op.type || (op.value === undefined ? 'del' : 'put')
                };
              }), opts, function(err) {
                if (err)
                  return cb(err);
                ops.forEach(function(op) {
                  posthooks.trigger([op.prefix, op.key], [op]);
                });
                cb();
              });
            else
              cb();
          },
          get: function(key, prefix, opts, cb) {
            opts.asBuffer = codec.isValueAsBuffer(opts);
            return (db.db || db).get(encodePrefix(prefix, key, opts), opts, function(err, value) {
              if (err)
                cb(err);
              else
                cb(null, codec.decodeValue(value, opts));
            });
          },
          pre: prehooks.add,
          post: posthooks.add,
          createDecoder: function(opts) {
            if (opts.keys !== false && opts.values !== false)
              return function(key, value) {
                return {
                  key: codec.decodeKey(precodec.decode(key)[1], opts),
                  value: codec.decodeValue(value, opts)
                };
              };
            if (opts.values !== false)
              return function(_, value) {
                return codec.decodeValue(value, opts);
              };
            if (opts.keys !== false)
              return function(key) {
                return codec.decodeKey(precodec.decode(key)[1], opts);
              };
            return function() {};
          },
          isOpen: function isOpen() {
            if (db.db && isFunction(db.db.isOpen))
              return db.db.isOpen();
            return db.isOpen();
          },
          isClosed: function isClosed() {
            if (db.db && isFunction(db.db.isClosed))
              return db.db.isClosed();
            return db.isClosed();
          },
          close: function close(cb) {
            return db.close(cb);
          },
          iterator: function(_opts, cb) {
            var opts = clone(_opts || {});
            var prefix = _opts.prefix || [];
            function encodeKey(key) {
              return encodePrefix(prefix, key, opts, {});
            }
            ltgt.toLtgt(_opts, opts, encodeKey, precodec.lowerBound, precodec.upperBound);
            opts.prefix = null;
            opts.keyAsBuffer = opts.valueAsBuffer = false;
            if ('number' !== typeof opts.limit)
              opts.limit = -1;
            opts.keyAsBuffer = precodec.buffer;
            opts.valueAsBuffer = codec.isValueAsBuffer(opts);
            function wrapIterator(iterator) {
              return {
                next: function(cb) {
                  return iterator.next(cb);
                },
                end: function(cb) {
                  iterator.end(cb);
                }
              };
            }
            if (ready)
              return wrapIterator((db.db || db).iterator(opts));
            else
              waiting.push(function() {
                cb(null, wrapIterator((db.db || db).iterator(opts)));
              });
          }
        };
      };
    }, {
      "33": 33,
      "61": 61
    }],
    44: [function(_dereq_, module, exports) {
      module.exports = {
        "_args": [["level-sublevel@6.5.4", "/Users/nolan/workspace/pouchdb"]],
        "_from": "level-sublevel@6.5.4",
        "_id": "level-sublevel@6.5.4",
        "_inCache": true,
        "_installable": true,
        "_location": "/level-sublevel",
        "_nodeVersion": "5.3.0",
        "_npmUser": {
          "email": "dominic.tarr@gmail.com",
          "name": "dominictarr"
        },
        "_npmVersion": "3.3.12",
        "_phantomChildren": {
          "bl": "0.8.2",
          "deferred-leveldown": "0.2.0",
          "errno": "0.1.4",
          "prr": "0.0.0",
          "readable-stream": "1.0.33",
          "semver": "5.1.0"
        },
        "_requested": {
          "name": "level-sublevel",
          "raw": "level-sublevel@6.5.4",
          "rawSpec": "6.5.4",
          "scope": null,
          "spec": "6.5.4",
          "type": "version"
        },
        "_requiredBy": ["/"],
        "_resolved": "https://registry.npmjs.org/level-sublevel/-/level-sublevel-6.5.4.tgz",
        "_shasum": "92e6534e7ac3fa35c8bdb121b8a8094a8d1c0826",
        "_shrinkwrap": null,
        "_spec": "level-sublevel@6.5.4",
        "_where": "/Users/nolan/workspace/pouchdb",
        "author": {
          "email": "dominic.tarr@gmail.com",
          "name": "Dominic Tarr",
          "url": "http://dominictarr.com"
        },
        "bugs": {"url": "https://github.com/dominictarr/level-sublevel/issues"},
        "dependencies": {
          "bytewise": "~1.1.0",
          "levelup": "~0.19.0",
          "ltgt": "~2.1.1",
          "pull-stream": "~2.21.0",
          "typewiselite": "~1.0.0",
          "xtend": "~4.0.0"
        },
        "description": "partition levelup databases",
        "devDependencies": {
          "level": "^1.4.0",
          "level-test": "^2.0.1",
          "monotonic-timestamp": "0.0.8",
          "pull-level": "~1.1.1",
          "rimraf": "~2.1.4",
          "shasum": "0.0.2",
          "stream-to-pull-stream": "~1.2.0",
          "tape": "~2.14.0",
          "through": "~2.3.4"
        },
        "directories": {},
        "dist": {
          "shasum": "92e6534e7ac3fa35c8bdb121b8a8094a8d1c0826",
          "tarball": "http://registry.npmjs.org/level-sublevel/-/level-sublevel-6.5.4.tgz"
        },
        "gitHead": "fa1b7121f9632b637e650cc1ec9b1723b60df864",
        "homepage": "https://github.com/dominictarr/level-sublevel",
        "license": "MIT",
        "maintainers": [{
          "name": "dominictarr",
          "email": "dominic.tarr@gmail.com"
        }],
        "name": "level-sublevel",
        "optionalDependencies": {},
        "readme": "ERROR: No README data found!",
        "repository": {
          "type": "git",
          "url": "git://github.com/dominictarr/level-sublevel.git"
        },
        "scripts": {"test": "set -e; for t in test/*.js; do node $t; done"},
        "stability": "unstable",
        "testling": {
          "browsers": ["android-browser/4.2..latest", "chrome/22..latest", "chrome/canary", "firefox/17..latest", "firefox/nightly", "ie/8..latest", "ipad/6.0..latest", "iphone/6.0..latest", "opera/12..latest", "opera/next", "safari/5.1..latest"],
          "files": "test/*.js"
        },
        "version": "6.5.4"
      };
    }, {}],
    45: [function(_dereq_, module, exports) {
      (function(Buffer) {
        var ltgt = _dereq_(61);
        function isArrayLike(a) {
          return Array.isArray(a) || Buffer.isBuffer(a);
        }
        function isPrimitive(a) {
          return 'string' === typeof a || 'number' === typeof a;
        }
        function has(o, k) {
          return Object.hasOwnProperty.call(o, k);
        }
        function compare(a, b) {
          if (isArrayLike(a) && isArrayLike(b)) {
            var l = Math.min(a.length, b.length);
            for (var i = 0; i < l; i++) {
              var c = compare(a[i], b[i]);
              if (c)
                return c;
            }
            return a.length - b.length;
          }
          if (isPrimitive(a) && isPrimitive(b))
            return a < b ? -1 : a > b ? 1 : 0;
          throw new Error('items not comparable:' + JSON.stringify(a) + ' ' + JSON.stringify(b));
        }
        function prefix(a, b) {
          if (a.length > b.length)
            return false;
          var l = a.length - 1;
          var lastA = a[l];
          var lastB = b[l];
          if (typeof lastA !== typeof lastB)
            return false;
          if ('string' == typeof lastA && 0 != lastB.indexOf(lastA))
            return false;
          if (a.length == 1 && isArrayLike(lastA))
            l++;
          while (l--) {
            if (compare(a[l], b[l]))
              return false;
          }
          return true;
        }
        exports = module.exports = function(range, key, _compare) {
          _compare = _compare || compare;
          if (isArrayLike(range))
            return prefix(range, key);
          return ltgt.contains(range, key, _compare);
        };
        function addPrefix(prefix, range) {
          var o = ltgt.toLtgt(range, null, function(key) {
            return [prefix, key];
          });
          if (!has(o, 'gte') && !has(o, 'lte'))
            return [prefix];
          return o;
        }
        exports.compare = compare;
        exports.prefix = prefix;
        exports.addPrefix = addPrefix;
      }).call(this, {"isBuffer": _dereq_(24)});
    }, {
      "24": 24,
      "61": 61
    }],
    46: [function(_dereq_, module, exports) {
      (function(process) {
        var EventEmitter = _dereq_(15).EventEmitter;
        var addpre = _dereq_(45).addPrefix;
        var errors = _dereq_(37);
        function isFunction(f) {
          return 'function' === typeof f;
        }
        function isString(s) {
          return 'string' === typeof s;
        }
        function isObject(o) {
          return o && 'object' === typeof o;
        }
        var version = _dereq_(44).version;
        var sublevel = module.exports = function(nut, prefix, createStream, options) {
          var emitter = new EventEmitter();
          emitter.sublevels = {};
          emitter.options = options;
          emitter.version = version;
          emitter.methods = {};
          prefix = prefix || [];
          function errback(err) {
            if (err)
              emitter.emit('error', err);
          }
          createStream = createStream || function(e) {
            return e;
          };
          function mergeOpts(opts) {
            var o = {};
            if (options)
              for (var k in options)
                if (options[k] != undefined)
                  o[k] = options[k];
            if (opts)
              for (var k in opts)
                if (opts[k] != undefined)
                  o[k] = opts[k];
            return o;
          }
          emitter.put = function(key, value, opts, cb) {
            if ('function' === typeof opts)
              cb = opts, opts = {};
            if (!cb)
              cb = errback;
            nut.apply([{
              key: key,
              value: value,
              prefix: prefix.slice(),
              type: 'put'
            }], mergeOpts(opts), function(err) {
              if (!err) {
                emitter.emit('put', key, value);
                cb(null);
              }
              if (err)
                return cb(err);
            });
          };
          emitter.prefix = function() {
            return prefix.slice();
          };
          emitter.del = function(key, opts, cb) {
            if ('function' === typeof opts)
              cb = opts, opts = {};
            if (!cb)
              cb = errback;
            nut.apply([{
              key: key,
              prefix: prefix.slice(),
              type: 'del'
            }], mergeOpts(opts), function(err) {
              if (!err) {
                emitter.emit('del', key);
                cb(null);
              }
              if (err)
                return cb(err);
            });
          };
          emitter.batch = function(ops, opts, cb) {
            if ('function' === typeof opts)
              cb = opts, opts = {};
            if (!cb)
              cb = errback;
            ops = ops.map(function(op) {
              return {
                key: op.key,
                value: op.value,
                prefix: op.prefix || prefix,
                keyEncoding: op.keyEncoding,
                valueEncoding: op.valueEncoding,
                type: op.type
              };
            });
            nut.apply(ops, mergeOpts(opts), function(err) {
              if (!err) {
                emitter.emit('batch', ops);
                cb(null);
              }
              if (err)
                return cb(err);
            });
          };
          emitter.get = function(key, opts, cb) {
            if ('function' === typeof opts)
              cb = opts, opts = {};
            nut.get(key, prefix, mergeOpts(opts), function(err, value) {
              if (err)
                cb(new errors.NotFoundError('Key not found in database', err));
              else
                cb(null, value);
            });
          };
          emitter.clone = function(opts) {
            return sublevel(nut, prefix, createStream, mergeOpts(opts));
          };
          emitter.sublevel = function(name, opts) {
            return emitter.sublevels[name] = emitter.sublevels[name] || sublevel(nut, prefix.concat(name), createStream, mergeOpts(opts));
          };
          emitter.pre = function(key, hook) {
            if (isFunction(key))
              return nut.pre([prefix], key);
            if (isString(key))
              return nut.pre([prefix, key], hook);
            if (isObject(key))
              return nut.pre(addpre(prefix, key), hook);
            throw new Error('not implemented yet');
          };
          emitter.post = function(key, hook) {
            if (isFunction(key))
              return nut.post([prefix], key);
            if (isString(key))
              return nut.post([prefix, key], hook);
            if (isObject(key))
              return nut.post(addpre(prefix, key), hook);
            throw new Error('not implemented yet');
          };
          emitter.readStream = emitter.createReadStream = function(opts) {
            opts = mergeOpts(opts);
            opts.prefix = prefix;
            var stream;
            var it = nut.iterator(opts, function(err, it) {
              stream.setIterator(it);
            });
            stream = createStream(opts, nut.createDecoder(opts));
            if (it)
              stream.setIterator(it);
            return stream;
          };
          emitter.valueStream = emitter.createValueStream = function(opts) {
            opts = opts || {};
            opts.values = true;
            opts.keys = false;
            return emitter.createReadStream(opts);
          };
          emitter.keyStream = emitter.createKeyStream = function(opts) {
            opts = opts || {};
            opts.values = false;
            opts.keys = true;
            return emitter.createReadStream(opts);
          };
          emitter.close = function(cb) {
            cb = cb || function() {};
            if (!prefix.length)
              nut.close(cb);
            else
              process.nextTick(cb);
          };
          emitter.isOpen = nut.isOpen;
          emitter.isClosed = nut.isClosed;
          return emitter;
        };
      }).call(this, _dereq_(64));
    }, {
      "15": 15,
      "37": 37,
      "44": 44,
      "45": 45,
      "64": 64
    }],
    47: [function(_dereq_, module, exports) {
      var util = _dereq_(49),
          WriteError = _dereq_(29).WriteError,
          getOptions = util.getOptions,
          dispatchError = util.dispatchError;
      function Batch(levelup, codec) {
        this._levelup = levelup;
        this._codec = codec;
        this.batch = levelup.db.batch();
        this.ops = [];
        this.length = 0;
      }
      Batch.prototype.put = function(key_, value_, options) {
        options = getOptions(options);
        var key = this._codec.encodeKey(key_, options),
            value = this._codec.encodeValue(value_, options);
        try {
          this.batch.put(key, value);
        } catch (e) {
          throw new WriteError(e);
        }
        this.ops.push({
          type: 'put',
          key: key,
          value: value
        });
        this.length++;
        return this;
      };
      Batch.prototype.del = function(key_, options) {
        options = getOptions(options);
        var key = this._codec.encodeKey(key_, options);
        try {
          this.batch.del(key);
        } catch (err) {
          throw new WriteError(err);
        }
        this.ops.push({
          type: 'del',
          key: key
        });
        this.length++;
        return this;
      };
      Batch.prototype.clear = function() {
        try {
          this.batch.clear();
        } catch (err) {
          throw new WriteError(err);
        }
        this.ops = [];
        this.length = 0;
        return this;
      };
      Batch.prototype.write = function(callback) {
        var levelup = this._levelup,
            ops = this.ops;
        try {
          this.batch.write(function(err) {
            if (err)
              return dispatchError(levelup, new WriteError(err), callback);
            levelup.emit('batch', ops);
            if (callback)
              callback();
          });
        } catch (err) {
          throw new WriteError(err);
        }
      };
      module.exports = Batch;
    }, {
      "29": 29,
      "49": 49
    }],
    48: [function(_dereq_, module, exports) {
      (function(process) {
        var EventEmitter = _dereq_(15).EventEmitter,
            inherits = _dereq_(95).inherits,
            deprecate = _dereq_(95).deprecate,
            extend = _dereq_(58),
            prr = _dereq_(57),
            DeferredLevelDOWN = _dereq_(56),
            IteratorStream = _dereq_(30),
            errors = _dereq_(29),
            WriteError = errors.WriteError,
            ReadError = errors.ReadError,
            NotFoundError = errors.NotFoundError,
            OpenError = errors.OpenError,
            EncodingError = errors.EncodingError,
            InitializationError = errors.InitializationError,
            util = _dereq_(49),
            Batch = _dereq_(47),
            Codec = _dereq_(27),
            getOptions = util.getOptions,
            defaultOptions = util.defaultOptions,
            getLevelDOWN = util.getLevelDOWN,
            dispatchError = util.dispatchError,
            isDefined = util.isDefined;
        function getCallback(options, callback) {
          return typeof options == 'function' ? options : callback;
        }
        function LevelUP(location, options, callback) {
          if (!(this instanceof LevelUP))
            return new LevelUP(location, options, callback);
          var error;
          EventEmitter.call(this);
          this.setMaxListeners(Infinity);
          if (typeof location == 'function') {
            options = typeof options == 'object' ? options : {};
            options.db = location;
            location = null;
          } else if (typeof location == 'object' && typeof location.db == 'function') {
            options = location;
            location = null;
          }
          if (typeof options == 'function') {
            callback = options;
            options = {};
          }
          if ((!options || typeof options.db != 'function') && typeof location != 'string') {
            error = new InitializationError('Must provide a location for the database');
            if (callback) {
              return process.nextTick(function() {
                callback(error);
              });
            }
            throw error;
          }
          options = getOptions(options);
          this.options = extend(defaultOptions, options);
          this._codec = new Codec(this.options);
          this._status = 'new';
          prr(this, 'location', location, 'e');
          this.open(callback);
        }
        inherits(LevelUP, EventEmitter);
        LevelUP.prototype.open = function(callback) {
          var self = this,
              dbFactory,
              db;
          if (this.isOpen()) {
            if (callback)
              process.nextTick(function() {
                callback(null, self);
              });
            return this;
          }
          if (this._isOpening()) {
            return callback && this.once('open', function() {
              callback(null, self);
            });
          }
          this.emit('opening');
          this._status = 'opening';
          this.db = new DeferredLevelDOWN(this.location);
          dbFactory = this.options.db || getLevelDOWN();
          db = dbFactory(this.location);
          db.open(this.options, function(err) {
            if (err) {
              return dispatchError(self, new OpenError(err), callback);
            } else {
              self.db.setDb(db);
              self.db = db;
              self._status = 'open';
              if (callback)
                callback(null, self);
              self.emit('open');
              self.emit('ready');
            }
          });
        };
        LevelUP.prototype.close = function(callback) {
          var self = this;
          if (this.isOpen()) {
            this._status = 'closing';
            this.db.close(function() {
              self._status = 'closed';
              self.emit('closed');
              if (callback)
                callback.apply(null, arguments);
            });
            this.emit('closing');
            this.db = new DeferredLevelDOWN(this.location);
          } else if (this._status == 'closed' && callback) {
            return process.nextTick(callback);
          } else if (this._status == 'closing' && callback) {
            this.once('closed', callback);
          } else if (this._isOpening()) {
            this.once('open', function() {
              self.close(callback);
            });
          }
        };
        LevelUP.prototype.isOpen = function() {
          return this._status == 'open';
        };
        LevelUP.prototype._isOpening = function() {
          return this._status == 'opening';
        };
        LevelUP.prototype.isClosed = function() {
          return (/^clos/).test(this._status);
        };
        function maybeError(db, options, callback) {
          if (!db._isOpening() && !db.isOpen()) {
            dispatchError(db, new ReadError('Database is not open'), callback);
            return true;
          }
        }
        function writeError(db, message, callback) {
          dispatchError(db, new WriteError(message), callback);
        }
        function readError(db, message, callback) {
          dispatchError(db, new ReadError(message), callback);
        }
        LevelUP.prototype.get = function(key_, options, callback) {
          var self = this,
              key;
          callback = getCallback(options, callback);
          if (maybeError(this, options, callback))
            return;
          if (key_ === null || key_ === undefined || 'function' !== typeof callback)
            return readError(this, 'get() requires key and callback arguments', callback);
          options = util.getOptions(options);
          key = this._codec.encodeKey(key_, options);
          options.asBuffer = this._codec.valueAsBuffer(options);
          this.db.get(key, options, function(err, value) {
            if (err) {
              if ((/notfound/i).test(err) || err.notFound) {
                err = new NotFoundError('Key not found in database [' + key_ + ']', err);
              } else {
                err = new ReadError(err);
              }
              return dispatchError(self, err, callback);
            }
            if (callback) {
              try {
                value = self._codec.decodeValue(value, options);
              } catch (e) {
                return callback(new EncodingError(e));
              }
              callback(null, value);
            }
          });
        };
        LevelUP.prototype.put = function(key_, value_, options, callback) {
          var self = this,
              key,
              value;
          callback = getCallback(options, callback);
          if (key_ === null || key_ === undefined)
            return writeError(this, 'put() requires a key argument', callback);
          if (maybeError(this, options, callback))
            return;
          options = getOptions(options);
          key = this._codec.encodeKey(key_, options);
          value = this._codec.encodeValue(value_, options);
          this.db.put(key, value, options, function(err) {
            if (err) {
              return dispatchError(self, new WriteError(err), callback);
            } else {
              self.emit('put', key_, value_);
              if (callback)
                callback();
            }
          });
        };
        LevelUP.prototype.del = function(key_, options, callback) {
          var self = this,
              key;
          callback = getCallback(options, callback);
          if (key_ === null || key_ === undefined)
            return writeError(this, 'del() requires a key argument', callback);
          if (maybeError(this, options, callback))
            return;
          options = getOptions(options);
          key = this._codec.encodeKey(key_, options);
          this.db.del(key, options, function(err) {
            if (err) {
              return dispatchError(self, new WriteError(err), callback);
            } else {
              self.emit('del', key_);
              if (callback)
                callback();
            }
          });
        };
        LevelUP.prototype.batch = function(arr_, options, callback) {
          var self = this,
              keyEnc,
              valueEnc,
              arr;
          if (!arguments.length)
            return new Batch(this, this._codec);
          callback = getCallback(options, callback);
          if (!Array.isArray(arr_))
            return writeError(this, 'batch() requires an array argument', callback);
          if (maybeError(this, options, callback))
            return;
          options = getOptions(options);
          arr = self._codec.encodeBatch(arr_, options);
          arr = arr.map(function(op) {
            if (!op.type && op.key !== undefined && op.value !== undefined)
              op.type = 'put';
            return op;
          });
          this.db.batch(arr, options, function(err) {
            if (err) {
              return dispatchError(self, new WriteError(err), callback);
            } else {
              self.emit('batch', arr_);
              if (callback)
                callback();
            }
          });
        };
        LevelUP.prototype.approximateSize = deprecate(function(start_, end_, options, callback) {
          var self = this,
              start,
              end;
          callback = getCallback(options, callback);
          options = getOptions(options);
          if (start_ === null || start_ === undefined || end_ === null || end_ === undefined || 'function' !== typeof callback)
            return readError(this, 'approximateSize() requires start, end and callback arguments', callback);
          start = this._codec.encodeKey(start_, options);
          end = this._codec.encodeKey(end_, options);
          this.db.approximateSize(start, end, function(err, size) {
            if (err) {
              return dispatchError(self, new OpenError(err), callback);
            } else if (callback) {
              callback(null, size);
            }
          });
        }, 'db.approximateSize() is deprecated. Use db.db.approximateSize() instead');
        LevelUP.prototype.readStream = LevelUP.prototype.createReadStream = function(options) {
          options = extend({
            keys: true,
            values: true
          }, this.options, options);
          options.keyEncoding = options.keyEncoding;
          options.valueEncoding = options.valueEncoding;
          options = this._codec.encodeLtgt(options);
          options.keyAsBuffer = this._codec.keyAsBuffer(options);
          options.valueAsBuffer = this._codec.valueAsBuffer(options);
          if ('number' !== typeof options.limit)
            options.limit = -1;
          return new IteratorStream(this.db.iterator(options), extend(options, {decoder: this._codec.createStreamDecoder(options)}));
        };
        LevelUP.prototype.keyStream = LevelUP.prototype.createKeyStream = function(options) {
          return this.createReadStream(extend(options, {
            keys: true,
            values: false
          }));
        };
        LevelUP.prototype.valueStream = LevelUP.prototype.createValueStream = function(options) {
          return this.createReadStream(extend(options, {
            keys: false,
            values: true
          }));
        };
        LevelUP.prototype.toString = function() {
          return 'LevelUP';
        };
        function utilStatic(name) {
          return function(location, callback) {
            getLevelDOWN()[name](location, callback || function() {});
          };
        }
        module.exports = LevelUP;
        module.exports.errors = _dereq_(29);
        module.exports.destroy = deprecate(utilStatic('destroy'), 'levelup.destroy() is deprecated. Use leveldown.destroy() instead');
        module.exports.repair = deprecate(utilStatic('repair'), 'levelup.repair() is deprecated. Use leveldown.repair() instead');
      }).call(this, _dereq_(64));
    }, {
      "15": 15,
      "27": 27,
      "29": 29,
      "30": 30,
      "47": 47,
      "49": 49,
      "56": 56,
      "57": 57,
      "58": 58,
      "64": 64,
      "95": 95
    }],
    49: [function(_dereq_, module, exports) {
      var extend = _dereq_(58),
          LevelUPError = _dereq_(29).LevelUPError,
          format = _dereq_(95).format,
          defaultOptions = {
            createIfMissing: true,
            errorIfExists: false,
            keyEncoding: 'utf8',
            valueEncoding: 'utf8',
            compression: true
          },
          leveldown;
      function getOptions(options) {
        if (typeof options == 'string')
          options = {valueEncoding: options};
        if (typeof options != 'object')
          options = {};
        return options;
      }
      function getLevelDOWN() {
        if (leveldown)
          return leveldown;
        var requiredVersion = _dereq_(59).devDependencies.leveldown,
            leveldownVersion;
        try {
          leveldownVersion = _dereq_(7).version;
        } catch (e) {
          throw requireError(e);
        }
        if (!_dereq_(7).satisfies(leveldownVersion, requiredVersion)) {
          throw new LevelUPError('Installed version of LevelDOWN (' + leveldownVersion + ') does not match required version (' + requiredVersion + ')');
        }
        try {
          return leveldown = _dereq_(7);
        } catch (e) {
          throw requireError(e);
        }
      }
      function requireError(e) {
        var template = 'Failed to require LevelDOWN (%s). Try `npm install leveldown` if it\'s missing';
        return new LevelUPError(format(template, e.message));
      }
      function dispatchError(db, error, callback) {
        typeof callback == 'function' ? callback(error) : db.emit('error', error);
      }
      function isDefined(v) {
        return typeof v !== 'undefined';
      }
      module.exports = {
        defaultOptions: defaultOptions,
        getOptions: getOptions,
        getLevelDOWN: getLevelDOWN,
        dispatchError: dispatchError,
        isDefined: isDefined
      };
    }, {
      "29": 29,
      "58": 58,
      "59": 59,
      "7": 7,
      "95": 95
    }],
    50: [function(_dereq_, module, exports) {
      (function(process) {
        function AbstractChainedBatch(db) {
          this._db = db;
          this._operations = [];
          this._written = false;
        }
        AbstractChainedBatch.prototype._checkWritten = function() {
          if (this._written)
            throw new Error('write() already called on this batch');
        };
        AbstractChainedBatch.prototype.put = function(key, value) {
          this._checkWritten();
          var err = this._db._checkKey(key, 'key', this._db._isBuffer);
          if (err)
            throw err;
          if (!this._db._isBuffer(key))
            key = String(key);
          if (!this._db._isBuffer(value))
            value = String(value);
          if (typeof this._put == 'function')
            this._put(key, value);
          else
            this._operations.push({
              type: 'put',
              key: key,
              value: value
            });
          return this;
        };
        AbstractChainedBatch.prototype.del = function(key) {
          this._checkWritten();
          var err = this._db._checkKey(key, 'key', this._db._isBuffer);
          if (err)
            throw err;
          if (!this._db._isBuffer(key))
            key = String(key);
          if (typeof this._del == 'function')
            this._del(key);
          else
            this._operations.push({
              type: 'del',
              key: key
            });
          return this;
        };
        AbstractChainedBatch.prototype.clear = function() {
          this._checkWritten();
          this._operations = [];
          if (typeof this._clear == 'function')
            this._clear();
          return this;
        };
        AbstractChainedBatch.prototype.write = function(options, callback) {
          this._checkWritten();
          if (typeof options == 'function')
            callback = options;
          if (typeof callback != 'function')
            throw new Error('write() requires a callback argument');
          if (typeof options != 'object')
            options = {};
          this._written = true;
          if (typeof this._write == 'function')
            return this._write(callback);
          if (typeof this._db._batch == 'function')
            return this._db._batch(this._operations, options, callback);
          process.nextTick(callback);
        };
        module.exports = AbstractChainedBatch;
      }).call(this, _dereq_(64));
    }, {"64": 64}],
    51: [function(_dereq_, module, exports) {
      arguments[4][3][0].apply(exports, arguments);
    }, {
      "3": 3,
      "64": 64
    }],
    52: [function(_dereq_, module, exports) {
      (function(Buffer, process) {
        var xtend = _dereq_(58),
            AbstractIterator = _dereq_(51),
            AbstractChainedBatch = _dereq_(50);
        function AbstractLevelDOWN(location) {
          if (!arguments.length || location === undefined)
            throw new Error('constructor requires at least a location argument');
          if (typeof location != 'string')
            throw new Error('constructor requires a location string argument');
          this.location = location;
          this.status = 'new';
        }
        AbstractLevelDOWN.prototype.open = function(options, callback) {
          var self = this,
              oldStatus = this.status;
          if (typeof options == 'function')
            callback = options;
          if (typeof callback != 'function')
            throw new Error('open() requires a callback argument');
          if (typeof options != 'object')
            options = {};
          options.createIfMissing = options.createIfMissing != false;
          options.errorIfExists = !!options.errorIfExists;
          if (typeof this._open == 'function') {
            this.status = 'opening';
            this._open(options, function(err) {
              if (err) {
                self.status = oldStatus;
                return callback(err);
              }
              self.status = 'open';
              callback();
            });
          } else {
            this.status = 'open';
            process.nextTick(callback);
          }
        };
        AbstractLevelDOWN.prototype.close = function(callback) {
          var self = this,
              oldStatus = this.status;
          if (typeof callback != 'function')
            throw new Error('close() requires a callback argument');
          if (typeof this._close == 'function') {
            this.status = 'closing';
            this._close(function(err) {
              if (err) {
                self.status = oldStatus;
                return callback(err);
              }
              self.status = 'closed';
              callback();
            });
          } else {
            this.status = 'closed';
            process.nextTick(callback);
          }
        };
        AbstractLevelDOWN.prototype.get = function(key, options, callback) {
          var err;
          if (typeof options == 'function')
            callback = options;
          if (typeof callback != 'function')
            throw new Error('get() requires a callback argument');
          if (err = this._checkKey(key, 'key', this._isBuffer))
            return callback(err);
          if (!this._isBuffer(key))
            key = String(key);
          if (typeof options != 'object')
            options = {};
          options.asBuffer = options.asBuffer != false;
          if (typeof this._get == 'function')
            return this._get(key, options, callback);
          process.nextTick(function() {
            callback(new Error('NotFound'));
          });
        };
        AbstractLevelDOWN.prototype.put = function(key, value, options, callback) {
          var err;
          if (typeof options == 'function')
            callback = options;
          if (typeof callback != 'function')
            throw new Error('put() requires a callback argument');
          if (err = this._checkKey(key, 'key', this._isBuffer))
            return callback(err);
          if (!this._isBuffer(key))
            key = String(key);
          if (value != null && !this._isBuffer(value) && !process.browser)
            value = String(value);
          if (typeof options != 'object')
            options = {};
          if (typeof this._put == 'function')
            return this._put(key, value, options, callback);
          process.nextTick(callback);
        };
        AbstractLevelDOWN.prototype.del = function(key, options, callback) {
          var err;
          if (typeof options == 'function')
            callback = options;
          if (typeof callback != 'function')
            throw new Error('del() requires a callback argument');
          if (err = this._checkKey(key, 'key', this._isBuffer))
            return callback(err);
          if (!this._isBuffer(key))
            key = String(key);
          if (typeof options != 'object')
            options = {};
          if (typeof this._del == 'function')
            return this._del(key, options, callback);
          process.nextTick(callback);
        };
        AbstractLevelDOWN.prototype.batch = function(array, options, callback) {
          if (!arguments.length)
            return this._chainedBatch();
          if (typeof options == 'function')
            callback = options;
          if (typeof array == 'function')
            callback = array;
          if (typeof callback != 'function')
            throw new Error('batch(array) requires a callback argument');
          if (!Array.isArray(array))
            return callback(new Error('batch(array) requires an array argument'));
          if (!options || typeof options != 'object')
            options = {};
          var i = 0,
              l = array.length,
              e,
              err;
          for (; i < l; i++) {
            e = array[i];
            if (typeof e != 'object')
              continue;
            if (err = this._checkKey(e.type, 'type', this._isBuffer))
              return callback(err);
            if (err = this._checkKey(e.key, 'key', this._isBuffer))
              return callback(err);
          }
          if (typeof this._batch == 'function')
            return this._batch(array, options, callback);
          process.nextTick(callback);
        };
        AbstractLevelDOWN.prototype.approximateSize = function(start, end, callback) {
          if (start == null || end == null || typeof start == 'function' || typeof end == 'function') {
            throw new Error('approximateSize() requires valid `start`, `end` and `callback` arguments');
          }
          if (typeof callback != 'function')
            throw new Error('approximateSize() requires a callback argument');
          if (!this._isBuffer(start))
            start = String(start);
          if (!this._isBuffer(end))
            end = String(end);
          if (typeof this._approximateSize == 'function')
            return this._approximateSize(start, end, callback);
          process.nextTick(function() {
            callback(null, 0);
          });
        };
        AbstractLevelDOWN.prototype._setupIteratorOptions = function(options) {
          var self = this;
          options = xtend(options);
          ;
          ['start', 'end', 'gt', 'gte', 'lt', 'lte'].forEach(function(o) {
            if (options[o] && self._isBuffer(options[o]) && options[o].length === 0)
              delete options[o];
          });
          options.reverse = !!options.reverse;
          options.keys = options.keys != false;
          options.values = options.values != false;
          options.limit = 'limit' in options ? options.limit : -1;
          options.keyAsBuffer = options.keyAsBuffer != false;
          options.valueAsBuffer = options.valueAsBuffer != false;
          return options;
        };
        AbstractLevelDOWN.prototype.iterator = function(options) {
          if (typeof options != 'object')
            options = {};
          options = this._setupIteratorOptions(options);
          if (typeof this._iterator == 'function')
            return this._iterator(options);
          return new AbstractIterator(this);
        };
        AbstractLevelDOWN.prototype._chainedBatch = function() {
          return new AbstractChainedBatch(this);
        };
        AbstractLevelDOWN.prototype._isBuffer = function(obj) {
          return Buffer.isBuffer(obj);
        };
        AbstractLevelDOWN.prototype._checkKey = function(obj, type) {
          if (obj === null || obj === undefined)
            return new Error(type + ' cannot be `null` or `undefined`');
          if (this._isBuffer(obj)) {
            if (obj.length === 0)
              return new Error(type + ' cannot be an empty Buffer');
          } else if (String(obj) === '')
            return new Error(type + ' cannot be an empty String');
        };
        module.exports = AbstractLevelDOWN;
      }).call(this, {"isBuffer": _dereq_(24)}, _dereq_(64));
    }, {
      "24": 24,
      "50": 50,
      "51": 51,
      "58": 58,
      "64": 64
    }],
    53: [function(_dereq_, module, exports) {
      exports.AbstractLevelDOWN = _dereq_(52);
      exports.AbstractIterator = _dereq_(51);
      exports.AbstractChainedBatch = _dereq_(50);
      exports.isLevelDOWN = _dereq_(54);
    }, {
      "50": 50,
      "51": 51,
      "52": 52,
      "54": 54
    }],
    54: [function(_dereq_, module, exports) {
      var AbstractLevelDOWN = _dereq_(52);
      function isLevelDOWN(db) {
        if (!db || typeof db !== 'object')
          return false;
        return Object.keys(AbstractLevelDOWN.prototype).filter(function(name) {
          return name[0] != '_' && name != 'approximateSize';
        }).every(function(name) {
          return typeof db[name] == 'function';
        });
      }
      module.exports = isLevelDOWN;
    }, {"52": 52}],
    55: [function(_dereq_, module, exports) {
      var util = _dereq_(95),
          AbstractIterator = _dereq_(53).AbstractIterator;
      function DeferredIterator(options) {
        AbstractIterator.call(this, options);
        this._options = options;
        this._iterator = null;
        this._operations = [];
      }
      util.inherits(DeferredIterator, AbstractIterator);
      DeferredIterator.prototype.setDb = function(db) {
        var it = this._iterator = db.iterator(this._options);
        this._operations.forEach(function(op) {
          it[op.method].apply(it, op.args);
        });
      };
      DeferredIterator.prototype._operation = function(method, args) {
        if (this._iterator)
          return this._iterator[method].apply(this._iterator, args);
        this._operations.push({
          method: method,
          args: args
        });
      };
      'next end'.split(' ').forEach(function(m) {
        DeferredIterator.prototype['_' + m] = function() {
          this._operation(m, arguments);
        };
      });
      module.exports = DeferredIterator;
    }, {
      "53": 53,
      "95": 95
    }],
    56: [function(_dereq_, module, exports) {
      (function(Buffer, process) {
        var util = _dereq_(95),
            AbstractLevelDOWN = _dereq_(53).AbstractLevelDOWN,
            DeferredIterator = _dereq_(55);
        function DeferredLevelDOWN(location) {
          AbstractLevelDOWN.call(this, typeof location == 'string' ? location : '');
          this._db = undefined;
          this._operations = [];
          this._iterators = [];
        }
        util.inherits(DeferredLevelDOWN, AbstractLevelDOWN);
        DeferredLevelDOWN.prototype.setDb = function(db) {
          this._db = db;
          this._operations.forEach(function(op) {
            db[op.method].apply(db, op.args);
          });
          this._iterators.forEach(function(it) {
            it.setDb(db);
          });
        };
        DeferredLevelDOWN.prototype._open = function(options, callback) {
          return process.nextTick(callback);
        };
        DeferredLevelDOWN.prototype._operation = function(method, args) {
          if (this._db)
            return this._db[method].apply(this._db, args);
          this._operations.push({
            method: method,
            args: args
          });
        };
        'put get del batch approximateSize'.split(' ').forEach(function(m) {
          DeferredLevelDOWN.prototype['_' + m] = function() {
            this._operation(m, arguments);
          };
        });
        DeferredLevelDOWN.prototype._isBuffer = function(obj) {
          return Buffer.isBuffer(obj);
        };
        DeferredLevelDOWN.prototype._iterator = function(options) {
          if (this._db)
            return this._db.iterator.apply(this._db, arguments);
          var it = new DeferredIterator(options);
          this._iterators.push(it);
          return it;
        };
        module.exports = DeferredLevelDOWN;
        module.exports.DeferredIterator = DeferredIterator;
      }).call(this, {"isBuffer": _dereq_(24)}, _dereq_(64));
    }, {
      "24": 24,
      "53": 53,
      "55": 55,
      "64": 64,
      "95": 95
    }],
    57: [function(_dereq_, module, exports) {
      (function(name, context, definition) {
        if (typeof module != 'undefined' && module.exports)
          module.exports = definition();
        else
          context[name] = definition();
      })('prr', this, function() {
        var setProperty = typeof Object.defineProperty == 'function' ? function(obj, key, options) {
          Object.defineProperty(obj, key, options);
          return obj;
        } : function(obj, key, options) {
          obj[key] = options.value;
          return obj;
        },
            makeOptions = function(value, options) {
              var oo = typeof options == 'object',
                  os = !oo && typeof options == 'string',
                  op = function(p) {
                    return oo ? !!options[p] : os ? options.indexOf(p[0]) > -1 : false;
                  };
              return {
                enumerable: op('enumerable'),
                configurable: op('configurable'),
                writable: op('writable'),
                value: value
              };
            },
            prr = function(obj, key, value, options) {
              var k;
              options = makeOptions(value, options);
              if (typeof key == 'object') {
                for (k in key) {
                  if (Object.hasOwnProperty.call(key, k)) {
                    options.value = key[k];
                    setProperty(obj, k, options);
                  }
                }
                return obj;
              }
              return setProperty(obj, key, options);
            };
        return prr;
      });
    }, {}],
    58: [function(_dereq_, module, exports) {
      arguments[4][31][0].apply(exports, arguments);
    }, {"31": 31}],
    59: [function(_dereq_, module, exports) {
      module.exports = {
        "_args": [["levelup@1.3.1", "/Users/nolan/workspace/pouchdb"]],
        "_from": "levelup@1.3.1",
        "_id": "levelup@1.3.1",
        "_inCache": true,
        "_installable": true,
        "_location": "/levelup",
        "_nodeVersion": "4.2.2",
        "_npmUser": {
          "email": "ralphtheninja@riseup.net",
          "name": "ralphtheninja"
        },
        "_npmVersion": "3.5.0",
        "_phantomChildren": {},
        "_requested": {
          "name": "levelup",
          "raw": "levelup@1.3.1",
          "rawSpec": "1.3.1",
          "scope": null,
          "spec": "1.3.1",
          "type": "version"
        },
        "_requiredBy": ["/", "/pouchdb"],
        "_resolved": "https://registry.npmjs.org/levelup/-/levelup-1.3.1.tgz",
        "_shasum": "8030758bb1b1dafdb71bfb55fff0caa2740cb846",
        "_shrinkwrap": null,
        "_spec": "levelup@1.3.1",
        "_where": "/Users/nolan/workspace/pouchdb",
        "browser": {
          "leveldown": false,
          "leveldown/package": false,
          "semver": false
        },
        "bugs": {"url": "https://github.com/level/levelup/issues"},
        "contributors": [{
          "name": "Julian Gruber",
          "email": "julian@juliangruber.com",
          "url": "https://github.com/juliangruber"
        }, {
          "name": "Rod Vagg",
          "email": "r@va.gg",
          "url": "https://github.com/rvagg"
        }, {
          "name": "Jake Verbaten",
          "email": "raynos2@gmail.com",
          "url": "https://github.com/raynos"
        }, {
          "name": "Dominic Tarr",
          "email": "dominic.tarr@gmail.com",
          "url": "https://github.com/dominictarr"
        }, {
          "name": "Max Ogden",
          "email": "max@maxogden.com",
          "url": "https://github.com/maxogden"
        }, {
          "name": "Lars-Magnus Skog",
          "email": "ralphtheninja@riseup.net",
          "url": "https://github.com/ralphtheninja"
        }, {
          "name": "David Björklund",
          "email": "david.bjorklund@gmail.com",
          "url": "https://github.com/kesla"
        }, {
          "name": "John Chesley",
          "email": "john@chesl.es",
          "url": "https://github.com/chesles/"
        }, {
          "name": "Paolo Fragomeni",
          "email": "paolo@async.ly",
          "url": "https://github.com/hij1nx"
        }, {
          "name": "Anton Whalley",
          "email": "anton.whalley@nearform.com",
          "url": "https://github.com/No9"
        }, {
          "name": "Matteo Collina",
          "email": "matteo.collina@gmail.com",
          "url": "https://github.com/mcollina"
        }, {
          "name": "Pedro Teixeira",
          "email": "pedro.teixeira@gmail.com",
          "url": "https://github.com/pgte"
        }, {
          "name": "James Halliday",
          "email": "mail@substack.net",
          "url": "https://github.com/substack"
        }, {
          "name": "Jarrett Cruger",
          "email": "jcrugzz@gmail.com",
          "url": "https://github.com/jcrugzz"
        }],
        "dependencies": {
          "deferred-leveldown": "~1.2.1",
          "level-codec": "~6.1.0",
          "level-errors": "~1.0.3",
          "level-iterator-stream": "~1.3.0",
          "prr": "~1.0.1",
          "semver": "~5.1.0",
          "xtend": "~4.0.0"
        },
        "description": "Fast & simple storage - a Node.js-style LevelDB wrapper",
        "devDependencies": {
          "async": "~1.5.0",
          "bustermove": "~1.0.0",
          "delayed": "~1.0.1",
          "faucet": "~0.0.1",
          "leveldown": "^1.1.0",
          "memdown": "~1.1.0",
          "msgpack-js": "~0.3.0",
          "referee": "~1.2.0",
          "rimraf": "~2.4.3",
          "slow-stream": "0.0.4",
          "tap": "~2.3.1",
          "tape": "~4.2.1"
        },
        "directories": {},
        "dist": {
          "shasum": "8030758bb1b1dafdb71bfb55fff0caa2740cb846",
          "tarball": "http://registry.npmjs.org/levelup/-/levelup-1.3.1.tgz"
        },
        "gitHead": "40bd66872974140c79a74d9411b992ddffa926a4",
        "homepage": "https://github.com/level/levelup",
        "keywords": ["database", "db", "json", "leveldb", "storage", "store", "stream"],
        "license": "MIT",
        "main": "lib/levelup.js",
        "maintainers": [{
          "name": "rvagg",
          "email": "rod@vagg.org"
        }, {
          "name": "ralphtheninja",
          "email": "ralphtheninja@riseup.net"
        }, {
          "name": "juliangruber",
          "email": "julian@juliangruber.com"
        }],
        "name": "levelup",
        "optionalDependencies": {},
        "readme": "ERROR: No README data found!",
        "repository": {
          "type": "git",
          "url": "git+https://github.com/level/levelup.git"
        },
        "scripts": {"test": "tape test/*-test.js | faucet"},
        "version": "1.3.1"
      };
    }, {}],
    60: [function(_dereq_, module, exports) {
      'use strict';
      var immediate = _dereq_(22);
      function INTERNAL() {}
      var handlers = {};
      var REJECTED = ['REJECTED'];
      var FULFILLED = ['FULFILLED'];
      var PENDING = ['PENDING'];
      module.exports = exports = Promise;
      function Promise(resolver) {
        if (typeof resolver !== 'function') {
          throw new TypeError('resolver must be a function');
        }
        this.state = PENDING;
        this.queue = [];
        this.outcome = void 0;
        if (resolver !== INTERNAL) {
          safelyResolveThenable(this, resolver);
        }
      }
      Promise.prototype["catch"] = function(onRejected) {
        return this.then(null, onRejected);
      };
      Promise.prototype.then = function(onFulfilled, onRejected) {
        if (typeof onFulfilled !== 'function' && this.state === FULFILLED || typeof onRejected !== 'function' && this.state === REJECTED) {
          return this;
        }
        var promise = new this.constructor(INTERNAL);
        if (this.state !== PENDING) {
          var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
          unwrap(promise, resolver, this.outcome);
        } else {
          this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
        }
        return promise;
      };
      function QueueItem(promise, onFulfilled, onRejected) {
        this.promise = promise;
        if (typeof onFulfilled === 'function') {
          this.onFulfilled = onFulfilled;
          this.callFulfilled = this.otherCallFulfilled;
        }
        if (typeof onRejected === 'function') {
          this.onRejected = onRejected;
          this.callRejected = this.otherCallRejected;
        }
      }
      QueueItem.prototype.callFulfilled = function(value) {
        handlers.resolve(this.promise, value);
      };
      QueueItem.prototype.otherCallFulfilled = function(value) {
        unwrap(this.promise, this.onFulfilled, value);
      };
      QueueItem.prototype.callRejected = function(value) {
        handlers.reject(this.promise, value);
      };
      QueueItem.prototype.otherCallRejected = function(value) {
        unwrap(this.promise, this.onRejected, value);
      };
      function unwrap(promise, func, value) {
        immediate(function() {
          var returnValue;
          try {
            returnValue = func(value);
          } catch (e) {
            return handlers.reject(promise, e);
          }
          if (returnValue === promise) {
            handlers.reject(promise, new TypeError('Cannot resolve promise with itself'));
          } else {
            handlers.resolve(promise, returnValue);
          }
        });
      }
      handlers.resolve = function(self, value) {
        var result = tryCatch(getThen, value);
        if (result.status === 'error') {
          return handlers.reject(self, result.value);
        }
        var thenable = result.value;
        if (thenable) {
          safelyResolveThenable(self, thenable);
        } else {
          self.state = FULFILLED;
          self.outcome = value;
          var i = -1;
          var len = self.queue.length;
          while (++i < len) {
            self.queue[i].callFulfilled(value);
          }
        }
        return self;
      };
      handlers.reject = function(self, error) {
        self.state = REJECTED;
        self.outcome = error;
        var i = -1;
        var len = self.queue.length;
        while (++i < len) {
          self.queue[i].callRejected(error);
        }
        return self;
      };
      function getThen(obj) {
        var then = obj && obj.then;
        if (obj && typeof obj === 'object' && typeof then === 'function') {
          return function appyThen() {
            then.apply(obj, arguments);
          };
        }
      }
      function safelyResolveThenable(self, thenable) {
        var called = false;
        function onError(value) {
          if (called) {
            return;
          }
          called = true;
          handlers.reject(self, value);
        }
        function onSuccess(value) {
          if (called) {
            return;
          }
          called = true;
          handlers.resolve(self, value);
        }
        function tryToUnwrap() {
          thenable(onSuccess, onError);
        }
        var result = tryCatch(tryToUnwrap);
        if (result.status === 'error') {
          onError(result.value);
        }
      }
      function tryCatch(func, value) {
        var out = {};
        try {
          out.value = func(value);
          out.status = 'success';
        } catch (e) {
          out.status = 'error';
          out.value = e;
        }
        return out;
      }
      exports.resolve = resolve;
      function resolve(value) {
        if (value instanceof this) {
          return value;
        }
        return handlers.resolve(new this(INTERNAL), value);
      }
      exports.reject = reject;
      function reject(reason) {
        var promise = new this(INTERNAL);
        return handlers.reject(promise, reason);
      }
      exports.all = all;
      function all(iterable) {
        var self = this;
        if (Object.prototype.toString.call(iterable) !== '[object Array]') {
          return this.reject(new TypeError('must be an array'));
        }
        var len = iterable.length;
        var called = false;
        if (!len) {
          return this.resolve([]);
        }
        var values = new Array(len);
        var resolved = 0;
        var i = -1;
        var promise = new this(INTERNAL);
        while (++i < len) {
          allResolver(iterable[i], i);
        }
        return promise;
        function allResolver(value, i) {
          self.resolve(value).then(resolveFromAll, function(error) {
            if (!called) {
              called = true;
              handlers.reject(promise, error);
            }
          });
          function resolveFromAll(outValue) {
            values[i] = outValue;
            if (++resolved === len && !called) {
              called = true;
              handlers.resolve(promise, values);
            }
          }
        }
      }
      exports.race = race;
      function race(iterable) {
        var self = this;
        if (Object.prototype.toString.call(iterable) !== '[object Array]') {
          return this.reject(new TypeError('must be an array'));
        }
        var len = iterable.length;
        var called = false;
        if (!len) {
          return this.resolve([]);
        }
        var i = -1;
        var promise = new this(INTERNAL);
        while (++i < len) {
          resolver(iterable[i]);
        }
        return promise;
        function resolver(value) {
          self.resolve(value).then(function(response) {
            if (!called) {
              called = true;
              handlers.resolve(promise, response);
            }
          }, function(error) {
            if (!called) {
              called = true;
              handlers.reject(promise, error);
            }
          });
        }
      }
    }, {"22": 22}],
    61: [function(_dereq_, module, exports) {
      (function(Buffer) {
        exports.compare = function(a, b) {
          if (Buffer.isBuffer(a)) {
            var l = Math.min(a.length, b.length);
            for (var i = 0; i < l; i++) {
              var cmp = a[i] - b[i];
              if (cmp)
                return cmp;
            }
            return a.length - b.length;
          }
          return a < b ? -1 : a > b ? 1 : 0;
        };
        function has(obj, key) {
          return Object.hasOwnProperty.call(obj, key);
        }
        function isDef(val) {
          return val !== undefined && val !== '';
        }
        function has(range, name) {
          return Object.hasOwnProperty.call(range, name);
        }
        function hasKey(range, name) {
          return Object.hasOwnProperty.call(range, name) && name;
        }
        var lowerBoundKey = exports.lowerBoundKey = function(range) {
          return (hasKey(range, 'gt') || hasKey(range, 'gte') || hasKey(range, 'min') || (range.reverse ? hasKey(range, 'end') : hasKey(range, 'start')) || undefined);
        };
        var lowerBound = exports.lowerBound = function(range) {
          var k = lowerBoundKey(range);
          return k && range[k];
        };
        exports.lowerBoundInclusive = function(range) {
          return has(range, 'gt') ? false : true;
        };
        exports.upperBoundInclusive = function(range) {
          return has(range, 'lt') || !range.minEx ? false : true;
        };
        var lowerBoundExclusive = exports.lowerBoundExclusive = function(range) {
          return has(range, 'gt') || range.minEx ? true : false;
        };
        var upperBoundExclusive = exports.upperBoundExclusive = function(range) {
          return has(range, 'lt') ? true : false;
        };
        var upperBoundKey = exports.upperBoundKey = function(range) {
          return (hasKey(range, 'lt') || hasKey(range, 'lte') || hasKey(range, 'max') || (range.reverse ? hasKey(range, 'start') : hasKey(range, 'end')) || undefined);
        };
        var upperBound = exports.upperBound = function(range) {
          var k = upperBoundKey(range);
          return k && range[k];
        };
        function id(e) {
          return e;
        }
        exports.toLtgt = function(range, _range, map, lower, upper) {
          _range = _range || {};
          map = map || id;
          var defaults = arguments.length > 3;
          var lb = exports.lowerBoundKey(range);
          var ub = exports.upperBoundKey(range);
          if (lb) {
            if (lb === 'gt')
              _range.gt = map(range.gt, false);
            else
              _range.gte = map(range[lb], false);
          } else if (defaults)
            _range.gte = map(lower, false);
          if (ub) {
            if (ub === 'lt')
              _range.lt = map(range.lt, true);
            else
              _range.lte = map(range[ub], true);
          } else if (defaults)
            _range.lte = map(upper, true);
          if (range.reverse != null)
            _range.reverse = !!range.reverse;
          if (has(_range, 'max'))
            delete _range.max;
          if (has(_range, 'min'))
            delete _range.min;
          if (has(_range, 'start'))
            delete _range.start;
          if (has(_range, 'end'))
            delete _range.end;
          return _range;
        };
        exports.contains = function(range, key, compare) {
          compare = compare || exports.compare;
          var lb = lowerBound(range);
          if (isDef(lb)) {
            var cmp = compare(key, lb);
            if (cmp < 0 || (cmp === 0 && lowerBoundExclusive(range)))
              return false;
          }
          var ub = upperBound(range);
          if (isDef(ub)) {
            var cmp = compare(key, ub);
            if (cmp > 0 || (cmp === 0) && upperBoundExclusive(range))
              return false;
          }
          return true;
        };
        exports.filter = function(range, compare) {
          return function(key) {
            return exports.contains(range, key, compare);
          };
        };
      }).call(this, {"isBuffer": _dereq_(24)});
    }, {"24": 24}],
    62: [function(_dereq_, module, exports) {
      'use strict';
      exports.Map = LazyMap;
      exports.Set = LazySet;
      function LazyMap() {
        this.store = {};
      }
      LazyMap.prototype.mangle = function(key) {
        if (typeof key !== "string") {
          throw new TypeError("key must be a string but Got " + key);
        }
        return '$' + key;
      };
      LazyMap.prototype.unmangle = function(key) {
        return key.substring(1);
      };
      LazyMap.prototype.get = function(key) {
        var mangled = this.mangle(key);
        if (mangled in this.store) {
          return this.store[mangled];
        }
        return void 0;
      };
      LazyMap.prototype.set = function(key, value) {
        var mangled = this.mangle(key);
        this.store[mangled] = value;
        return true;
      };
      LazyMap.prototype.has = function(key) {
        var mangled = this.mangle(key);
        return mangled in this.store;
      };
      LazyMap.prototype.delete = function(key) {
        var mangled = this.mangle(key);
        if (mangled in this.store) {
          delete this.store[mangled];
          return true;
        }
        return false;
      };
      LazyMap.prototype.forEach = function(cb) {
        var keys = Object.keys(this.store);
        for (var i = 0,
            len = keys.length; i < len; i++) {
          var key = keys[i];
          var value = this.store[key];
          key = this.unmangle(key);
          cb(value, key);
        }
      };
      function LazySet(array) {
        this.store = new LazyMap();
        if (array && Array.isArray(array)) {
          for (var i = 0,
              len = array.length; i < len; i++) {
            this.add(array[i]);
          }
        }
      }
      LazySet.prototype.add = function(key) {
        return this.store.set(key, true);
      };
      LazySet.prototype.has = function(key) {
        return this.store.has(key);
      };
      LazySet.prototype.delete = function(key) {
        return this.store.delete(key);
      };
    }, {}],
    63: [function(_dereq_, module, exports) {
      (function(process) {
        'use strict';
        if (!process.version || process.version.indexOf('v0.') === 0 || process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
          module.exports = nextTick;
        } else {
          module.exports = process.nextTick;
        }
        function nextTick(fn) {
          var args = new Array(arguments.length - 1);
          var i = 0;
          while (i < args.length) {
            args[i++] = arguments[i];
          }
          process.nextTick(function afterTick() {
            fn.apply(null, args);
          });
        }
      }).call(this, _dereq_(64));
    }, {"64": 64}],
    64: [function(_dereq_, module, exports) {
      var process = module.exports = {};
      var queue = [];
      var draining = false;
      var currentQueue;
      var queueIndex = -1;
      function cleanUpNextTick() {
        draining = false;
        if (currentQueue.length) {
          queue = currentQueue.concat(queue);
        } else {
          queueIndex = -1;
        }
        if (queue.length) {
          drainQueue();
        }
      }
      function drainQueue() {
        if (draining) {
          return;
        }
        var timeout = setTimeout(cleanUpNextTick);
        draining = true;
        var len = queue.length;
        while (len) {
          currentQueue = queue;
          queue = [];
          while (++queueIndex < len) {
            if (currentQueue) {
              currentQueue[queueIndex].run();
            }
          }
          queueIndex = -1;
          len = queue.length;
        }
        currentQueue = null;
        draining = false;
        clearTimeout(timeout);
      }
      process.nextTick = function(fun) {
        var args = new Array(arguments.length - 1);
        if (arguments.length > 1) {
          for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
          }
        }
        queue.push(new Item(fun, args));
        if (queue.length === 1 && !draining) {
          setTimeout(drainQueue, 0);
        }
      };
      function Item(fun, array) {
        this.fun = fun;
        this.array = array;
      }
      Item.prototype.run = function() {
        this.fun.apply(null, this.array);
      };
      process.title = 'browser';
      process.browser = true;
      process.env = {};
      process.argv = [];
      process.version = '';
      process.versions = {};
      function noop() {}
      process.on = noop;
      process.addListener = noop;
      process.once = noop;
      process.off = noop;
      process.removeListener = noop;
      process.removeAllListeners = noop;
      process.emit = noop;
      process.binding = function(name) {
        throw new Error('process.binding is not supported');
      };
      process.cwd = function() {
        return '/';
      };
      process.chdir = function(dir) {
        throw new Error('process.chdir is not supported');
      };
      process.umask = function() {
        return 0;
      };
    }, {}],
    65: [function(_dereq_, module, exports) {
      arguments[4][57][0].apply(exports, arguments);
    }, {"57": 57}],
    66: [function(_dereq_, module, exports) {
      (function(process) {
        module.exports = Duplex;
        var objectKeys = Object.keys || function(obj) {
          var keys = [];
          for (var key in obj)
            keys.push(key);
          return keys;
        };
        var util = _dereq_(10);
        util.inherits = _dereq_(23);
        var Readable = _dereq_(68);
        var Writable = _dereq_(70);
        util.inherits(Duplex, Readable);
        forEach(objectKeys(Writable.prototype), function(method) {
          if (!Duplex.prototype[method])
            Duplex.prototype[method] = Writable.prototype[method];
        });
        function Duplex(options) {
          if (!(this instanceof Duplex))
            return new Duplex(options);
          Readable.call(this, options);
          Writable.call(this, options);
          if (options && options.readable === false)
            this.readable = false;
          if (options && options.writable === false)
            this.writable = false;
          this.allowHalfOpen = true;
          if (options && options.allowHalfOpen === false)
            this.allowHalfOpen = false;
          this.once('end', onend);
        }
        function onend() {
          if (this.allowHalfOpen || this._writableState.ended)
            return;
          process.nextTick(this.end.bind(this));
        }
        function forEach(xs, f) {
          for (var i = 0,
              l = xs.length; i < l; i++) {
            f(xs[i], i);
          }
        }
      }).call(this, _dereq_(64));
    }, {
      "10": 10,
      "23": 23,
      "64": 64,
      "68": 68,
      "70": 70
    }],
    67: [function(_dereq_, module, exports) {
      module.exports = PassThrough;
      var Transform = _dereq_(69);
      var util = _dereq_(10);
      util.inherits = _dereq_(23);
      util.inherits(PassThrough, Transform);
      function PassThrough(options) {
        if (!(this instanceof PassThrough))
          return new PassThrough(options);
        Transform.call(this, options);
      }
      PassThrough.prototype._transform = function(chunk, encoding, cb) {
        cb(null, chunk);
      };
    }, {
      "10": 10,
      "23": 23,
      "69": 69
    }],
    68: [function(_dereq_, module, exports) {
      (function(process) {
        module.exports = Readable;
        var isArray = _dereq_(25);
        var Buffer = _dereq_(8).Buffer;
        Readable.ReadableState = ReadableState;
        var EE = _dereq_(15).EventEmitter;
        if (!EE.listenerCount)
          EE.listenerCount = function(emitter, type) {
            return emitter.listeners(type).length;
          };
        var Stream = _dereq_(73);
        var util = _dereq_(10);
        util.inherits = _dereq_(23);
        var StringDecoder;
        util.inherits(Readable, Stream);
        function ReadableState(options, stream) {
          options = options || {};
          var hwm = options.highWaterMark;
          this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;
          this.highWaterMark = ~~this.highWaterMark;
          this.buffer = [];
          this.length = 0;
          this.pipes = null;
          this.pipesCount = 0;
          this.flowing = false;
          this.ended = false;
          this.endEmitted = false;
          this.reading = false;
          this.calledRead = false;
          this.sync = true;
          this.needReadable = false;
          this.emittedReadable = false;
          this.readableListening = false;
          this.objectMode = !!options.objectMode;
          this.defaultEncoding = options.defaultEncoding || 'utf8';
          this.ranOut = false;
          this.awaitDrain = 0;
          this.readingMore = false;
          this.decoder = null;
          this.encoding = null;
          if (options.encoding) {
            if (!StringDecoder)
              StringDecoder = _dereq_(84).StringDecoder;
            this.decoder = new StringDecoder(options.encoding);
            this.encoding = options.encoding;
          }
        }
        function Readable(options) {
          if (!(this instanceof Readable))
            return new Readable(options);
          this._readableState = new ReadableState(options, this);
          this.readable = true;
          Stream.call(this);
        }
        Readable.prototype.push = function(chunk, encoding) {
          var state = this._readableState;
          if (typeof chunk === 'string' && !state.objectMode) {
            encoding = encoding || state.defaultEncoding;
            if (encoding !== state.encoding) {
              chunk = new Buffer(chunk, encoding);
              encoding = '';
            }
          }
          return readableAddChunk(this, state, chunk, encoding, false);
        };
        Readable.prototype.unshift = function(chunk) {
          var state = this._readableState;
          return readableAddChunk(this, state, chunk, '', true);
        };
        function readableAddChunk(stream, state, chunk, encoding, addToFront) {
          var er = chunkInvalid(state, chunk);
          if (er) {
            stream.emit('error', er);
          } else if (chunk === null || chunk === undefined) {
            state.reading = false;
            if (!state.ended)
              onEofChunk(stream, state);
          } else if (state.objectMode || chunk && chunk.length > 0) {
            if (state.ended && !addToFront) {
              var e = new Error('stream.push() after EOF');
              stream.emit('error', e);
            } else if (state.endEmitted && addToFront) {
              var e = new Error('stream.unshift() after end event');
              stream.emit('error', e);
            } else {
              if (state.decoder && !addToFront && !encoding)
                chunk = state.decoder.write(chunk);
              state.length += state.objectMode ? 1 : chunk.length;
              if (addToFront) {
                state.buffer.unshift(chunk);
              } else {
                state.reading = false;
                state.buffer.push(chunk);
              }
              if (state.needReadable)
                emitReadable(stream);
              maybeReadMore(stream, state);
            }
          } else if (!addToFront) {
            state.reading = false;
          }
          return needMoreData(state);
        }
        function needMoreData(state) {
          return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
        }
        Readable.prototype.setEncoding = function(enc) {
          if (!StringDecoder)
            StringDecoder = _dereq_(84).StringDecoder;
          this._readableState.decoder = new StringDecoder(enc);
          this._readableState.encoding = enc;
        };
        var MAX_HWM = 0x800000;
        function roundUpToNextPowerOf2(n) {
          if (n >= MAX_HWM) {
            n = MAX_HWM;
          } else {
            n--;
            for (var p = 1; p < 32; p <<= 1)
              n |= n >> p;
            n++;
          }
          return n;
        }
        function howMuchToRead(n, state) {
          if (state.length === 0 && state.ended)
            return 0;
          if (state.objectMode)
            return n === 0 ? 0 : 1;
          if (n === null || isNaN(n)) {
            if (state.flowing && state.buffer.length)
              return state.buffer[0].length;
            else
              return state.length;
          }
          if (n <= 0)
            return 0;
          if (n > state.highWaterMark)
            state.highWaterMark = roundUpToNextPowerOf2(n);
          if (n > state.length) {
            if (!state.ended) {
              state.needReadable = true;
              return 0;
            } else
              return state.length;
          }
          return n;
        }
        Readable.prototype.read = function(n) {
          var state = this._readableState;
          state.calledRead = true;
          var nOrig = n;
          var ret;
          if (typeof n !== 'number' || n > 0)
            state.emittedReadable = false;
          if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
            emitReadable(this);
            return null;
          }
          n = howMuchToRead(n, state);
          if (n === 0 && state.ended) {
            ret = null;
            if (state.length > 0 && state.decoder) {
              ret = fromList(n, state);
              state.length -= ret.length;
            }
            if (state.length === 0)
              endReadable(this);
            return ret;
          }
          var doRead = state.needReadable;
          if (state.length - n <= state.highWaterMark)
            doRead = true;
          if (state.ended || state.reading)
            doRead = false;
          if (doRead) {
            state.reading = true;
            state.sync = true;
            if (state.length === 0)
              state.needReadable = true;
            this._read(state.highWaterMark);
            state.sync = false;
          }
          if (doRead && !state.reading)
            n = howMuchToRead(nOrig, state);
          if (n > 0)
            ret = fromList(n, state);
          else
            ret = null;
          if (ret === null) {
            state.needReadable = true;
            n = 0;
          }
          state.length -= n;
          if (state.length === 0 && !state.ended)
            state.needReadable = true;
          if (state.ended && !state.endEmitted && state.length === 0)
            endReadable(this);
          return ret;
        };
        function chunkInvalid(state, chunk) {
          var er = null;
          if (!Buffer.isBuffer(chunk) && 'string' !== typeof chunk && chunk !== null && chunk !== undefined && !state.objectMode) {
            er = new TypeError('Invalid non-string/buffer chunk');
          }
          return er;
        }
        function onEofChunk(stream, state) {
          if (state.decoder && !state.ended) {
            var chunk = state.decoder.end();
            if (chunk && chunk.length) {
              state.buffer.push(chunk);
              state.length += state.objectMode ? 1 : chunk.length;
            }
          }
          state.ended = true;
          if (state.length > 0)
            emitReadable(stream);
          else
            endReadable(stream);
        }
        function emitReadable(stream) {
          var state = stream._readableState;
          state.needReadable = false;
          if (state.emittedReadable)
            return;
          state.emittedReadable = true;
          if (state.sync)
            process.nextTick(function() {
              emitReadable_(stream);
            });
          else
            emitReadable_(stream);
        }
        function emitReadable_(stream) {
          stream.emit('readable');
        }
        function maybeReadMore(stream, state) {
          if (!state.readingMore) {
            state.readingMore = true;
            process.nextTick(function() {
              maybeReadMore_(stream, state);
            });
          }
        }
        function maybeReadMore_(stream, state) {
          var len = state.length;
          while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
            stream.read(0);
            if (len === state.length)
              break;
            else
              len = state.length;
          }
          state.readingMore = false;
        }
        Readable.prototype._read = function(n) {
          this.emit('error', new Error('not implemented'));
        };
        Readable.prototype.pipe = function(dest, pipeOpts) {
          var src = this;
          var state = this._readableState;
          switch (state.pipesCount) {
            case 0:
              state.pipes = dest;
              break;
            case 1:
              state.pipes = [state.pipes, dest];
              break;
            default:
              state.pipes.push(dest);
              break;
          }
          state.pipesCount += 1;
          var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
          var endFn = doEnd ? onend : cleanup;
          if (state.endEmitted)
            process.nextTick(endFn);
          else
            src.once('end', endFn);
          dest.on('unpipe', onunpipe);
          function onunpipe(readable) {
            if (readable !== src)
              return;
            cleanup();
          }
          function onend() {
            dest.end();
          }
          var ondrain = pipeOnDrain(src);
          dest.on('drain', ondrain);
          function cleanup() {
            dest.removeListener('close', onclose);
            dest.removeListener('finish', onfinish);
            dest.removeListener('drain', ondrain);
            dest.removeListener('error', onerror);
            dest.removeListener('unpipe', onunpipe);
            src.removeListener('end', onend);
            src.removeListener('end', cleanup);
            if (!dest._writableState || dest._writableState.needDrain)
              ondrain();
          }
          function onerror(er) {
            unpipe();
            dest.removeListener('error', onerror);
            if (EE.listenerCount(dest, 'error') === 0)
              dest.emit('error', er);
          }
          if (!dest._events || !dest._events.error)
            dest.on('error', onerror);
          else if (isArray(dest._events.error))
            dest._events.error.unshift(onerror);
          else
            dest._events.error = [onerror, dest._events.error];
          function onclose() {
            dest.removeListener('finish', onfinish);
            unpipe();
          }
          dest.once('close', onclose);
          function onfinish() {
            dest.removeListener('close', onclose);
            unpipe();
          }
          dest.once('finish', onfinish);
          function unpipe() {
            src.unpipe(dest);
          }
          dest.emit('pipe', src);
          if (!state.flowing) {
            this.on('readable', pipeOnReadable);
            state.flowing = true;
            process.nextTick(function() {
              flow(src);
            });
          }
          return dest;
        };
        function pipeOnDrain(src) {
          return function() {
            var dest = this;
            var state = src._readableState;
            state.awaitDrain--;
            if (state.awaitDrain === 0)
              flow(src);
          };
        }
        function flow(src) {
          var state = src._readableState;
          var chunk;
          state.awaitDrain = 0;
          function write(dest, i, list) {
            var written = dest.write(chunk);
            if (false === written) {
              state.awaitDrain++;
            }
          }
          while (state.pipesCount && null !== (chunk = src.read())) {
            if (state.pipesCount === 1)
              write(state.pipes, 0, null);
            else
              forEach(state.pipes, write);
            src.emit('data', chunk);
            if (state.awaitDrain > 0)
              return;
          }
          if (state.pipesCount === 0) {
            state.flowing = false;
            if (EE.listenerCount(src, 'data') > 0)
              emitDataEvents(src);
            return;
          }
          state.ranOut = true;
        }
        function pipeOnReadable() {
          if (this._readableState.ranOut) {
            this._readableState.ranOut = false;
            flow(this);
          }
        }
        Readable.prototype.unpipe = function(dest) {
          var state = this._readableState;
          if (state.pipesCount === 0)
            return this;
          if (state.pipesCount === 1) {
            if (dest && dest !== state.pipes)
              return this;
            if (!dest)
              dest = state.pipes;
            state.pipes = null;
            state.pipesCount = 0;
            this.removeListener('readable', pipeOnReadable);
            state.flowing = false;
            if (dest)
              dest.emit('unpipe', this);
            return this;
          }
          if (!dest) {
            var dests = state.pipes;
            var len = state.pipesCount;
            state.pipes = null;
            state.pipesCount = 0;
            this.removeListener('readable', pipeOnReadable);
            state.flowing = false;
            for (var i = 0; i < len; i++)
              dests[i].emit('unpipe', this);
            return this;
          }
          var i = indexOf(state.pipes, dest);
          if (i === -1)
            return this;
          state.pipes.splice(i, 1);
          state.pipesCount -= 1;
          if (state.pipesCount === 1)
            state.pipes = state.pipes[0];
          dest.emit('unpipe', this);
          return this;
        };
        Readable.prototype.on = function(ev, fn) {
          var res = Stream.prototype.on.call(this, ev, fn);
          if (ev === 'data' && !this._readableState.flowing)
            emitDataEvents(this);
          if (ev === 'readable' && this.readable) {
            var state = this._readableState;
            if (!state.readableListening) {
              state.readableListening = true;
              state.emittedReadable = false;
              state.needReadable = true;
              if (!state.reading) {
                this.read(0);
              } else if (state.length) {
                emitReadable(this, state);
              }
            }
          }
          return res;
        };
        Readable.prototype.addListener = Readable.prototype.on;
        Readable.prototype.resume = function() {
          emitDataEvents(this);
          this.read(0);
          this.emit('resume');
        };
        Readable.prototype.pause = function() {
          emitDataEvents(this, true);
          this.emit('pause');
        };
        function emitDataEvents(stream, startPaused) {
          var state = stream._readableState;
          if (state.flowing) {
            throw new Error('Cannot switch to old mode now.');
          }
          var paused = startPaused || false;
          var readable = false;
          stream.readable = true;
          stream.pipe = Stream.prototype.pipe;
          stream.on = stream.addListener = Stream.prototype.on;
          stream.on('readable', function() {
            readable = true;
            var c;
            while (!paused && (null !== (c = stream.read())))
              stream.emit('data', c);
            if (c === null) {
              readable = false;
              stream._readableState.needReadable = true;
            }
          });
          stream.pause = function() {
            paused = true;
            this.emit('pause');
          };
          stream.resume = function() {
            paused = false;
            if (readable)
              process.nextTick(function() {
                stream.emit('readable');
              });
            else
              this.read(0);
            this.emit('resume');
          };
          stream.emit('readable');
        }
        Readable.prototype.wrap = function(stream) {
          var state = this._readableState;
          var paused = false;
          var self = this;
          stream.on('end', function() {
            if (state.decoder && !state.ended) {
              var chunk = state.decoder.end();
              if (chunk && chunk.length)
                self.push(chunk);
            }
            self.push(null);
          });
          stream.on('data', function(chunk) {
            if (state.decoder)
              chunk = state.decoder.write(chunk);
            if (state.objectMode && (chunk === null || chunk === undefined))
              return;
            else if (!state.objectMode && (!chunk || !chunk.length))
              return;
            var ret = self.push(chunk);
            if (!ret) {
              paused = true;
              stream.pause();
            }
          });
          for (var i in stream) {
            if (typeof stream[i] === 'function' && typeof this[i] === 'undefined') {
              this[i] = function(method) {
                return function() {
                  return stream[method].apply(stream, arguments);
                };
              }(i);
            }
          }
          var events = ['error', 'close', 'destroy', 'pause', 'resume'];
          forEach(events, function(ev) {
            stream.on(ev, self.emit.bind(self, ev));
          });
          self._read = function(n) {
            if (paused) {
              paused = false;
              stream.resume();
            }
          };
          return self;
        };
        Readable._fromList = fromList;
        function fromList(n, state) {
          var list = state.buffer;
          var length = state.length;
          var stringMode = !!state.decoder;
          var objectMode = !!state.objectMode;
          var ret;
          if (list.length === 0)
            return null;
          if (length === 0)
            ret = null;
          else if (objectMode)
            ret = list.shift();
          else if (!n || n >= length) {
            if (stringMode)
              ret = list.join('');
            else
              ret = Buffer.concat(list, length);
            list.length = 0;
          } else {
            if (n < list[0].length) {
              var buf = list[0];
              ret = buf.slice(0, n);
              list[0] = buf.slice(n);
            } else if (n === list[0].length) {
              ret = list.shift();
            } else {
              if (stringMode)
                ret = '';
              else
                ret = new Buffer(n);
              var c = 0;
              for (var i = 0,
                  l = list.length; i < l && c < n; i++) {
                var buf = list[0];
                var cpy = Math.min(n - c, buf.length);
                if (stringMode)
                  ret += buf.slice(0, cpy);
                else
                  buf.copy(ret, c, 0, cpy);
                if (cpy < buf.length)
                  list[0] = buf.slice(cpy);
                else
                  list.shift();
                c += cpy;
              }
            }
          }
          return ret;
        }
        function endReadable(stream) {
          var state = stream._readableState;
          if (state.length > 0)
            throw new Error('endReadable called on non-empty stream');
          if (!state.endEmitted && state.calledRead) {
            state.ended = true;
            process.nextTick(function() {
              if (!state.endEmitted && state.length === 0) {
                state.endEmitted = true;
                stream.readable = false;
                stream.emit('end');
              }
            });
          }
        }
        function forEach(xs, f) {
          for (var i = 0,
              l = xs.length; i < l; i++) {
            f(xs[i], i);
          }
        }
        function indexOf(xs, x) {
          for (var i = 0,
              l = xs.length; i < l; i++) {
            if (xs[i] === x)
              return i;
          }
          return -1;
        }
      }).call(this, _dereq_(64));
    }, {
      "10": 10,
      "15": 15,
      "23": 23,
      "25": 25,
      "64": 64,
      "73": 73,
      "8": 8,
      "84": 84
    }],
    69: [function(_dereq_, module, exports) {
      module.exports = Transform;
      var Duplex = _dereq_(66);
      var util = _dereq_(10);
      util.inherits = _dereq_(23);
      util.inherits(Transform, Duplex);
      function TransformState(options, stream) {
        this.afterTransform = function(er, data) {
          return afterTransform(stream, er, data);
        };
        this.needTransform = false;
        this.transforming = false;
        this.writecb = null;
        this.writechunk = null;
      }
      function afterTransform(stream, er, data) {
        var ts = stream._transformState;
        ts.transforming = false;
        var cb = ts.writecb;
        if (!cb)
          return stream.emit('error', new Error('no writecb in Transform class'));
        ts.writechunk = null;
        ts.writecb = null;
        if (data !== null && data !== undefined)
          stream.push(data);
        if (cb)
          cb(er);
        var rs = stream._readableState;
        rs.reading = false;
        if (rs.needReadable || rs.length < rs.highWaterMark) {
          stream._read(rs.highWaterMark);
        }
      }
      function Transform(options) {
        if (!(this instanceof Transform))
          return new Transform(options);
        Duplex.call(this, options);
        var ts = this._transformState = new TransformState(options, this);
        var stream = this;
        this._readableState.needReadable = true;
        this._readableState.sync = false;
        this.once('finish', function() {
          if ('function' === typeof this._flush)
            this._flush(function(er) {
              done(stream, er);
            });
          else
            done(stream);
        });
      }
      Transform.prototype.push = function(chunk, encoding) {
        this._transformState.needTransform = false;
        return Duplex.prototype.push.call(this, chunk, encoding);
      };
      Transform.prototype._transform = function(chunk, encoding, cb) {
        throw new Error('not implemented');
      };
      Transform.prototype._write = function(chunk, encoding, cb) {
        var ts = this._transformState;
        ts.writecb = cb;
        ts.writechunk = chunk;
        ts.writeencoding = encoding;
        if (!ts.transforming) {
          var rs = this._readableState;
          if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark)
            this._read(rs.highWaterMark);
        }
      };
      Transform.prototype._read = function(n) {
        var ts = this._transformState;
        if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
          ts.transforming = true;
          this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
        } else {
          ts.needTransform = true;
        }
      };
      function done(stream, er) {
        if (er)
          return stream.emit('error', er);
        var ws = stream._writableState;
        var rs = stream._readableState;
        var ts = stream._transformState;
        if (ws.length)
          throw new Error('calling transform done when ws.length != 0');
        if (ts.transforming)
          throw new Error('calling transform done when still transforming');
        return stream.push(null);
      }
    }, {
      "10": 10,
      "23": 23,
      "66": 66
    }],
    70: [function(_dereq_, module, exports) {
      (function(process) {
        module.exports = Writable;
        var Buffer = _dereq_(8).Buffer;
        Writable.WritableState = WritableState;
        var util = _dereq_(10);
        util.inherits = _dereq_(23);
        var Stream = _dereq_(73);
        util.inherits(Writable, Stream);
        function WriteReq(chunk, encoding, cb) {
          this.chunk = chunk;
          this.encoding = encoding;
          this.callback = cb;
        }
        function WritableState(options, stream) {
          options = options || {};
          var hwm = options.highWaterMark;
          this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;
          this.objectMode = !!options.objectMode;
          this.highWaterMark = ~~this.highWaterMark;
          this.needDrain = false;
          this.ending = false;
          this.ended = false;
          this.finished = false;
          var noDecode = options.decodeStrings === false;
          this.decodeStrings = !noDecode;
          this.defaultEncoding = options.defaultEncoding || 'utf8';
          this.length = 0;
          this.writing = false;
          this.sync = true;
          this.bufferProcessing = false;
          this.onwrite = function(er) {
            onwrite(stream, er);
          };
          this.writecb = null;
          this.writelen = 0;
          this.buffer = [];
          this.errorEmitted = false;
        }
        function Writable(options) {
          var Duplex = _dereq_(66);
          if (!(this instanceof Writable) && !(this instanceof Duplex))
            return new Writable(options);
          this._writableState = new WritableState(options, this);
          this.writable = true;
          Stream.call(this);
        }
        Writable.prototype.pipe = function() {
          this.emit('error', new Error('Cannot pipe. Not readable.'));
        };
        function writeAfterEnd(stream, state, cb) {
          var er = new Error('write after end');
          stream.emit('error', er);
          process.nextTick(function() {
            cb(er);
          });
        }
        function validChunk(stream, state, chunk, cb) {
          var valid = true;
          if (!Buffer.isBuffer(chunk) && 'string' !== typeof chunk && chunk !== null && chunk !== undefined && !state.objectMode) {
            var er = new TypeError('Invalid non-string/buffer chunk');
            stream.emit('error', er);
            process.nextTick(function() {
              cb(er);
            });
            valid = false;
          }
          return valid;
        }
        Writable.prototype.write = function(chunk, encoding, cb) {
          var state = this._writableState;
          var ret = false;
          if (typeof encoding === 'function') {
            cb = encoding;
            encoding = null;
          }
          if (Buffer.isBuffer(chunk))
            encoding = 'buffer';
          else if (!encoding)
            encoding = state.defaultEncoding;
          if (typeof cb !== 'function')
            cb = function() {};
          if (state.ended)
            writeAfterEnd(this, state, cb);
          else if (validChunk(this, state, chunk, cb))
            ret = writeOrBuffer(this, state, chunk, encoding, cb);
          return ret;
        };
        function decodeChunk(state, chunk, encoding) {
          if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
            chunk = new Buffer(chunk, encoding);
          }
          return chunk;
        }
        function writeOrBuffer(stream, state, chunk, encoding, cb) {
          chunk = decodeChunk(state, chunk, encoding);
          if (Buffer.isBuffer(chunk))
            encoding = 'buffer';
          var len = state.objectMode ? 1 : chunk.length;
          state.length += len;
          var ret = state.length < state.highWaterMark;
          if (!ret)
            state.needDrain = true;
          if (state.writing)
            state.buffer.push(new WriteReq(chunk, encoding, cb));
          else
            doWrite(stream, state, len, chunk, encoding, cb);
          return ret;
        }
        function doWrite(stream, state, len, chunk, encoding, cb) {
          state.writelen = len;
          state.writecb = cb;
          state.writing = true;
          state.sync = true;
          stream._write(chunk, encoding, state.onwrite);
          state.sync = false;
        }
        function onwriteError(stream, state, sync, er, cb) {
          if (sync)
            process.nextTick(function() {
              cb(er);
            });
          else
            cb(er);
          stream._writableState.errorEmitted = true;
          stream.emit('error', er);
        }
        function onwriteStateUpdate(state) {
          state.writing = false;
          state.writecb = null;
          state.length -= state.writelen;
          state.writelen = 0;
        }
        function onwrite(stream, er) {
          var state = stream._writableState;
          var sync = state.sync;
          var cb = state.writecb;
          onwriteStateUpdate(state);
          if (er)
            onwriteError(stream, state, sync, er, cb);
          else {
            var finished = needFinish(stream, state);
            if (!finished && !state.bufferProcessing && state.buffer.length)
              clearBuffer(stream, state);
            if (sync) {
              process.nextTick(function() {
                afterWrite(stream, state, finished, cb);
              });
            } else {
              afterWrite(stream, state, finished, cb);
            }
          }
        }
        function afterWrite(stream, state, finished, cb) {
          if (!finished)
            onwriteDrain(stream, state);
          cb();
          if (finished)
            finishMaybe(stream, state);
        }
        function onwriteDrain(stream, state) {
          if (state.length === 0 && state.needDrain) {
            state.needDrain = false;
            stream.emit('drain');
          }
        }
        function clearBuffer(stream, state) {
          state.bufferProcessing = true;
          for (var c = 0; c < state.buffer.length; c++) {
            var entry = state.buffer[c];
            var chunk = entry.chunk;
            var encoding = entry.encoding;
            var cb = entry.callback;
            var len = state.objectMode ? 1 : chunk.length;
            doWrite(stream, state, len, chunk, encoding, cb);
            if (state.writing) {
              c++;
              break;
            }
          }
          state.bufferProcessing = false;
          if (c < state.buffer.length)
            state.buffer = state.buffer.slice(c);
          else
            state.buffer.length = 0;
        }
        Writable.prototype._write = function(chunk, encoding, cb) {
          cb(new Error('not implemented'));
        };
        Writable.prototype.end = function(chunk, encoding, cb) {
          var state = this._writableState;
          if (typeof chunk === 'function') {
            cb = chunk;
            chunk = null;
            encoding = null;
          } else if (typeof encoding === 'function') {
            cb = encoding;
            encoding = null;
          }
          if (typeof chunk !== 'undefined' && chunk !== null)
            this.write(chunk, encoding);
          if (!state.ending && !state.finished)
            endWritable(this, state, cb);
        };
        function needFinish(stream, state) {
          return (state.ending && state.length === 0 && !state.finished && !state.writing);
        }
        function finishMaybe(stream, state) {
          var need = needFinish(stream, state);
          if (need) {
            state.finished = true;
            stream.emit('finish');
          }
          return need;
        }
        function endWritable(stream, state, cb) {
          state.ending = true;
          finishMaybe(stream, state);
          if (cb) {
            if (state.finished)
              process.nextTick(cb);
            else
              stream.once('finish', cb);
          }
          state.ended = true;
        }
      }).call(this, _dereq_(64));
    }, {
      "10": 10,
      "23": 23,
      "64": 64,
      "66": 66,
      "73": 73,
      "8": 8
    }],
    71: [function(_dereq_, module, exports) {
      var Stream = _dereq_(73);
      exports = module.exports = _dereq_(68);
      exports.Stream = Stream;
      exports.Readable = exports;
      exports.Writable = _dereq_(70);
      exports.Duplex = _dereq_(66);
      exports.Transform = _dereq_(69);
      exports.PassThrough = _dereq_(67);
    }, {
      "66": 66,
      "67": 67,
      "68": 68,
      "69": 69,
      "70": 70,
      "73": 73
    }],
    72: [function(_dereq_, module, exports) {
      (function(factory) {
        if (typeof exports === 'object') {
          module.exports = factory();
        } else if (typeof define === 'function' && define.amd) {
          define(factory);
        } else {
          var glob;
          try {
            glob = window;
          } catch (e) {
            glob = self;
          }
          glob.SparkMD5 = factory();
        }
      }(function(undefined) {
        'use strict';
        var add32 = function(a, b) {
          return (a + b) & 0xFFFFFFFF;
        },
            hex_chr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
        function cmn(q, a, b, x, s, t) {
          a = add32(add32(a, q), add32(x, t));
          return add32((a << s) | (a >>> (32 - s)), b);
        }
        function ff(a, b, c, d, x, s, t) {
          return cmn((b & c) | ((~b) & d), a, b, x, s, t);
        }
        function gg(a, b, c, d, x, s, t) {
          return cmn((b & d) | (c & (~d)), a, b, x, s, t);
        }
        function hh(a, b, c, d, x, s, t) {
          return cmn(b ^ c ^ d, a, b, x, s, t);
        }
        function ii(a, b, c, d, x, s, t) {
          return cmn(c ^ (b | (~d)), a, b, x, s, t);
        }
        function md5cycle(x, k) {
          var a = x[0],
              b = x[1],
              c = x[2],
              d = x[3];
          a = ff(a, b, c, d, k[0], 7, -680876936);
          d = ff(d, a, b, c, k[1], 12, -389564586);
          c = ff(c, d, a, b, k[2], 17, 606105819);
          b = ff(b, c, d, a, k[3], 22, -1044525330);
          a = ff(a, b, c, d, k[4], 7, -176418897);
          d = ff(d, a, b, c, k[5], 12, 1200080426);
          c = ff(c, d, a, b, k[6], 17, -1473231341);
          b = ff(b, c, d, a, k[7], 22, -45705983);
          a = ff(a, b, c, d, k[8], 7, 1770035416);
          d = ff(d, a, b, c, k[9], 12, -1958414417);
          c = ff(c, d, a, b, k[10], 17, -42063);
          b = ff(b, c, d, a, k[11], 22, -1990404162);
          a = ff(a, b, c, d, k[12], 7, 1804603682);
          d = ff(d, a, b, c, k[13], 12, -40341101);
          c = ff(c, d, a, b, k[14], 17, -1502002290);
          b = ff(b, c, d, a, k[15], 22, 1236535329);
          a = gg(a, b, c, d, k[1], 5, -165796510);
          d = gg(d, a, b, c, k[6], 9, -1069501632);
          c = gg(c, d, a, b, k[11], 14, 643717713);
          b = gg(b, c, d, a, k[0], 20, -373897302);
          a = gg(a, b, c, d, k[5], 5, -701558691);
          d = gg(d, a, b, c, k[10], 9, 38016083);
          c = gg(c, d, a, b, k[15], 14, -660478335);
          b = gg(b, c, d, a, k[4], 20, -405537848);
          a = gg(a, b, c, d, k[9], 5, 568446438);
          d = gg(d, a, b, c, k[14], 9, -1019803690);
          c = gg(c, d, a, b, k[3], 14, -187363961);
          b = gg(b, c, d, a, k[8], 20, 1163531501);
          a = gg(a, b, c, d, k[13], 5, -1444681467);
          d = gg(d, a, b, c, k[2], 9, -51403784);
          c = gg(c, d, a, b, k[7], 14, 1735328473);
          b = gg(b, c, d, a, k[12], 20, -1926607734);
          a = hh(a, b, c, d, k[5], 4, -378558);
          d = hh(d, a, b, c, k[8], 11, -2022574463);
          c = hh(c, d, a, b, k[11], 16, 1839030562);
          b = hh(b, c, d, a, k[14], 23, -35309556);
          a = hh(a, b, c, d, k[1], 4, -1530992060);
          d = hh(d, a, b, c, k[4], 11, 1272893353);
          c = hh(c, d, a, b, k[7], 16, -155497632);
          b = hh(b, c, d, a, k[10], 23, -1094730640);
          a = hh(a, b, c, d, k[13], 4, 681279174);
          d = hh(d, a, b, c, k[0], 11, -358537222);
          c = hh(c, d, a, b, k[3], 16, -722521979);
          b = hh(b, c, d, a, k[6], 23, 76029189);
          a = hh(a, b, c, d, k[9], 4, -640364487);
          d = hh(d, a, b, c, k[12], 11, -421815835);
          c = hh(c, d, a, b, k[15], 16, 530742520);
          b = hh(b, c, d, a, k[2], 23, -995338651);
          a = ii(a, b, c, d, k[0], 6, -198630844);
          d = ii(d, a, b, c, k[7], 10, 1126891415);
          c = ii(c, d, a, b, k[14], 15, -1416354905);
          b = ii(b, c, d, a, k[5], 21, -57434055);
          a = ii(a, b, c, d, k[12], 6, 1700485571);
          d = ii(d, a, b, c, k[3], 10, -1894986606);
          c = ii(c, d, a, b, k[10], 15, -1051523);
          b = ii(b, c, d, a, k[1], 21, -2054922799);
          a = ii(a, b, c, d, k[8], 6, 1873313359);
          d = ii(d, a, b, c, k[15], 10, -30611744);
          c = ii(c, d, a, b, k[6], 15, -1560198380);
          b = ii(b, c, d, a, k[13], 21, 1309151649);
          a = ii(a, b, c, d, k[4], 6, -145523070);
          d = ii(d, a, b, c, k[11], 10, -1120210379);
          c = ii(c, d, a, b, k[2], 15, 718787259);
          b = ii(b, c, d, a, k[9], 21, -343485551);
          x[0] = add32(a, x[0]);
          x[1] = add32(b, x[1]);
          x[2] = add32(c, x[2]);
          x[3] = add32(d, x[3]);
        }
        function md5blk(s) {
          var md5blks = [],
              i;
          for (i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
          }
          return md5blks;
        }
        function md5blk_array(a) {
          var md5blks = [],
              i;
          for (i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
          }
          return md5blks;
        }
        function md51(s) {
          var n = s.length,
              state = [1732584193, -271733879, -1732584194, 271733878],
              i,
              length,
              tail,
              tmp,
              lo,
              hi;
          for (i = 64; i <= n; i += 64) {
            md5cycle(state, md5blk(s.substring(i - 64, i)));
          }
          s = s.substring(i - 64);
          length = s.length;
          tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
          }
          tail[i >> 2] |= 0x80 << ((i % 4) << 3);
          if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i += 1) {
              tail[i] = 0;
            }
          }
          tmp = n * 8;
          tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
          lo = parseInt(tmp[2], 16);
          hi = parseInt(tmp[1], 16) || 0;
          tail[14] = lo;
          tail[15] = hi;
          md5cycle(state, tail);
          return state;
        }
        function md51_array(a) {
          var n = a.length,
              state = [1732584193, -271733879, -1732584194, 271733878],
              i,
              length,
              tail,
              tmp,
              lo,
              hi;
          for (i = 64; i <= n; i += 64) {
            md5cycle(state, md5blk_array(a.subarray(i - 64, i)));
          }
          a = (i - 64) < n ? a.subarray(i - 64) : new Uint8Array(0);
          length = a.length;
          tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= a[i] << ((i % 4) << 3);
          }
          tail[i >> 2] |= 0x80 << ((i % 4) << 3);
          if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i += 1) {
              tail[i] = 0;
            }
          }
          tmp = n * 8;
          tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
          lo = parseInt(tmp[2], 16);
          hi = parseInt(tmp[1], 16) || 0;
          tail[14] = lo;
          tail[15] = hi;
          md5cycle(state, tail);
          return state;
        }
        function rhex(n) {
          var s = '',
              j;
          for (j = 0; j < 4; j += 1) {
            s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
          }
          return s;
        }
        function hex(x) {
          var i;
          for (i = 0; i < x.length; i += 1) {
            x[i] = rhex(x[i]);
          }
          return x.join('');
        }
        if (hex(md51('hello')) !== '5d41402abc4b2a76b9719d911017c592') {
          add32 = function(x, y) {
            var lsw = (x & 0xFFFF) + (y & 0xFFFF),
                msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
          };
        }
        if (typeof ArrayBuffer !== 'undefined' && !ArrayBuffer.prototype.slice) {
          (function() {
            function clamp(val, length) {
              val = (val | 0) || 0;
              if (val < 0) {
                return Math.max(val + length, 0);
              }
              return Math.min(val, length);
            }
            ArrayBuffer.prototype.slice = function(from, to) {
              var length = this.byteLength,
                  begin = clamp(from, length),
                  end = length,
                  num,
                  target,
                  targetArray,
                  sourceArray;
              if (to !== undefined) {
                end = clamp(to, length);
              }
              if (begin > end) {
                return new ArrayBuffer(0);
              }
              num = end - begin;
              target = new ArrayBuffer(num);
              targetArray = new Uint8Array(target);
              sourceArray = new Uint8Array(this, begin, num);
              targetArray.set(sourceArray);
              return target;
            };
          })();
        }
        function toUtf8(str) {
          if (/[\u0080-\uFFFF]/.test(str)) {
            str = unescape(encodeURIComponent(str));
          }
          return str;
        }
        function utf8Str2ArrayBuffer(str, returnUInt8Array) {
          var length = str.length,
              buff = new ArrayBuffer(length),
              arr = new Uint8Array(buff),
              i;
          for (i = 0; i < length; i += 1) {
            arr[i] = str.charCodeAt(i);
          }
          return returnUInt8Array ? arr : buff;
        }
        function arrayBuffer2Utf8Str(buff) {
          return String.fromCharCode.apply(null, new Uint8Array(buff));
        }
        function concatenateArrayBuffers(first, second, returnUInt8Array) {
          var result = new Uint8Array(first.byteLength + second.byteLength);
          result.set(new Uint8Array(first));
          result.set(new Uint8Array(second), first.byteLength);
          return returnUInt8Array ? result : result.buffer;
        }
        function hexToBinaryString(hex) {
          var bytes = [],
              length = hex.length,
              x;
          for (x = 0; x < length - 1; x += 2) {
            bytes.push(parseInt(hex.substr(x, 2), 16));
          }
          return String.fromCharCode.apply(String, bytes);
        }
        function SparkMD5() {
          this.reset();
        }
        SparkMD5.prototype.append = function(str) {
          this.appendBinary(toUtf8(str));
          return this;
        };
        SparkMD5.prototype.appendBinary = function(contents) {
          this._buff += contents;
          this._length += contents.length;
          var length = this._buff.length,
              i;
          for (i = 64; i <= length; i += 64) {
            md5cycle(this._hash, md5blk(this._buff.substring(i - 64, i)));
          }
          this._buff = this._buff.substring(i - 64);
          return this;
        };
        SparkMD5.prototype.end = function(raw) {
          var buff = this._buff,
              length = buff.length,
              i,
              tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              ret;
          for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= buff.charCodeAt(i) << ((i % 4) << 3);
          }
          this._finish(tail, length);
          ret = hex(this._hash);
          if (raw) {
            ret = hexToBinaryString(ret);
          }
          this.reset();
          return ret;
        };
        SparkMD5.prototype.reset = function() {
          this._buff = '';
          this._length = 0;
          this._hash = [1732584193, -271733879, -1732584194, 271733878];
          return this;
        };
        SparkMD5.prototype.getState = function() {
          return {
            buff: this._buff,
            length: this._length,
            hash: this._hash
          };
        };
        SparkMD5.prototype.setState = function(state) {
          this._buff = state.buff;
          this._length = state.length;
          this._hash = state.hash;
          return this;
        };
        SparkMD5.prototype.destroy = function() {
          delete this._hash;
          delete this._buff;
          delete this._length;
        };
        SparkMD5.prototype._finish = function(tail, length) {
          var i = length,
              tmp,
              lo,
              hi;
          tail[i >> 2] |= 0x80 << ((i % 4) << 3);
          if (i > 55) {
            md5cycle(this._hash, tail);
            for (i = 0; i < 16; i += 1) {
              tail[i] = 0;
            }
          }
          tmp = this._length * 8;
          tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
          lo = parseInt(tmp[2], 16);
          hi = parseInt(tmp[1], 16) || 0;
          tail[14] = lo;
          tail[15] = hi;
          md5cycle(this._hash, tail);
        };
        SparkMD5.hash = function(str, raw) {
          return SparkMD5.hashBinary(toUtf8(str), raw);
        };
        SparkMD5.hashBinary = function(content, raw) {
          var hash = md51(content),
              ret = hex(hash);
          return raw ? hexToBinaryString(ret) : ret;
        };
        SparkMD5.ArrayBuffer = function() {
          this.reset();
        };
        SparkMD5.ArrayBuffer.prototype.append = function(arr) {
          var buff = concatenateArrayBuffers(this._buff.buffer, arr, true),
              length = buff.length,
              i;
          this._length += arr.byteLength;
          for (i = 64; i <= length; i += 64) {
            md5cycle(this._hash, md5blk_array(buff.subarray(i - 64, i)));
          }
          this._buff = (i - 64) < length ? new Uint8Array(buff.buffer.slice(i - 64)) : new Uint8Array(0);
          return this;
        };
        SparkMD5.ArrayBuffer.prototype.end = function(raw) {
          var buff = this._buff,
              length = buff.length,
              tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              i,
              ret;
          for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= buff[i] << ((i % 4) << 3);
          }
          this._finish(tail, length);
          ret = hex(this._hash);
          if (raw) {
            ret = hexToBinaryString(ret);
          }
          this.reset();
          return ret;
        };
        SparkMD5.ArrayBuffer.prototype.reset = function() {
          this._buff = new Uint8Array(0);
          this._length = 0;
          this._hash = [1732584193, -271733879, -1732584194, 271733878];
          return this;
        };
        SparkMD5.ArrayBuffer.prototype.getState = function() {
          var state = SparkMD5.prototype.getState.call(this);
          state.buff = arrayBuffer2Utf8Str(state.buff);
          return state;
        };
        SparkMD5.ArrayBuffer.prototype.setState = function(state) {
          state.buff = utf8Str2ArrayBuffer(state.buff, true);
          return SparkMD5.prototype.setState.call(this, state);
        };
        SparkMD5.ArrayBuffer.prototype.destroy = SparkMD5.prototype.destroy;
        SparkMD5.ArrayBuffer.prototype._finish = SparkMD5.prototype._finish;
        SparkMD5.ArrayBuffer.hash = function(arr, raw) {
          var hash = md51_array(new Uint8Array(arr)),
              ret = hex(hash);
          return raw ? hexToBinaryString(ret) : ret;
        };
        return SparkMD5;
      }));
    }, {}],
    73: [function(_dereq_, module, exports) {
      module.exports = Stream;
      var EE = _dereq_(15).EventEmitter;
      var inherits = _dereq_(23);
      inherits(Stream, EE);
      Stream.Readable = _dereq_(81);
      Stream.Writable = _dereq_(83);
      Stream.Duplex = _dereq_(74);
      Stream.Transform = _dereq_(82);
      Stream.PassThrough = _dereq_(80);
      Stream.Stream = Stream;
      function Stream() {
        EE.call(this);
      }
      Stream.prototype.pipe = function(dest, options) {
        var source = this;
        function ondata(chunk) {
          if (dest.writable) {
            if (false === dest.write(chunk) && source.pause) {
              source.pause();
            }
          }
        }
        source.on('data', ondata);
        function ondrain() {
          if (source.readable && source.resume) {
            source.resume();
          }
        }
        dest.on('drain', ondrain);
        if (!dest._isStdio && (!options || options.end !== false)) {
          source.on('end', onend);
          source.on('close', onclose);
        }
        var didOnEnd = false;
        function onend() {
          if (didOnEnd)
            return;
          didOnEnd = true;
          dest.end();
        }
        function onclose() {
          if (didOnEnd)
            return;
          didOnEnd = true;
          if (typeof dest.destroy === 'function')
            dest.destroy();
        }
        function onerror(er) {
          cleanup();
          if (EE.listenerCount(this, 'error') === 0) {
            throw er;
          }
        }
        source.on('error', onerror);
        dest.on('error', onerror);
        function cleanup() {
          source.removeListener('data', ondata);
          dest.removeListener('drain', ondrain);
          source.removeListener('end', onend);
          source.removeListener('close', onclose);
          source.removeListener('error', onerror);
          dest.removeListener('error', onerror);
          source.removeListener('end', cleanup);
          source.removeListener('close', cleanup);
          dest.removeListener('close', cleanup);
        }
        source.on('end', cleanup);
        source.on('close', cleanup);
        dest.on('close', cleanup);
        dest.emit('pipe', source);
        return dest;
      };
    }, {
      "15": 15,
      "23": 23,
      "74": 74,
      "80": 80,
      "81": 81,
      "82": 82,
      "83": 83
    }],
    74: [function(_dereq_, module, exports) {
      module.exports = _dereq_(75);
    }, {"75": 75}],
    75: [function(_dereq_, module, exports) {
      'use strict';
      var objectKeys = Object.keys || function(obj) {
        var keys = [];
        for (var key in obj)
          keys.push(key);
        return keys;
      };
      module.exports = Duplex;
      var processNextTick = _dereq_(63);
      var util = _dereq_(10);
      util.inherits = _dereq_(23);
      var Readable = _dereq_(77);
      var Writable = _dereq_(79);
      util.inherits(Duplex, Readable);
      var keys = objectKeys(Writable.prototype);
      for (var v = 0; v < keys.length; v++) {
        var method = keys[v];
        if (!Duplex.prototype[method])
          Duplex.prototype[method] = Writable.prototype[method];
      }
      function Duplex(options) {
        if (!(this instanceof Duplex))
          return new Duplex(options);
        Readable.call(this, options);
        Writable.call(this, options);
        if (options && options.readable === false)
          this.readable = false;
        if (options && options.writable === false)
          this.writable = false;
        this.allowHalfOpen = true;
        if (options && options.allowHalfOpen === false)
          this.allowHalfOpen = false;
        this.once('end', onend);
      }
      function onend() {
        if (this.allowHalfOpen || this._writableState.ended)
          return;
        processNextTick(onEndNT, this);
      }
      function onEndNT(self) {
        self.end();
      }
      function forEach(xs, f) {
        for (var i = 0,
            l = xs.length; i < l; i++) {
          f(xs[i], i);
        }
      }
    }, {
      "10": 10,
      "23": 23,
      "63": 63,
      "77": 77,
      "79": 79
    }],
    76: [function(_dereq_, module, exports) {
      'use strict';
      module.exports = PassThrough;
      var Transform = _dereq_(78);
      var util = _dereq_(10);
      util.inherits = _dereq_(23);
      util.inherits(PassThrough, Transform);
      function PassThrough(options) {
        if (!(this instanceof PassThrough))
          return new PassThrough(options);
        Transform.call(this, options);
      }
      PassThrough.prototype._transform = function(chunk, encoding, cb) {
        cb(null, chunk);
      };
    }, {
      "10": 10,
      "23": 23,
      "78": 78
    }],
    77: [function(_dereq_, module, exports) {
      (function(process) {
        'use strict';
        module.exports = Readable;
        var processNextTick = _dereq_(63);
        var isArray = _dereq_(25);
        var Buffer = _dereq_(8).Buffer;
        Readable.ReadableState = ReadableState;
        var EE = _dereq_(15);
        var EElistenerCount = function(emitter, type) {
          return emitter.listeners(type).length;
        };
        var Stream;
        (function() {
          try {
            Stream = _dereq_('st' + 'ream');
          } catch (_) {} finally {
            if (!Stream)
              Stream = _dereq_(15).EventEmitter;
          }
        }());
        var Buffer = _dereq_(8).Buffer;
        var util = _dereq_(10);
        util.inherits = _dereq_(23);
        var debugUtil = _dereq_(7);
        var debug;
        if (debugUtil && debugUtil.debuglog) {
          debug = debugUtil.debuglog('stream');
        } else {
          debug = function() {};
        }
        var StringDecoder;
        util.inherits(Readable, Stream);
        var Duplex;
        function ReadableState(options, stream) {
          Duplex = Duplex || _dereq_(75);
          options = options || {};
          this.objectMode = !!options.objectMode;
          if (stream instanceof Duplex)
            this.objectMode = this.objectMode || !!options.readableObjectMode;
          var hwm = options.highWaterMark;
          var defaultHwm = this.objectMode ? 16 : 16 * 1024;
          this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;
          this.highWaterMark = ~~this.highWaterMark;
          this.buffer = [];
          this.length = 0;
          this.pipes = null;
          this.pipesCount = 0;
          this.flowing = null;
          this.ended = false;
          this.endEmitted = false;
          this.reading = false;
          this.sync = true;
          this.needReadable = false;
          this.emittedReadable = false;
          this.readableListening = false;
          this.defaultEncoding = options.defaultEncoding || 'utf8';
          this.ranOut = false;
          this.awaitDrain = 0;
          this.readingMore = false;
          this.decoder = null;
          this.encoding = null;
          if (options.encoding) {
            if (!StringDecoder)
              StringDecoder = _dereq_(84).StringDecoder;
            this.decoder = new StringDecoder(options.encoding);
            this.encoding = options.encoding;
          }
        }
        var Duplex;
        function Readable(options) {
          Duplex = Duplex || _dereq_(75);
          if (!(this instanceof Readable))
            return new Readable(options);
          this._readableState = new ReadableState(options, this);
          this.readable = true;
          if (options && typeof options.read === 'function')
            this._read = options.read;
          Stream.call(this);
        }
        Readable.prototype.push = function(chunk, encoding) {
          var state = this._readableState;
          if (!state.objectMode && typeof chunk === 'string') {
            encoding = encoding || state.defaultEncoding;
            if (encoding !== state.encoding) {
              chunk = new Buffer(chunk, encoding);
              encoding = '';
            }
          }
          return readableAddChunk(this, state, chunk, encoding, false);
        };
        Readable.prototype.unshift = function(chunk) {
          var state = this._readableState;
          return readableAddChunk(this, state, chunk, '', true);
        };
        Readable.prototype.isPaused = function() {
          return this._readableState.flowing === false;
        };
        function readableAddChunk(stream, state, chunk, encoding, addToFront) {
          var er = chunkInvalid(state, chunk);
          if (er) {
            stream.emit('error', er);
          } else if (chunk === null) {
            state.reading = false;
            onEofChunk(stream, state);
          } else if (state.objectMode || chunk && chunk.length > 0) {
            if (state.ended && !addToFront) {
              var e = new Error('stream.push() after EOF');
              stream.emit('error', e);
            } else if (state.endEmitted && addToFront) {
              var e = new Error('stream.unshift() after end event');
              stream.emit('error', e);
            } else {
              if (state.decoder && !addToFront && !encoding)
                chunk = state.decoder.write(chunk);
              if (!addToFront)
                state.reading = false;
              if (state.flowing && state.length === 0 && !state.sync) {
                stream.emit('data', chunk);
                stream.read(0);
              } else {
                state.length += state.objectMode ? 1 : chunk.length;
                if (addToFront)
                  state.buffer.unshift(chunk);
                else
                  state.buffer.push(chunk);
                if (state.needReadable)
                  emitReadable(stream);
              }
              maybeReadMore(stream, state);
            }
          } else if (!addToFront) {
            state.reading = false;
          }
          return needMoreData(state);
        }
        function needMoreData(state) {
          return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
        }
        Readable.prototype.setEncoding = function(enc) {
          if (!StringDecoder)
            StringDecoder = _dereq_(84).StringDecoder;
          this._readableState.decoder = new StringDecoder(enc);
          this._readableState.encoding = enc;
          return this;
        };
        var MAX_HWM = 0x800000;
        function computeNewHighWaterMark(n) {
          if (n >= MAX_HWM) {
            n = MAX_HWM;
          } else {
            n--;
            n |= n >>> 1;
            n |= n >>> 2;
            n |= n >>> 4;
            n |= n >>> 8;
            n |= n >>> 16;
            n++;
          }
          return n;
        }
        function howMuchToRead(n, state) {
          if (state.length === 0 && state.ended)
            return 0;
          if (state.objectMode)
            return n === 0 ? 0 : 1;
          if (n === null || isNaN(n)) {
            if (state.flowing && state.buffer.length)
              return state.buffer[0].length;
            else
              return state.length;
          }
          if (n <= 0)
            return 0;
          if (n > state.highWaterMark)
            state.highWaterMark = computeNewHighWaterMark(n);
          if (n > state.length) {
            if (!state.ended) {
              state.needReadable = true;
              return 0;
            } else {
              return state.length;
            }
          }
          return n;
        }
        Readable.prototype.read = function(n) {
          debug('read', n);
          var state = this._readableState;
          var nOrig = n;
          if (typeof n !== 'number' || n > 0)
            state.emittedReadable = false;
          if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
            debug('read: emitReadable', state.length, state.ended);
            if (state.length === 0 && state.ended)
              endReadable(this);
            else
              emitReadable(this);
            return null;
          }
          n = howMuchToRead(n, state);
          if (n === 0 && state.ended) {
            if (state.length === 0)
              endReadable(this);
            return null;
          }
          var doRead = state.needReadable;
          debug('need readable', doRead);
          if (state.length === 0 || state.length - n < state.highWaterMark) {
            doRead = true;
            debug('length less than watermark', doRead);
          }
          if (state.ended || state.reading) {
            doRead = false;
            debug('reading or ended', doRead);
          }
          if (doRead) {
            debug('do read');
            state.reading = true;
            state.sync = true;
            if (state.length === 0)
              state.needReadable = true;
            this._read(state.highWaterMark);
            state.sync = false;
          }
          if (doRead && !state.reading)
            n = howMuchToRead(nOrig, state);
          var ret;
          if (n > 0)
            ret = fromList(n, state);
          else
            ret = null;
          if (ret === null) {
            state.needReadable = true;
            n = 0;
          }
          state.length -= n;
          if (state.length === 0 && !state.ended)
            state.needReadable = true;
          if (nOrig !== n && state.ended && state.length === 0)
            endReadable(this);
          if (ret !== null)
            this.emit('data', ret);
          return ret;
        };
        function chunkInvalid(state, chunk) {
          var er = null;
          if (!(Buffer.isBuffer(chunk)) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
            er = new TypeError('Invalid non-string/buffer chunk');
          }
          return er;
        }
        function onEofChunk(stream, state) {
          if (state.ended)
            return;
          if (state.decoder) {
            var chunk = state.decoder.end();
            if (chunk && chunk.length) {
              state.buffer.push(chunk);
              state.length += state.objectMode ? 1 : chunk.length;
            }
          }
          state.ended = true;
          emitReadable(stream);
        }
        function emitReadable(stream) {
          var state = stream._readableState;
          state.needReadable = false;
          if (!state.emittedReadable) {
            debug('emitReadable', state.flowing);
            state.emittedReadable = true;
            if (state.sync)
              processNextTick(emitReadable_, stream);
            else
              emitReadable_(stream);
          }
        }
        function emitReadable_(stream) {
          debug('emit readable');
          stream.emit('readable');
          flow(stream);
        }
        function maybeReadMore(stream, state) {
          if (!state.readingMore) {
            state.readingMore = true;
            processNextTick(maybeReadMore_, stream, state);
          }
        }
        function maybeReadMore_(stream, state) {
          var len = state.length;
          while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
            debug('maybeReadMore read 0');
            stream.read(0);
            if (len === state.length)
              break;
            else
              len = state.length;
          }
          state.readingMore = false;
        }
        Readable.prototype._read = function(n) {
          this.emit('error', new Error('not implemented'));
        };
        Readable.prototype.pipe = function(dest, pipeOpts) {
          var src = this;
          var state = this._readableState;
          switch (state.pipesCount) {
            case 0:
              state.pipes = dest;
              break;
            case 1:
              state.pipes = [state.pipes, dest];
              break;
            default:
              state.pipes.push(dest);
              break;
          }
          state.pipesCount += 1;
          debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);
          var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
          var endFn = doEnd ? onend : cleanup;
          if (state.endEmitted)
            processNextTick(endFn);
          else
            src.once('end', endFn);
          dest.on('unpipe', onunpipe);
          function onunpipe(readable) {
            debug('onunpipe');
            if (readable === src) {
              cleanup();
            }
          }
          function onend() {
            debug('onend');
            dest.end();
          }
          var ondrain = pipeOnDrain(src);
          dest.on('drain', ondrain);
          var cleanedUp = false;
          function cleanup() {
            debug('cleanup');
            dest.removeListener('close', onclose);
            dest.removeListener('finish', onfinish);
            dest.removeListener('drain', ondrain);
            dest.removeListener('error', onerror);
            dest.removeListener('unpipe', onunpipe);
            src.removeListener('end', onend);
            src.removeListener('end', cleanup);
            src.removeListener('data', ondata);
            cleanedUp = true;
            if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain))
              ondrain();
          }
          src.on('data', ondata);
          function ondata(chunk) {
            debug('ondata');
            var ret = dest.write(chunk);
            if (false === ret) {
              if (state.pipesCount === 1 && state.pipes[0] === dest && src.listenerCount('data') === 1 && !cleanedUp) {
                debug('false write response, pause', src._readableState.awaitDrain);
                src._readableState.awaitDrain++;
              }
              src.pause();
            }
          }
          function onerror(er) {
            debug('onerror', er);
            unpipe();
            dest.removeListener('error', onerror);
            if (EElistenerCount(dest, 'error') === 0)
              dest.emit('error', er);
          }
          if (!dest._events || !dest._events.error)
            dest.on('error', onerror);
          else if (isArray(dest._events.error))
            dest._events.error.unshift(onerror);
          else
            dest._events.error = [onerror, dest._events.error];
          function onclose() {
            dest.removeListener('finish', onfinish);
            unpipe();
          }
          dest.once('close', onclose);
          function onfinish() {
            debug('onfinish');
            dest.removeListener('close', onclose);
            unpipe();
          }
          dest.once('finish', onfinish);
          function unpipe() {
            debug('unpipe');
            src.unpipe(dest);
          }
          dest.emit('pipe', src);
          if (!state.flowing) {
            debug('pipe resume');
            src.resume();
          }
          return dest;
        };
        function pipeOnDrain(src) {
          return function() {
            var state = src._readableState;
            debug('pipeOnDrain', state.awaitDrain);
            if (state.awaitDrain)
              state.awaitDrain--;
            if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
              state.flowing = true;
              flow(src);
            }
          };
        }
        Readable.prototype.unpipe = function(dest) {
          var state = this._readableState;
          if (state.pipesCount === 0)
            return this;
          if (state.pipesCount === 1) {
            if (dest && dest !== state.pipes)
              return this;
            if (!dest)
              dest = state.pipes;
            state.pipes = null;
            state.pipesCount = 0;
            state.flowing = false;
            if (dest)
              dest.emit('unpipe', this);
            return this;
          }
          if (!dest) {
            var dests = state.pipes;
            var len = state.pipesCount;
            state.pipes = null;
            state.pipesCount = 0;
            state.flowing = false;
            for (var i = 0; i < len; i++)
              dests[i].emit('unpipe', this);
            return this;
          }
          var i = indexOf(state.pipes, dest);
          if (i === -1)
            return this;
          state.pipes.splice(i, 1);
          state.pipesCount -= 1;
          if (state.pipesCount === 1)
            state.pipes = state.pipes[0];
          dest.emit('unpipe', this);
          return this;
        };
        Readable.prototype.on = function(ev, fn) {
          var res = Stream.prototype.on.call(this, ev, fn);
          if (ev === 'data' && false !== this._readableState.flowing) {
            this.resume();
          }
          if (ev === 'readable' && this.readable) {
            var state = this._readableState;
            if (!state.readableListening) {
              state.readableListening = true;
              state.emittedReadable = false;
              state.needReadable = true;
              if (!state.reading) {
                processNextTick(nReadingNextTick, this);
              } else if (state.length) {
                emitReadable(this, state);
              }
            }
          }
          return res;
        };
        Readable.prototype.addListener = Readable.prototype.on;
        function nReadingNextTick(self) {
          debug('readable nexttick read 0');
          self.read(0);
        }
        Readable.prototype.resume = function() {
          var state = this._readableState;
          if (!state.flowing) {
            debug('resume');
            state.flowing = true;
            resume(this, state);
          }
          return this;
        };
        function resume(stream, state) {
          if (!state.resumeScheduled) {
            state.resumeScheduled = true;
            processNextTick(resume_, stream, state);
          }
        }
        function resume_(stream, state) {
          if (!state.reading) {
            debug('resume read 0');
            stream.read(0);
          }
          state.resumeScheduled = false;
          stream.emit('resume');
          flow(stream);
          if (state.flowing && !state.reading)
            stream.read(0);
        }
        Readable.prototype.pause = function() {
          debug('call pause flowing=%j', this._readableState.flowing);
          if (false !== this._readableState.flowing) {
            debug('pause');
            this._readableState.flowing = false;
            this.emit('pause');
          }
          return this;
        };
        function flow(stream) {
          var state = stream._readableState;
          debug('flow', state.flowing);
          if (state.flowing) {
            do {
              var chunk = stream.read();
            } while (null !== chunk && state.flowing);
          }
        }
        Readable.prototype.wrap = function(stream) {
          var state = this._readableState;
          var paused = false;
          var self = this;
          stream.on('end', function() {
            debug('wrapped end');
            if (state.decoder && !state.ended) {
              var chunk = state.decoder.end();
              if (chunk && chunk.length)
                self.push(chunk);
            }
            self.push(null);
          });
          stream.on('data', function(chunk) {
            debug('wrapped data');
            if (state.decoder)
              chunk = state.decoder.write(chunk);
            if (state.objectMode && (chunk === null || chunk === undefined))
              return;
            else if (!state.objectMode && (!chunk || !chunk.length))
              return;
            var ret = self.push(chunk);
            if (!ret) {
              paused = true;
              stream.pause();
            }
          });
          for (var i in stream) {
            if (this[i] === undefined && typeof stream[i] === 'function') {
              this[i] = function(method) {
                return function() {
                  return stream[method].apply(stream, arguments);
                };
              }(i);
            }
          }
          var events = ['error', 'close', 'destroy', 'pause', 'resume'];
          forEach(events, function(ev) {
            stream.on(ev, self.emit.bind(self, ev));
          });
          self._read = function(n) {
            debug('wrapped _read', n);
            if (paused) {
              paused = false;
              stream.resume();
            }
          };
          return self;
        };
        Readable._fromList = fromList;
        function fromList(n, state) {
          var list = state.buffer;
          var length = state.length;
          var stringMode = !!state.decoder;
          var objectMode = !!state.objectMode;
          var ret;
          if (list.length === 0)
            return null;
          if (length === 0)
            ret = null;
          else if (objectMode)
            ret = list.shift();
          else if (!n || n >= length) {
            if (stringMode)
              ret = list.join('');
            else if (list.length === 1)
              ret = list[0];
            else
              ret = Buffer.concat(list, length);
            list.length = 0;
          } else {
            if (n < list[0].length) {
              var buf = list[0];
              ret = buf.slice(0, n);
              list[0] = buf.slice(n);
            } else if (n === list[0].length) {
              ret = list.shift();
            } else {
              if (stringMode)
                ret = '';
              else
                ret = new Buffer(n);
              var c = 0;
              for (var i = 0,
                  l = list.length; i < l && c < n; i++) {
                var buf = list[0];
                var cpy = Math.min(n - c, buf.length);
                if (stringMode)
                  ret += buf.slice(0, cpy);
                else
                  buf.copy(ret, c, 0, cpy);
                if (cpy < buf.length)
                  list[0] = buf.slice(cpy);
                else
                  list.shift();
                c += cpy;
              }
            }
          }
          return ret;
        }
        function endReadable(stream) {
          var state = stream._readableState;
          if (state.length > 0)
            throw new Error('endReadable called on non-empty stream');
          if (!state.endEmitted) {
            state.ended = true;
            processNextTick(endReadableNT, state, stream);
          }
        }
        function endReadableNT(state, stream) {
          if (!state.endEmitted && state.length === 0) {
            state.endEmitted = true;
            stream.readable = false;
            stream.emit('end');
          }
        }
        function forEach(xs, f) {
          for (var i = 0,
              l = xs.length; i < l; i++) {
            f(xs[i], i);
          }
        }
        function indexOf(xs, x) {
          for (var i = 0,
              l = xs.length; i < l; i++) {
            if (xs[i] === x)
              return i;
          }
          return -1;
        }
      }).call(this, _dereq_(64));
    }, {
      "10": 10,
      "15": 15,
      "23": 23,
      "25": 25,
      "63": 63,
      "64": 64,
      "7": 7,
      "75": 75,
      "8": 8,
      "84": 84
    }],
    78: [function(_dereq_, module, exports) {
      'use strict';
      module.exports = Transform;
      var Duplex = _dereq_(75);
      var util = _dereq_(10);
      util.inherits = _dereq_(23);
      util.inherits(Transform, Duplex);
      function TransformState(stream) {
        this.afterTransform = function(er, data) {
          return afterTransform(stream, er, data);
        };
        this.needTransform = false;
        this.transforming = false;
        this.writecb = null;
        this.writechunk = null;
      }
      function afterTransform(stream, er, data) {
        var ts = stream._transformState;
        ts.transforming = false;
        var cb = ts.writecb;
        if (!cb)
          return stream.emit('error', new Error('no writecb in Transform class'));
        ts.writechunk = null;
        ts.writecb = null;
        if (data !== null && data !== undefined)
          stream.push(data);
        if (cb)
          cb(er);
        var rs = stream._readableState;
        rs.reading = false;
        if (rs.needReadable || rs.length < rs.highWaterMark) {
          stream._read(rs.highWaterMark);
        }
      }
      function Transform(options) {
        if (!(this instanceof Transform))
          return new Transform(options);
        Duplex.call(this, options);
        this._transformState = new TransformState(this);
        var stream = this;
        this._readableState.needReadable = true;
        this._readableState.sync = false;
        if (options) {
          if (typeof options.transform === 'function')
            this._transform = options.transform;
          if (typeof options.flush === 'function')
            this._flush = options.flush;
        }
        this.once('prefinish', function() {
          if (typeof this._flush === 'function')
            this._flush(function(er) {
              done(stream, er);
            });
          else
            done(stream);
        });
      }
      Transform.prototype.push = function(chunk, encoding) {
        this._transformState.needTransform = false;
        return Duplex.prototype.push.call(this, chunk, encoding);
      };
      Transform.prototype._transform = function(chunk, encoding, cb) {
        throw new Error('not implemented');
      };
      Transform.prototype._write = function(chunk, encoding, cb) {
        var ts = this._transformState;
        ts.writecb = cb;
        ts.writechunk = chunk;
        ts.writeencoding = encoding;
        if (!ts.transforming) {
          var rs = this._readableState;
          if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark)
            this._read(rs.highWaterMark);
        }
      };
      Transform.prototype._read = function(n) {
        var ts = this._transformState;
        if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
          ts.transforming = true;
          this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
        } else {
          ts.needTransform = true;
        }
      };
      function done(stream, er) {
        if (er)
          return stream.emit('error', er);
        var ws = stream._writableState;
        var ts = stream._transformState;
        if (ws.length)
          throw new Error('calling transform done when ws.length != 0');
        if (ts.transforming)
          throw new Error('calling transform done when still transforming');
        return stream.push(null);
      }
    }, {
      "10": 10,
      "23": 23,
      "75": 75
    }],
    79: [function(_dereq_, module, exports) {
      'use strict';
      module.exports = Writable;
      var processNextTick = _dereq_(63);
      var Buffer = _dereq_(8).Buffer;
      Writable.WritableState = WritableState;
      var util = _dereq_(10);
      util.inherits = _dereq_(23);
      var internalUtil = {deprecate: _dereq_(93)};
      var Stream;
      (function() {
        try {
          Stream = _dereq_('st' + 'ream');
        } catch (_) {} finally {
          if (!Stream)
            Stream = _dereq_(15).EventEmitter;
        }
      }());
      var Buffer = _dereq_(8).Buffer;
      util.inherits(Writable, Stream);
      function nop() {}
      function WriteReq(chunk, encoding, cb) {
        this.chunk = chunk;
        this.encoding = encoding;
        this.callback = cb;
        this.next = null;
      }
      var Duplex;
      function WritableState(options, stream) {
        Duplex = Duplex || _dereq_(75);
        options = options || {};
        this.objectMode = !!options.objectMode;
        if (stream instanceof Duplex)
          this.objectMode = this.objectMode || !!options.writableObjectMode;
        var hwm = options.highWaterMark;
        var defaultHwm = this.objectMode ? 16 : 16 * 1024;
        this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;
        this.highWaterMark = ~~this.highWaterMark;
        this.needDrain = false;
        this.ending = false;
        this.ended = false;
        this.finished = false;
        var noDecode = options.decodeStrings === false;
        this.decodeStrings = !noDecode;
        this.defaultEncoding = options.defaultEncoding || 'utf8';
        this.length = 0;
        this.writing = false;
        this.corked = 0;
        this.sync = true;
        this.bufferProcessing = false;
        this.onwrite = function(er) {
          onwrite(stream, er);
        };
        this.writecb = null;
        this.writelen = 0;
        this.bufferedRequest = null;
        this.lastBufferedRequest = null;
        this.pendingcb = 0;
        this.prefinished = false;
        this.errorEmitted = false;
      }
      WritableState.prototype.getBuffer = function writableStateGetBuffer() {
        var current = this.bufferedRequest;
        var out = [];
        while (current) {
          out.push(current);
          current = current.next;
        }
        return out;
      };
      (function() {
        try {
          Object.defineProperty(WritableState.prototype, 'buffer', {get: internalUtil.deprecate(function() {
              return this.getBuffer();
            }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.')});
        } catch (_) {}
      }());
      var Duplex;
      function Writable(options) {
        Duplex = Duplex || _dereq_(75);
        if (!(this instanceof Writable) && !(this instanceof Duplex))
          return new Writable(options);
        this._writableState = new WritableState(options, this);
        this.writable = true;
        if (options) {
          if (typeof options.write === 'function')
            this._write = options.write;
          if (typeof options.writev === 'function')
            this._writev = options.writev;
        }
        Stream.call(this);
      }
      Writable.prototype.pipe = function() {
        this.emit('error', new Error('Cannot pipe. Not readable.'));
      };
      function writeAfterEnd(stream, cb) {
        var er = new Error('write after end');
        stream.emit('error', er);
        processNextTick(cb, er);
      }
      function validChunk(stream, state, chunk, cb) {
        var valid = true;
        if (!(Buffer.isBuffer(chunk)) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
          var er = new TypeError('Invalid non-string/buffer chunk');
          stream.emit('error', er);
          processNextTick(cb, er);
          valid = false;
        }
        return valid;
      }
      Writable.prototype.write = function(chunk, encoding, cb) {
        var state = this._writableState;
        var ret = false;
        if (typeof encoding === 'function') {
          cb = encoding;
          encoding = null;
        }
        if (Buffer.isBuffer(chunk))
          encoding = 'buffer';
        else if (!encoding)
          encoding = state.defaultEncoding;
        if (typeof cb !== 'function')
          cb = nop;
        if (state.ended)
          writeAfterEnd(this, cb);
        else if (validChunk(this, state, chunk, cb)) {
          state.pendingcb++;
          ret = writeOrBuffer(this, state, chunk, encoding, cb);
        }
        return ret;
      };
      Writable.prototype.cork = function() {
        var state = this._writableState;
        state.corked++;
      };
      Writable.prototype.uncork = function() {
        var state = this._writableState;
        if (state.corked) {
          state.corked--;
          if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest)
            clearBuffer(this, state);
        }
      };
      Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
        if (typeof encoding === 'string')
          encoding = encoding.toLowerCase();
        if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1))
          throw new TypeError('Unknown encoding: ' + encoding);
        this._writableState.defaultEncoding = encoding;
      };
      function decodeChunk(state, chunk, encoding) {
        if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
          chunk = new Buffer(chunk, encoding);
        }
        return chunk;
      }
      function writeOrBuffer(stream, state, chunk, encoding, cb) {
        chunk = decodeChunk(state, chunk, encoding);
        if (Buffer.isBuffer(chunk))
          encoding = 'buffer';
        var len = state.objectMode ? 1 : chunk.length;
        state.length += len;
        var ret = state.length < state.highWaterMark;
        if (!ret)
          state.needDrain = true;
        if (state.writing || state.corked) {
          var last = state.lastBufferedRequest;
          state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
          if (last) {
            last.next = state.lastBufferedRequest;
          } else {
            state.bufferedRequest = state.lastBufferedRequest;
          }
        } else {
          doWrite(stream, state, false, len, chunk, encoding, cb);
        }
        return ret;
      }
      function doWrite(stream, state, writev, len, chunk, encoding, cb) {
        state.writelen = len;
        state.writecb = cb;
        state.writing = true;
        state.sync = true;
        if (writev)
          stream._writev(chunk, state.onwrite);
        else
          stream._write(chunk, encoding, state.onwrite);
        state.sync = false;
      }
      function onwriteError(stream, state, sync, er, cb) {
        --state.pendingcb;
        if (sync)
          processNextTick(cb, er);
        else
          cb(er);
        stream._writableState.errorEmitted = true;
        stream.emit('error', er);
      }
      function onwriteStateUpdate(state) {
        state.writing = false;
        state.writecb = null;
        state.length -= state.writelen;
        state.writelen = 0;
      }
      function onwrite(stream, er) {
        var state = stream._writableState;
        var sync = state.sync;
        var cb = state.writecb;
        onwriteStateUpdate(state);
        if (er)
          onwriteError(stream, state, sync, er, cb);
        else {
          var finished = needFinish(state);
          if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
            clearBuffer(stream, state);
          }
          if (sync) {
            processNextTick(afterWrite, stream, state, finished, cb);
          } else {
            afterWrite(stream, state, finished, cb);
          }
        }
      }
      function afterWrite(stream, state, finished, cb) {
        if (!finished)
          onwriteDrain(stream, state);
        state.pendingcb--;
        cb();
        finishMaybe(stream, state);
      }
      function onwriteDrain(stream, state) {
        if (state.length === 0 && state.needDrain) {
          state.needDrain = false;
          stream.emit('drain');
        }
      }
      function clearBuffer(stream, state) {
        state.bufferProcessing = true;
        var entry = state.bufferedRequest;
        if (stream._writev && entry && entry.next) {
          var buffer = [];
          var cbs = [];
          while (entry) {
            cbs.push(entry.callback);
            buffer.push(entry);
            entry = entry.next;
          }
          state.pendingcb++;
          state.lastBufferedRequest = null;
          doWrite(stream, state, true, state.length, buffer, '', function(err) {
            for (var i = 0; i < cbs.length; i++) {
              state.pendingcb--;
              cbs[i](err);
            }
          });
        } else {
          while (entry) {
            var chunk = entry.chunk;
            var encoding = entry.encoding;
            var cb = entry.callback;
            var len = state.objectMode ? 1 : chunk.length;
            doWrite(stream, state, false, len, chunk, encoding, cb);
            entry = entry.next;
            if (state.writing) {
              break;
            }
          }
          if (entry === null)
            state.lastBufferedRequest = null;
        }
        state.bufferedRequest = entry;
        state.bufferProcessing = false;
      }
      Writable.prototype._write = function(chunk, encoding, cb) {
        cb(new Error('not implemented'));
      };
      Writable.prototype._writev = null;
      Writable.prototype.end = function(chunk, encoding, cb) {
        var state = this._writableState;
        if (typeof chunk === 'function') {
          cb = chunk;
          chunk = null;
          encoding = null;
        } else if (typeof encoding === 'function') {
          cb = encoding;
          encoding = null;
        }
        if (chunk !== null && chunk !== undefined)
          this.write(chunk, encoding);
        if (state.corked) {
          state.corked = 1;
          this.uncork();
        }
        if (!state.ending && !state.finished)
          endWritable(this, state, cb);
      };
      function needFinish(state) {
        return (state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing);
      }
      function prefinish(stream, state) {
        if (!state.prefinished) {
          state.prefinished = true;
          stream.emit('prefinish');
        }
      }
      function finishMaybe(stream, state) {
        var need = needFinish(state);
        if (need) {
          if (state.pendingcb === 0) {
            prefinish(stream, state);
            state.finished = true;
            stream.emit('finish');
          } else {
            prefinish(stream, state);
          }
        }
        return need;
      }
      function endWritable(stream, state, cb) {
        state.ending = true;
        finishMaybe(stream, state);
        if (cb) {
          if (state.finished)
            processNextTick(cb);
          else
            stream.once('finish', cb);
        }
        state.ended = true;
      }
    }, {
      "10": 10,
      "15": 15,
      "23": 23,
      "63": 63,
      "75": 75,
      "8": 8,
      "93": 93
    }],
    80: [function(_dereq_, module, exports) {
      module.exports = _dereq_(76);
    }, {"76": 76}],
    81: [function(_dereq_, module, exports) {
      var Stream = (function() {
        try {
          return _dereq_('st' + 'ream');
        } catch (_) {}
      }());
      exports = module.exports = _dereq_(77);
      exports.Stream = Stream || exports;
      exports.Readable = exports;
      exports.Writable = _dereq_(79);
      exports.Duplex = _dereq_(75);
      exports.Transform = _dereq_(78);
      exports.PassThrough = _dereq_(76);
    }, {
      "75": 75,
      "76": 76,
      "77": 77,
      "78": 78,
      "79": 79
    }],
    82: [function(_dereq_, module, exports) {
      module.exports = _dereq_(78);
    }, {"78": 78}],
    83: [function(_dereq_, module, exports) {
      module.exports = _dereq_(79);
    }, {"79": 79}],
    84: [function(_dereq_, module, exports) {
      var Buffer = _dereq_(8).Buffer;
      var isBufferEncoding = Buffer.isEncoding || function(encoding) {
        switch (encoding && encoding.toLowerCase()) {
          case 'hex':
          case 'utf8':
          case 'utf-8':
          case 'ascii':
          case 'binary':
          case 'base64':
          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
          case 'raw':
            return true;
          default:
            return false;
        }
      };
      function assertEncoding(encoding) {
        if (encoding && !isBufferEncoding(encoding)) {
          throw new Error('Unknown encoding: ' + encoding);
        }
      }
      var StringDecoder = exports.StringDecoder = function(encoding) {
        this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
        assertEncoding(encoding);
        switch (this.encoding) {
          case 'utf8':
            this.surrogateSize = 3;
            break;
          case 'ucs2':
          case 'utf16le':
            this.surrogateSize = 2;
            this.detectIncompleteChar = utf16DetectIncompleteChar;
            break;
          case 'base64':
            this.surrogateSize = 3;
            this.detectIncompleteChar = base64DetectIncompleteChar;
            break;
          default:
            this.write = passThroughWrite;
            return;
        }
        this.charBuffer = new Buffer(6);
        this.charReceived = 0;
        this.charLength = 0;
      };
      StringDecoder.prototype.write = function(buffer) {
        var charStr = '';
        while (this.charLength) {
          var available = (buffer.length >= this.charLength - this.charReceived) ? this.charLength - this.charReceived : buffer.length;
          buffer.copy(this.charBuffer, this.charReceived, 0, available);
          this.charReceived += available;
          if (this.charReceived < this.charLength) {
            return '';
          }
          buffer = buffer.slice(available, buffer.length);
          charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);
          var charCode = charStr.charCodeAt(charStr.length - 1);
          if (charCode >= 0xD800 && charCode <= 0xDBFF) {
            this.charLength += this.surrogateSize;
            charStr = '';
            continue;
          }
          this.charReceived = this.charLength = 0;
          if (buffer.length === 0) {
            return charStr;
          }
          break;
        }
        this.detectIncompleteChar(buffer);
        var end = buffer.length;
        if (this.charLength) {
          buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
          end -= this.charReceived;
        }
        charStr += buffer.toString(this.encoding, 0, end);
        var end = charStr.length - 1;
        var charCode = charStr.charCodeAt(end);
        if (charCode >= 0xD800 && charCode <= 0xDBFF) {
          var size = this.surrogateSize;
          this.charLength += size;
          this.charReceived += size;
          this.charBuffer.copy(this.charBuffer, size, 0, size);
          buffer.copy(this.charBuffer, 0, 0, size);
          return charStr.substring(0, end);
        }
        return charStr;
      };
      StringDecoder.prototype.detectIncompleteChar = function(buffer) {
        var i = (buffer.length >= 3) ? 3 : buffer.length;
        for (; i > 0; i--) {
          var c = buffer[buffer.length - i];
          if (i == 1 && c >> 5 == 0x06) {
            this.charLength = 2;
            break;
          }
          if (i <= 2 && c >> 4 == 0x0E) {
            this.charLength = 3;
            break;
          }
          if (i <= 3 && c >> 3 == 0x1E) {
            this.charLength = 4;
            break;
          }
        }
        this.charReceived = i;
      };
      StringDecoder.prototype.end = function(buffer) {
        var res = '';
        if (buffer && buffer.length)
          res = this.write(buffer);
        if (this.charReceived) {
          var cr = this.charReceived;
          var buf = this.charBuffer;
          var enc = this.encoding;
          res += buf.slice(0, cr).toString(enc);
        }
        return res;
      };
      function passThroughWrite(buffer) {
        return buffer.toString(this.encoding);
      }
      function utf16DetectIncompleteChar(buffer) {
        this.charReceived = buffer.length % 2;
        this.charLength = this.charReceived ? 2 : 0;
      }
      function base64DetectIncompleteChar(buffer) {
        this.charReceived = buffer.length % 3;
        this.charLength = this.charReceived ? 3 : 0;
      }
    }, {"8": 8}],
    85: [function(_dereq_, module, exports) {
      arguments[4][75][0].apply(exports, arguments);
    }, {
      "10": 10,
      "23": 23,
      "63": 63,
      "75": 75,
      "86": 86,
      "88": 88
    }],
    86: [function(_dereq_, module, exports) {
      arguments[4][77][0].apply(exports, arguments);
    }, {
      "10": 10,
      "15": 15,
      "23": 23,
      "25": 25,
      "63": 63,
      "64": 64,
      "7": 7,
      "77": 77,
      "8": 8,
      "84": 84,
      "85": 85
    }],
    87: [function(_dereq_, module, exports) {
      arguments[4][78][0].apply(exports, arguments);
    }, {
      "10": 10,
      "23": 23,
      "78": 78,
      "85": 85
    }],
    88: [function(_dereq_, module, exports) {
      arguments[4][79][0].apply(exports, arguments);
    }, {
      "10": 10,
      "15": 15,
      "23": 23,
      "63": 63,
      "79": 79,
      "8": 8,
      "85": 85,
      "93": 93
    }],
    89: [function(_dereq_, module, exports) {
      arguments[4][82][0].apply(exports, arguments);
    }, {
      "82": 82,
      "87": 87
    }],
    90: [function(_dereq_, module, exports) {
      arguments[4][31][0].apply(exports, arguments);
    }, {"31": 31}],
    91: [function(_dereq_, module, exports) {
      (function(process) {
        var Transform = _dereq_(89),
            inherits = _dereq_(95).inherits,
            xtend = _dereq_(90);
        function DestroyableTransform(opts) {
          Transform.call(this, opts);
          this._destroyed = false;
        }
        inherits(DestroyableTransform, Transform);
        DestroyableTransform.prototype.destroy = function(err) {
          if (this._destroyed)
            return;
          this._destroyed = true;
          var self = this;
          process.nextTick(function() {
            if (err)
              self.emit('error', err);
            self.emit('close');
          });
        };
        function noop(chunk, enc, callback) {
          callback(null, chunk);
        }
        function through2(construct) {
          return function(options, transform, flush) {
            if (typeof options == 'function') {
              flush = transform;
              transform = options;
              options = {};
            }
            if (typeof transform != 'function')
              transform = noop;
            if (typeof flush != 'function')
              flush = null;
            return construct(options, transform, flush);
          };
        }
        module.exports = through2(function(options, transform, flush) {
          var t2 = new DestroyableTransform(options);
          t2._transform = transform;
          if (flush)
            t2._flush = flush;
          return t2;
        });
        module.exports.ctor = through2(function(options, transform, flush) {
          function Through2(override) {
            if (!(this instanceof Through2))
              return new Through2(override);
            this.options = xtend(options, override);
            DestroyableTransform.call(this, this.options);
          }
          inherits(Through2, DestroyableTransform);
          Through2.prototype._transform = transform;
          if (flush)
            Through2.prototype._flush = flush;
          return Through2;
        });
        module.exports.obj = through2(function(options, transform, flush) {
          var t2 = new DestroyableTransform(xtend({
            objectMode: true,
            highWaterMark: 16
          }, options));
          t2._transform = transform;
          if (flush)
            t2._flush = flush;
          return t2;
        });
      }).call(this, _dereq_(64));
    }, {
      "64": 64,
      "89": 89,
      "90": 90,
      "95": 95
    }],
    92: [function(_dereq_, module, exports) {
      'use strict';
      function Queue() {
        this.length = 0;
      }
      Queue.prototype.push = function(item) {
        var node = {item: item};
        if (this.last) {
          this.last = this.last.next = node;
        } else {
          this.last = this.first = node;
        }
        this.length++;
      };
      Queue.prototype.shift = function() {
        var node = this.first;
        if (node) {
          this.first = node.next;
          if (!(--this.length)) {
            this.last = undefined;
          }
          return node.item;
        }
      };
      Queue.prototype.slice = function(start, end) {
        start = typeof start === 'undefined' ? 0 : start;
        end = typeof end === 'undefined' ? Infinity : end;
        var output = [];
        var i = 0;
        for (var node = this.first; node; node = node.next) {
          if (--end < 0) {
            break;
          } else if (++i > start) {
            output.push(node.item);
          }
        }
        return output;
      };
      module.exports = Queue;
    }, {}],
    93: [function(_dereq_, module, exports) {
      (function(global) {
        module.exports = deprecate;
        function deprecate(fn, msg) {
          if (config('noDeprecation')) {
            return fn;
          }
          var warned = false;
          function deprecated() {
            if (!warned) {
              if (config('throwDeprecation')) {
                throw new Error(msg);
              } else if (config('traceDeprecation')) {
                console.trace(msg);
              } else {
                console.warn(msg);
              }
              warned = true;
            }
            return fn.apply(this, arguments);
          }
          return deprecated;
        }
        function config(name) {
          try {
            if (!global.localStorage)
              return false;
          } catch (_) {
            return false;
          }
          var val = global.localStorage[name];
          if (null == val)
            return false;
          return String(val).toLowerCase() === 'true';
        }
      }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {}],
    94: [function(_dereq_, module, exports) {
      module.exports = function isBuffer(arg) {
        return arg && typeof arg === 'object' && typeof arg.copy === 'function' && typeof arg.fill === 'function' && typeof arg.readUInt8 === 'function';
      };
    }, {}],
    95: [function(_dereq_, module, exports) {
      (function(process, global) {
        var formatRegExp = /%[sdj%]/g;
        exports.format = function(f) {
          if (!isString(f)) {
            var objects = [];
            for (var i = 0; i < arguments.length; i++) {
              objects.push(inspect(arguments[i]));
            }
            return objects.join(' ');
          }
          var i = 1;
          var args = arguments;
          var len = args.length;
          var str = String(f).replace(formatRegExp, function(x) {
            if (x === '%%')
              return '%';
            if (i >= len)
              return x;
            switch (x) {
              case '%s':
                return String(args[i++]);
              case '%d':
                return Number(args[i++]);
              case '%j':
                try {
                  return JSON.stringify(args[i++]);
                } catch (_) {
                  return '[Circular]';
                }
              default:
                return x;
            }
          });
          for (var x = args[i]; i < len; x = args[++i]) {
            if (isNull(x) || !isObject(x)) {
              str += ' ' + x;
            } else {
              str += ' ' + inspect(x);
            }
          }
          return str;
        };
        exports.deprecate = function(fn, msg) {
          if (isUndefined(global.process)) {
            return function() {
              return exports.deprecate(fn, msg).apply(this, arguments);
            };
          }
          if (process.noDeprecation === true) {
            return fn;
          }
          var warned = false;
          function deprecated() {
            if (!warned) {
              if (process.throwDeprecation) {
                throw new Error(msg);
              } else if (process.traceDeprecation) {
                console.trace(msg);
              } else {
                console.error(msg);
              }
              warned = true;
            }
            return fn.apply(this, arguments);
          }
          return deprecated;
        };
        var debugs = {};
        var debugEnviron;
        exports.debuglog = function(set) {
          if (isUndefined(debugEnviron))
            debugEnviron = process.env.NODE_DEBUG || '';
          set = set.toUpperCase();
          if (!debugs[set]) {
            if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
              var pid = process.pid;
              debugs[set] = function() {
                var msg = exports.format.apply(exports, arguments);
                console.error('%s %d: %s', set, pid, msg);
              };
            } else {
              debugs[set] = function() {};
            }
          }
          return debugs[set];
        };
        function inspect(obj, opts) {
          var ctx = {
            seen: [],
            stylize: stylizeNoColor
          };
          if (arguments.length >= 3)
            ctx.depth = arguments[2];
          if (arguments.length >= 4)
            ctx.colors = arguments[3];
          if (isBoolean(opts)) {
            ctx.showHidden = opts;
          } else if (opts) {
            exports._extend(ctx, opts);
          }
          if (isUndefined(ctx.showHidden))
            ctx.showHidden = false;
          if (isUndefined(ctx.depth))
            ctx.depth = 2;
          if (isUndefined(ctx.colors))
            ctx.colors = false;
          if (isUndefined(ctx.customInspect))
            ctx.customInspect = true;
          if (ctx.colors)
            ctx.stylize = stylizeWithColor;
          return formatValue(ctx, obj, ctx.depth);
        }
        exports.inspect = inspect;
        inspect.colors = {
          'bold': [1, 22],
          'italic': [3, 23],
          'underline': [4, 24],
          'inverse': [7, 27],
          'white': [37, 39],
          'grey': [90, 39],
          'black': [30, 39],
          'blue': [34, 39],
          'cyan': [36, 39],
          'green': [32, 39],
          'magenta': [35, 39],
          'red': [31, 39],
          'yellow': [33, 39]
        };
        inspect.styles = {
          'special': 'cyan',
          'number': 'yellow',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          'regexp': 'red'
        };
        function stylizeWithColor(str, styleType) {
          var style = inspect.styles[styleType];
          if (style) {
            return '\u001b[' + inspect.colors[style][0] + 'm' + str + '\u001b[' + inspect.colors[style][1] + 'm';
          } else {
            return str;
          }
        }
        function stylizeNoColor(str, styleType) {
          return str;
        }
        function arrayToHash(array) {
          var hash = {};
          array.forEach(function(val, idx) {
            hash[val] = true;
          });
          return hash;
        }
        function formatValue(ctx, value, recurseTimes) {
          if (ctx.customInspect && value && isFunction(value.inspect) && value.inspect !== exports.inspect && !(value.constructor && value.constructor.prototype === value)) {
            var ret = value.inspect(recurseTimes, ctx);
            if (!isString(ret)) {
              ret = formatValue(ctx, ret, recurseTimes);
            }
            return ret;
          }
          var primitive = formatPrimitive(ctx, value);
          if (primitive) {
            return primitive;
          }
          var keys = Object.keys(value);
          var visibleKeys = arrayToHash(keys);
          if (ctx.showHidden) {
            keys = Object.getOwnPropertyNames(value);
          }
          if (isError(value) && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
            return formatError(value);
          }
          if (keys.length === 0) {
            if (isFunction(value)) {
              var name = value.name ? ': ' + value.name : '';
              return ctx.stylize('[Function' + name + ']', 'special');
            }
            if (isRegExp(value)) {
              return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
            }
            if (isDate(value)) {
              return ctx.stylize(Date.prototype.toString.call(value), 'date');
            }
            if (isError(value)) {
              return formatError(value);
            }
          }
          var base = '',
              array = false,
              braces = ['{', '}'];
          if (isArray(value)) {
            array = true;
            braces = ['[', ']'];
          }
          if (isFunction(value)) {
            var n = value.name ? ': ' + value.name : '';
            base = ' [Function' + n + ']';
          }
          if (isRegExp(value)) {
            base = ' ' + RegExp.prototype.toString.call(value);
          }
          if (isDate(value)) {
            base = ' ' + Date.prototype.toUTCString.call(value);
          }
          if (isError(value)) {
            base = ' ' + formatError(value);
          }
          if (keys.length === 0 && (!array || value.length == 0)) {
            return braces[0] + base + braces[1];
          }
          if (recurseTimes < 0) {
            if (isRegExp(value)) {
              return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
            } else {
              return ctx.stylize('[Object]', 'special');
            }
          }
          ctx.seen.push(value);
          var output;
          if (array) {
            output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
          } else {
            output = keys.map(function(key) {
              return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
            });
          }
          ctx.seen.pop();
          return reduceToSingleString(output, base, braces);
        }
        function formatPrimitive(ctx, value) {
          if (isUndefined(value))
            return ctx.stylize('undefined', 'undefined');
          if (isString(value)) {
            var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '').replace(/'/g, "\\'").replace(/\\"/g, '"') + '\'';
            return ctx.stylize(simple, 'string');
          }
          if (isNumber(value))
            return ctx.stylize('' + value, 'number');
          if (isBoolean(value))
            return ctx.stylize('' + value, 'boolean');
          if (isNull(value))
            return ctx.stylize('null', 'null');
        }
        function formatError(value) {
          return '[' + Error.prototype.toString.call(value) + ']';
        }
        function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
          var output = [];
          for (var i = 0,
              l = value.length; i < l; ++i) {
            if (hasOwnProperty(value, String(i))) {
              output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, String(i), true));
            } else {
              output.push('');
            }
          }
          keys.forEach(function(key) {
            if (!key.match(/^\d+$/)) {
              output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, key, true));
            }
          });
          return output;
        }
        function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
          var name,
              str,
              desc;
          desc = Object.getOwnPropertyDescriptor(value, key) || {value: value[key]};
          if (desc.get) {
            if (desc.set) {
              str = ctx.stylize('[Getter/Setter]', 'special');
            } else {
              str = ctx.stylize('[Getter]', 'special');
            }
          } else {
            if (desc.set) {
              str = ctx.stylize('[Setter]', 'special');
            }
          }
          if (!hasOwnProperty(visibleKeys, key)) {
            name = '[' + key + ']';
          }
          if (!str) {
            if (ctx.seen.indexOf(desc.value) < 0) {
              if (isNull(recurseTimes)) {
                str = formatValue(ctx, desc.value, null);
              } else {
                str = formatValue(ctx, desc.value, recurseTimes - 1);
              }
              if (str.indexOf('\n') > -1) {
                if (array) {
                  str = str.split('\n').map(function(line) {
                    return '  ' + line;
                  }).join('\n').substr(2);
                } else {
                  str = '\n' + str.split('\n').map(function(line) {
                    return '   ' + line;
                  }).join('\n');
                }
              }
            } else {
              str = ctx.stylize('[Circular]', 'special');
            }
          }
          if (isUndefined(name)) {
            if (array && key.match(/^\d+$/)) {
              return str;
            }
            name = JSON.stringify('' + key);
            if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
              name = name.substr(1, name.length - 2);
              name = ctx.stylize(name, 'name');
            } else {
              name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
              name = ctx.stylize(name, 'string');
            }
          }
          return name + ': ' + str;
        }
        function reduceToSingleString(output, base, braces) {
          var numLinesEst = 0;
          var length = output.reduce(function(prev, cur) {
            numLinesEst++;
            if (cur.indexOf('\n') >= 0)
              numLinesEst++;
            return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
          }, 0);
          if (length > 60) {
            return braces[0] + (base === '' ? '' : base + '\n ') + ' ' + output.join(',\n  ') + ' ' + braces[1];
          }
          return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
        }
        function isArray(ar) {
          return Array.isArray(ar);
        }
        exports.isArray = isArray;
        function isBoolean(arg) {
          return typeof arg === 'boolean';
        }
        exports.isBoolean = isBoolean;
        function isNull(arg) {
          return arg === null;
        }
        exports.isNull = isNull;
        function isNullOrUndefined(arg) {
          return arg == null;
        }
        exports.isNullOrUndefined = isNullOrUndefined;
        function isNumber(arg) {
          return typeof arg === 'number';
        }
        exports.isNumber = isNumber;
        function isString(arg) {
          return typeof arg === 'string';
        }
        exports.isString = isString;
        function isSymbol(arg) {
          return typeof arg === 'symbol';
        }
        exports.isSymbol = isSymbol;
        function isUndefined(arg) {
          return arg === void 0;
        }
        exports.isUndefined = isUndefined;
        function isRegExp(re) {
          return isObject(re) && objectToString(re) === '[object RegExp]';
        }
        exports.isRegExp = isRegExp;
        function isObject(arg) {
          return typeof arg === 'object' && arg !== null;
        }
        exports.isObject = isObject;
        function isDate(d) {
          return isObject(d) && objectToString(d) === '[object Date]';
        }
        exports.isDate = isDate;
        function isError(e) {
          return isObject(e) && (objectToString(e) === '[object Error]' || e instanceof Error);
        }
        exports.isError = isError;
        function isFunction(arg) {
          return typeof arg === 'function';
        }
        exports.isFunction = isFunction;
        function isPrimitive(arg) {
          return arg === null || typeof arg === 'boolean' || typeof arg === 'number' || typeof arg === 'string' || typeof arg === 'symbol' || typeof arg === 'undefined';
        }
        exports.isPrimitive = isPrimitive;
        exports.isBuffer = _dereq_(94);
        function objectToString(o) {
          return Object.prototype.toString.call(o);
        }
        function pad(n) {
          return n < 10 ? '0' + n.toString(10) : n.toString(10);
        }
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        function timestamp() {
          var d = new Date();
          var time = [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(':');
          return [d.getDate(), months[d.getMonth()], time].join(' ');
        }
        exports.log = function() {
          console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
        };
        exports.inherits = _dereq_(23);
        exports._extend = function(origin, add) {
          if (!add || !isObject(add))
            return origin;
          var keys = Object.keys(add);
          var i = keys.length;
          while (i--) {
            origin[keys[i]] = add[keys[i]];
          }
          return origin;
        };
        function hasOwnProperty(obj, prop) {
          return Object.prototype.hasOwnProperty.call(obj, prop);
        }
      }).call(this, _dereq_(64), typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {
      "23": 23,
      "64": 64,
      "94": 94
    }],
    96: [function(_dereq_, module, exports) {
      'use strict';
      exports.stringify = function stringify(input) {
        var queue = [];
        queue.push({obj: input});
        var res = '';
        var next,
            obj,
            prefix,
            val,
            i,
            arrayPrefix,
            keys,
            k,
            key,
            value,
            objPrefix;
        while ((next = queue.pop())) {
          obj = next.obj;
          prefix = next.prefix || '';
          val = next.val || '';
          res += prefix;
          if (val) {
            res += val;
          } else if (typeof obj !== 'object') {
            res += typeof obj === 'undefined' ? null : JSON.stringify(obj);
          } else if (obj === null) {
            res += 'null';
          } else if (Array.isArray(obj)) {
            queue.push({val: ']'});
            for (i = obj.length - 1; i >= 0; i--) {
              arrayPrefix = i === 0 ? '' : ',';
              queue.push({
                obj: obj[i],
                prefix: arrayPrefix
              });
            }
            queue.push({val: '['});
          } else {
            keys = [];
            for (k in obj) {
              if (obj.hasOwnProperty(k)) {
                keys.push(k);
              }
            }
            queue.push({val: '}'});
            for (i = keys.length - 1; i >= 0; i--) {
              key = keys[i];
              value = obj[key];
              objPrefix = (i > 0 ? ',' : '');
              objPrefix += JSON.stringify(key) + ':';
              queue.push({
                obj: value,
                prefix: objPrefix
              });
            }
            queue.push({val: '{'});
          }
        }
        return res;
      };
      function pop(obj, stack, metaStack) {
        var lastMetaElement = metaStack[metaStack.length - 1];
        if (obj === lastMetaElement.element) {
          metaStack.pop();
          lastMetaElement = metaStack[metaStack.length - 1];
        }
        var element = lastMetaElement.element;
        var lastElementIndex = lastMetaElement.index;
        if (Array.isArray(element)) {
          element.push(obj);
        } else if (lastElementIndex === stack.length - 2) {
          var key = stack.pop();
          element[key] = obj;
        } else {
          stack.push(obj);
        }
      }
      exports.parse = function(str) {
        var stack = [];
        var metaStack = [];
        var i = 0;
        var collationIndex,
            parsedNum,
            numChar;
        var parsedString,
            lastCh,
            numConsecutiveSlashes,
            ch;
        var arrayElement,
            objElement;
        while (true) {
          collationIndex = str[i++];
          if (collationIndex === '}' || collationIndex === ']' || typeof collationIndex === 'undefined') {
            if (stack.length === 1) {
              return stack.pop();
            } else {
              pop(stack.pop(), stack, metaStack);
              continue;
            }
          }
          switch (collationIndex) {
            case ' ':
            case '\t':
            case '\n':
            case ':':
            case ',':
              break;
            case 'n':
              i += 3;
              pop(null, stack, metaStack);
              break;
            case 't':
              i += 3;
              pop(true, stack, metaStack);
              break;
            case 'f':
              i += 4;
              pop(false, stack, metaStack);
              break;
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
            case '-':
              parsedNum = '';
              i--;
              while (true) {
                numChar = str[i++];
                if (/[\d\.\-e\+]/.test(numChar)) {
                  parsedNum += numChar;
                } else {
                  i--;
                  break;
                }
              }
              pop(parseFloat(parsedNum), stack, metaStack);
              break;
            case '"':
              parsedString = '';
              lastCh = void 0;
              numConsecutiveSlashes = 0;
              while (true) {
                ch = str[i++];
                if (ch !== '"' || (lastCh === '\\' && numConsecutiveSlashes % 2 === 1)) {
                  parsedString += ch;
                  lastCh = ch;
                  if (lastCh === '\\') {
                    numConsecutiveSlashes++;
                  } else {
                    numConsecutiveSlashes = 0;
                  }
                } else {
                  break;
                }
              }
              pop(JSON.parse('"' + parsedString + '"'), stack, metaStack);
              break;
            case '[':
              arrayElement = {
                element: [],
                index: stack.length
              };
              stack.push(arrayElement.element);
              metaStack.push(arrayElement);
              break;
            case '{':
              objElement = {
                element: {},
                index: stack.length
              };
              stack.push(objElement.element);
              metaStack.push(objElement);
              break;
            default:
              throw new Error('unexpectedly reached end of input: ' + collationIndex);
          }
        }
      };
    }, {}],
    97: [function(_dereq_, module, exports) {
      arguments[4][40][0].apply(exports, arguments);
    }, {"40": 40}]
  }, {}, [1]);
})(require('buffer').Buffer, require('process'));