var _ = require('lodash'),
    XRegExp = require('xregexp').XRegExp;

var regex = {
        lsFile: new XRegExp(
            '^  (?<filename>.+?)\\s+(R\\s)?(?<size>\\d+)  ' +
            '(?<date>[A-Z][a-z]{2} [A-Z][a-z]{2}\\s+\\d{1,2} \\d{1,2}:\\d{2}:\\d{2} \\d{4})$'
        ),
        lsDir: new XRegExp(
            '^  (?<filename>.+?)\\s+D\\s+(?<size>0)  ' +
            '(?<date>[A-Z][a-z]{2} [A-Z][a-z]{2}\\s+\\d{1,2} \\d{1,2}:\\d{2}:\\d{2} \\d{4})$'
        ),
        duTotal: new XRegExp(
            '^\\s*Total number of bytes:\\s*(?<bytes>\\d+)\\s*$'
        ),
        duBlocks: new XRegExp(
            '^\\s*(?<count>\\d+) blocks of size (?<size>\\d+)\\. (?<available>\\d+) blocks available\\s*$'
        )
    };

/**
 * Parser for the output from various SMB commands.
 *
 * @class guerrero.collector.util.SmbParser
 * @static
 */
var SmbParser = {};

/**
 * Parses the output of an SMB `du` command.
 *
 * @static
 * @param {string} output
 * @return {Object.<{total:number,blocks:Object.<string,number>}>}
 */
SmbParser.du = function (output) {
    var result = {
        total: null,
        blocks: {}
    };

    // TODO: we don't really need to split by lines first, we can just use one regexp
    output.split('\n').forEach(function (line) {
        /*jshint -W084*/
        var matches;

        if (matches = XRegExp.exec(line, regex.duTotal)) {
            result.total = parseInt(matches.bytes, 10);
        } else if (matches = XRegExp.exec(line, regex.duBlocks)) {
            result.blocks.count = parseInt(matches.count, 10);
            result.blocks.size = parseInt(matches.size, 10);
            result.blocks.available = parseInt(matches.available, 10);
        }
    });

    return result;
};


/**
 * Parses the output of an SMB `ls` command.
 *
 * @static
 * @param {string} output
 * @return {Object.<{string:Array.<Object>,directories:Array.<Object>}>}
 */
SmbParser.ls = function (output) {
    var result = {
            files: [],
            directories: []
        };

    output.split('\n').forEach(function (line) {
        /*jshint -W084*/
        var matches;

        if (matches = XRegExp.exec(line, regex.lsDir)) {
            result.directories.push({
                name: matches.filename,
                date: new Date(matches.date)
            });
        } else if (matches = XRegExp.exec(line, regex.lsFile)) {
            result.files.push({
                name: matches.filename,
                size: parseInt(matches.size, 10),
                date: new Date(matches.date)
            });
        }
    });

    return result;
};


/**
 * @ignore
 */
module.exports = SmbParser;
