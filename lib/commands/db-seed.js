/**
 * Module dependencies
 */
var utils = require('../utils'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc'),
    exec = require('child_process').exec,
    url = require('url'),
    async = require('async'),
    nano = require('nano');

getUserDbName = function(args) {
  return "users_" + args.userId
};

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

    var instance = args[0] || 'default'
    logger.info('Seeding ' + instance);
    var db = settings.env[instance];
    var dbUrl = url.parse(db.db);
    dbUrl.pathname = ''; // we want to wipe everything
    var urlString = url.format(dbUrl);
    nano = nano(urlString);
    
    var path = utils.abspath('./db/test.js');
    var data = fs.readFileSync(path).toString();
    data = eval(data); // TODO maybe should use JSON

    exec('kanso push', function(err, res) {
      console.log(res);
      async.parallel([
        function (callback) { seedMain(data, callback); },
        function (callback) { seedUsers(data, callback); },
        function (callback) { createUserDbs(data, callback); }
      ], function (err, res) {
        seedUserDbs(data, function(err, res) {
          logger.end();
        });
      });
    });
  });
};

seedMain = function (data, callback) {
  db = nano.use('lifeswap');
  async.map(data.LIFESWAP, db.insert, callback);
};

seedUsers = function (data,callback) {
  userdb = nano.use('_users');
  async.map(data.USERS, userdb.insert, callback);
};


createUserDb = function (userDoc, callback) {
  userDbName = getUserDbName({'userId': userDoc.name});

  nano.db.create(userDbName, function(err, res) {
    // TODO: look into why there's a race condition / overwriting
    //       conflict if we do *no* re-do getting the DB name (somehow
    //       the name for user1's db gets overwritten by user2...
    //       But where is this memory shared??
    //       Same goes for doing userId = userDoc.name before this
    //       callback and then within the callback it is overwritten
    userDbName = getUserDbName({'userId': userDoc.name});
    userdb = nano.db.use(userDbName);

    security = {
      admins: {
        names: [],
        roles: []
      },
      members: {
        names: [userDoc.name],
        roles: []
      }
    }

    userdb.insert(security, '_security', callback);
  });
};


createUserDbs = function (data,callback) {
  async.map(data.USERS, createUserDb, callback);
};


replicateUserDdoc = function (userDoc, callback) {
  opts = { 'doc_ids': [ '_design/userddoc'] };
  userDbName = getUserDbName({'userId': userDoc.name});
  nano.db.replicate('userddocdb', userDbName, opts, callback);
};

seedUserDbs = function (data, callback) {
  async.map(data.USERS, replicateUserDdoc, callback);
};
