/**
 * Module dependencies
 */
var utils = require('../utils'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc'),
    url = require('url'),
    async = require('async'),
    underscore = require('underscore'),
    nano = require('nano');

/**
 * Usage information and docs
 */

exports.summary = 'Stops all servers and wipes testing couch instance';

exports.usage = '' +
'kanso wipe\n'

/**
 * Run function called when "kanso clean" command is used
 *
 * @param {Object} settings - the values from .kansorc files
 * @param {Array} args - command-line arguments
 */

exports.run = function (settings, args) {
  kansorc.extend({}, './.kansorc', function(err, settings) {

    instance = args[0] || 'default'
    if (instance == 'production' || instance == 'prod' || instance.match(/prod/)) {
      logger.error('will not wipe production!!');
      return;
    }
    logger.info('Wiping ' + instance);
    db = settings.env[instance];
    dbUrl = url.parse(db.db);
    dbUrl.pathname = ''; // we want to wipe everything
    urlString = url.format(dbUrl);
    nano = nano(urlString);

    destroyDbs(function (err, res) {
      if (err) logger.error(err);
      else {
        logger.info('Databases destroyed');
        logger.end();
      }
    });
  });

};

destroyDbs = function (callback) {
  nano.db.list(function (err, res) {
    // remove zipcode from db list
    dbs = _.reject(res,function(dbName) { if (dbName == 'zipcodes') return true; });
    async.map(dbs, nano.db.destroy, callback);
  });
};
