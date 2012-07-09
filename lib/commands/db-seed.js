/**
 * Module dependencies
 */
var utils = require('../utils'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc'),
    url = require('url'),
    async = require('async'),
    nano = require('nano');

/**
 * Usage information and docs
 */

exports.summary = 'Seeds the testing couch instance with data';

exports.usage = '' +
'kanso seed\n'

/**
 * Run function called when "kanso clean" command is used
 *
 * @param {Object} settings - the values from .kansorc files
 * @param {Array} args - command-line arguments
 */

exports.run = function (settings, args) {
  kansorc.extend({}, './.kansorc', function(err, settings) {

    instance = args[0] || 'default'
    logger.info('Seeding ' + instance);
    db = settings.env[instance];
    dbUrl = url.parse(db.db);
    dbUrl.pathname = ''; // we want to wipe everything
    urlString = url.format(dbUrl);
    nano = nano(urlString);
    
    path = utils.abspath('./db/test.js');
    data = fs.readFileSync(path).toString();
    data = eval(data); // TODO maybe should use JSON

    async.parallel([
      function (callback) { seedMain(data, callback); },
      function (callback) { seedUsers(data, callback); },
      function (callback) { seedUserDbs(data, callback); },
      function (callback) { seedMapperDb(callback); }
    ], function (err, res) {
      console.log(err,res);
      logger.end();
    });

  });
};

seedMain = function (data, callback) {
  nano.db.create('lifeswap', function (err, res) {
    db = nano.use('lifeswap');
    async.map(data.LIFESWAP, db.insert, callback);
  });
};

seedUsers = function (data,callback) {
  userdb = nano.use('_users');
  async.map(data.USERS, userdb.insert, callback);
};


createUserDb = function (ddoc, userDoc, callback) {
  var userId = userDoc.name;
  createDb = function (cb) {
    nano.db.create(userId, cb);
    //console.error("nano.db.create(" + userId + ", cb)");
  };
  addDdoc = function (cb) {
    // TODO: would be nice to do a deep copy of ddoc
    //      (so don't have to remember the fields in ddoc)
    var userDdoc = {
      _id: "_design/" + userId,
      filters: ddoc.filters,
      views: ddoc.views
    };
    var userdb = nano.db.use(userId);
    console.error(userDdoc);
    userdb.insert(userDdoc, cb);
    //console.error("userdb(" + userId + ").insert(ddoc, cb)");
    //console.error(ddoc);
  };

  async.series([createDb, addDdoc], callback);
};


seedUserDbs = function (data,callback) {
  createDb = async.apply(createUserDb, data.DDOC);
  async.map(data.USERS, createDb, callback);
};

seedMapperDb = function (callback) {
  nano.db.create('mapper', callback);
};

/*
  _results = [];
  for (_i = 0, _len = USERS.length; _i < _len; _i++) {
      doc = USERS[_i];
      _results.push(userdb.insert(doc, doc._id, function(err, body, header) {
        if (err) {
          return console.log(err);
        }
      }));
    }
    return _results;
  });

}).call(this);

};*/
