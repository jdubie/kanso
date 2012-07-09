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

exports.summary = 'Stops all servers and wipes testing couch instance';

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
      function (callback) { seedUsers(data, callback); }
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
