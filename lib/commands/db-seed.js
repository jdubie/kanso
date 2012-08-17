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
    if (instance == 'production') {
      logger.error('Will not seed production!!');
      return;
    }
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
      if (err) return logger.error({
        message: "Error pushing.",
         error: err
      });
      else {
        console.log(res);
        async.parallel([
          function (callback) { seedMain(data, callback); },
          function (callback) { seedUsers(data, callback); },
          function (callback) { createUserDbs(data, callback); }
        ], function (err, res) {
          seedUserDbs(data, function(err, res) {
            if (err) return logger.error({
              message: "Error seeding.",
               error: err
            });
            else logger.end();
          });
        });
      }
    });
  });
};

seedMain = function (data, callback) {
  var db = nano.use('lifeswap');
  async.map(data.LIFESWAP, db.insert, callback);
};

seedUsers = function (data,callback) {
  var userdb = nano.use('_users');
  async.map(data.USERS, userdb.insert, callback);
};


createUserDb = function (userDoc, callback) {
  var userId = userDoc.user_id;
  var userDbName = getUserDbName({'userId': userId});

  var security = {
    admins: {
      names: [],
      roles: []
    },
    members: {
      names: [userId],
      roles: []
    }
  }

  nano.db.create(userDbName, function(err, res) {
    var userdb = nano.db.use(userDbName);
    userdb.insert(security, '_security', callback);
  });
};


createUserDbs = function (data,callback) {
  async.map(data.USERS, createUserDb, callback);
};


replicateUserDdoc = function (userDoc, callback) {
  var opts = { 'doc_ids': [ '_design/userddoc'] };
  var userDbName = getUserDbName({userId: userDoc.user_id});
  nano.db.replicate('userddocdb', userDbName, opts, callback);
};

writeSeedDoc = function(doc, callback) {
  var userDbName = getUserDbName({userId: doc.user_id});
  db = nano.db.use(userDbName);

  db.insert(doc, callback); 
}
seedUserDbs = function (data, callback) {

  // add design docs
  var seedDDocs = function (cb) {
    async.map(data.USERS, replicateUserDdoc, cb);
  };

  // add seed documents to each db
  var seedDocs = function (cb) {
    async.map(data.USER_DOCS, writeSeedDoc, cb);
  };

  // make sure validation is in place before seeding
  async.series([seedDDocs, seedDocs], callback);
};
