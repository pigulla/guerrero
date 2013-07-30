var util = require('util');

var _ = require('lodash'),
    time = require('time'),
    winston = require('winston');


/**
 * A helper class for normalizing values in the object returned by `mediainfo`.
 *
 * @class guerrero.util.MediaInfoNormalizer
 * @constructor
 * @param {Object} options
 * @cfg {boolean} [bail=false] If set, an exception is thrown if an unparsable value is encountered.
 */
var MediaInfoNormalizer = function (options) {
    var opts = _.defaults(options || {}, {
        bail: false
    });

    this._bail = opts.bail;
};


/*jshint -W030*/
/**
 * See `{@link #cfg-bail}`.
 *
 * @private
 * @property {boolean} _bail
 */
MediaInfoNormalizer.prototype._bail;
/*jshint +W030*/


/**
 *
 * @private
 * @throws Error
 */
MediaInfoNormalizer.prototype._warn = function () {
    var msg = util.format.apply(util, arguments);
    winston.warn(msg);

    if (this._bail) {
        throw new Error(msg);
    }
};


/**
 *
 * @private
 * @param {string} str
 * @return {?boolean}
 */
MediaInfoNormalizer.prototype._parseBool = function (str) {
    switch (str) {
    case 'Yes':
        return true;
    case 'No':
        return false;
    default:
        this._warn('unparsable bool value "%s"', str);
        return null;
    }
};


/**
 *
 * @private
 * @param {string} str
 * @return {?number}
 */
MediaInfoNormalizer.prototype._parseBitrate = function (str) {
    var parts = str.split(' '),
        unit = parts[parts.length - 1],
        value = parts.splice(0, parts.length - 1).join(''),
        mult = {
            Tbps: 10e12,
            Gbps: 10e9,
            Mbps: 10e6,
            Kbps: 10e3,
            bps: 1
        };

    if (!mult.hasOwnProperty(unit)) {
        this._warn('unparsable bitrate unit "%s"', unit);
        return null;
    }
    if (!/^\d+(\s\d{3})*(\.\d+)?$/.test(value)) {
        this._warn('unparsable bitrate value "%s"', value);
        return null;
    }

    return mult[unit] * parseFloat(value.replace(/ /g, ''));
};


/**
 *
 * @private
 * @param {string} str
 * @return {?number}
 */
MediaInfoNormalizer.prototype._parseFileSize = function (str) {
    var parts = str.split(' '),
        mult = {
            PiB: Math.pow(2, 50),
            TiB: Math.pow(2, 40),
            GiB: Math.pow(2, 30),
            MiB: Math.pow(2, 20),
            KiB: Math.pow(2, 10),
            Bytes: 1
        };

    if (parts.length !== 2) {
        this._warn('unparsable filesize string "%s"', str);
        return null;
    }
    if (!mult.hasOwnProperty(parts[1])) {
        this._warn('unparsable filesize unit "%s"', parts[1]);
        return null;
    }
    if (!/^\d+(\.\d+)?$/.test(parts[0])) {
        this._warn('unparsable filesize value "%s"', parts[0]);
        return null;
    }

    return Math.round(mult[parts[1]] * parseFloat(parts[0]));
};


/**
 *
 * @private
 * @param {string} str
 * @return {?number}
 */
MediaInfoNormalizer.prototype._parseSamplingRate = function (str) {
    var parts = str.split(' '),
        mult = {
            GHz: 10e9,
            MHz: 10e6,
            KHz: 10e3,
            Hz: 1
        };

    if (parts.length !== 2) {
        this._warn('unparsable sampling rate string "%s"', str);
        return null;
    }
    if (!mult.hasOwnProperty(parts[1])) {
        this._warn('unparsable sampling rate unit "%s"', parts[1]);
        return null;
    }
    if (!/^\d+(\.\d+)?$/.test(parts[0])) {
        this._warn('unparsable sampling rate value "%s"', parts[0]);
        return null;
    }

    return mult[parts[1]] * parseFloat(parts[0]);
};


/**
 *
 * @private
 * @param {string} str
 * @return {?number}
 */
MediaInfoNormalizer.prototype._parseTime = function (str) {
    var parts = str.split(' '),
        result = 0,
        i,
        part,
        matches,
        mult = {
            h: 3600,
            mn: 60,
            s: 1,
            ms: 0.001
        };

    for (i = 0; i < parts.length; ++i) {
        part = parts[i];
        matches = part.match(/^(\d+)(\w+)$/);

        if (!mult.hasOwnProperty(matches[2])) {
            this._warn('unparsable time unit "%s"', matches[2]);
            return null;
        }
        if (!/^\d+$/.test(matches[1])) {
            this._warn('unparsable time value "%s"', matches[1]);
            return null;
        }

        result += parseInt(matches[1], 10) * mult[matches[2]];
    }

    return result;
};


/**
 *
 * @private
 * @param {string} str
 * @param {string} unit
 * @param {string=} spaceSep
 * @return {?number}
 */
MediaInfoNormalizer.prototype._parseIntUnit = function (str, unit, spaceSep) {
    var regexp = new RegExp('^(\\d{1,3}(?:' + (spaceSep ? '\\s' : '') + '\\d{3})*) ' + unit + '$'),
        matches = str.match(regexp);

    if (!matches) {
        this._warn('unparsable int value "%s"', str);
        return null;
    }

    if (spaceSep) {
        matches[1] = matches[1].replace(/\s/g, '');
    }

    return parseInt(matches[1], 10);
};


/**
 *
 * @private
 * @param {string} str
 * @param {string} unit
 * @return {?number}
 */
MediaInfoNormalizer.prototype._parseFloatUnit = function (str, unit) {
    var regexp = new RegExp('^(\\d+\\.\\d+) ' + unit + '$'),
        matches = str.match(regexp);

    if (!matches) {
        this._warn('unparsable float value "%s"', str);
        return null;
    }

    return parseFloat(matches[1]);
};


/**
 *
 * @private
 * @param {Object} track
 * @return {Object}
 */
MediaInfoNormalizer.prototype._normalizeTrack = function (track) {
    _.each(track, function (v, k) {
        /*jshint -W074*/
        if (/^_\d{2}_\d{2}_\d{5}$/.test(k)) {
            return;
        }

        switch (k) {
        case 'format_settings__floor':
        case 'id':
        case 'streamid':
            track[k] = parseInt(track[k], 10);
            break;

        case 'bits__pixel_frame_':
            track[k] = parseFloat(track[k]);
            break;

        case 'default':
        case 'forced':
        case 'format_settings__bvop':
        case 'format_settings__qpel':
        case 'format_settings__cabac':
            track[k] = this._parseBool(v);
            break;

        case 'duration':
        case 'delay_relative_to_video':
            track[k] = this._parseTime(v);
            break;

        case 'width':
        case 'height':
        case 'original_width':
        case 'original_height':
            track[k] = this._parseIntUnit(v, 'pixels', true);
            break;

        case 'original_frame_rate':
        case 'frame_rate':
            track[k] = this._parseFloatUnit(v, 'fps');
            break;

        case 'format_settings__reframes':
            track[k] = this._parseIntUnit(v, 'frames');
            break;

        case 'channel_s_':
            track[k] = this._parseIntUnit(v, 'channels?');
            break;

        case 'bit_depth':
            track[k] = this._parseIntUnit(v, 'bits');
            break;

        case 'bit_rate':
        case 'maximum_bit_rate':
        case 'minimum_bit_rate':
        case 'nominal_bit_rate':
            track[k] = this._parseBitrate(v);
            break;

        case 'sampling_rate':
            track[k] = this._parseSamplingRate(v);
            break;

        case 'stream_size':
            track[k] = this._parseFileSize(v);
            break;

        case 'bit_rate_mode':
        case 'channel_positions':
        case 'chroma_subsampling':
        case 'codec_id':
        case 'codec_id_info':
        case 'color_primaries':
        case 'color_space':
        case 'compression_mode':
        case 'display_aspect_ratio':
        case 'encoded_application_url':
        case 'encoding_settings':
        case 'format':
        case 'format_info':
        case 'format_profile':
        case 'format_settings__endianness':
        case 'frame_rate_mode':
        case 'language':
        case 'matrix_coefficients':
        case 'mode':
        case 'mode_extension':
        case 'muxing_mode':
        case 'original_display_aspect_ratio':
        case 'scan_type':
        case 'standard':
        case 'title':
        case 'transfer_characteristics':
        case 'type':
        case 'writing_application':
        case 'writing_library':
            break;

        default:
            winston.warn('unhandled track property: "%s" with value "%s"', k, v);
        }
    }, this);

    return track;
};


/**
 *
 * @private
 * @param {Object} info
 * @return {Object}
 */
MediaInfoNormalizer.prototype._normalizeInfo = function (info) {
    _.each(info, function (v, k) {
        /*jshint -W074*/
        switch (k) {
        case 'attachment':
            info[k] = this._parseBool(v);
            break;

        case 'duration':
            info[k] = this._parseTime(v);
            break;

        case 'file_size':
            info[k] = this._parseFileSize(v);
            break;

        case 'overall_bit_rate':
            info[k] = this._parseIntUnit(v, 'bps', '\\s');
            break;

        case 'encoded_date':
            var timezone = v.split(' ', 1)[0];
            info[k] = +new time.Date(v.substring(timezone.length + 1), timezone);
            break;

        case 'complete_name':
        case 'format':
        case 'format_version':
        case 'movie_name':
        case 'overall_bit_rate_mode':
        case 'tracks':
        case 'unique_id':
        case 'writing_application':
        case 'writing_library':
            break;

        default:
            winston.warn('unhandled track property: "%s" with value "%s"', k, v);
        }
    }, this);

    return info;
};


/**
 * Normalizes the mediainfo object.
 *
 * @param {Object} info
 * @return {Object}
 */
MediaInfoNormalizer.prototype.normalize = function (info) {
    this._normalizeInfo(info);

    info.tracks.forEach(function (track) {
        this._normalizeTrack(track);
    }, this);

    return info;
};


/**
 * @ignore
 */
module.exports = MediaInfoNormalizer;
