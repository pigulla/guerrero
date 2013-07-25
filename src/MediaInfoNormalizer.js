var _ = require('lodash'),
    time = require('time'),
    winston = require('winston');

/*jshint -W074*/

/**
 * The abstract base class for all writer implementations.
 *
 * @class guerrero.MediaInfoNormalizer
 * @singleton
 * @constructor
 */
var MediaInfoNormalizer = function () {
};

function parseBool(value) {
    switch (value) {
    case 'Yes':
        return true;
    case 'No':
        return false;
    default:
        winston.error('unparsable bool value "%s"', value);
        return null;
    }
}

function parseBitrate(value) {
    var parts = value.split(' '),
        unit = parts[parts.length - 1],
        v = parts.splice(0, parts.length - 1).join(''),
        mult = {
            Mbps: 10e6,
            Kbps: 10e3,
            bps: 1
        };

    if (!mult.hasOwnProperty(unit)) {
        winston.error('unparsable bitrate unit "%s"', unit);
    }
    if (!/^\d+(\s\d{3})*(\.\d+)?$/.test(v)) {
        winston.error('unparsable bitrate value "%s"', v);
    }

    return mult[unit] * parseFloat(v.replace(/ /g, ''));
}

function parseFileSize(value) {
    var parts = value.split(' '),
        mult = {
            TiB: Math.pow(2, 40),
            GiB: Math.pow(2, 30),
            MiB: Math.pow(2, 20),
            KiB: Math.pow(2, 10),
            Bytes: 1
        };

    if (parts.length !== 2) {
        winston.error('unparsable filesize string "%s"', value);
    }
    if (!mult.hasOwnProperty(parts[1])) {
        winston.error('unparsable filesize unit "%s"', parts[1]);
    }
    if (!/^\d+(\.\d+)?$/.test(parts[0])) {
        winston.error('unparsable filesize value "%s"', parts[0]);
    }

    return Math.round(mult[parts[1]] * parseFloat(parts[0]));
}

function parseSamplingRate(value) {
    var parts = value.split(' '),
        mult = {
            GHz: 10e9,
            MHz: 10e6,
            KHz: 10e3,
            Hz: 1
        };

    if (parts.length !== 2) {
        winston.error('unparsable sampling rate string "%s"', value);
    }
    if (!mult.hasOwnProperty(parts[1])) {
        winston.error('unparsable sampling rate unit "%s"', parts[1]);
    }
    if (!/^\d+(\.\d+)?$/.test(parts[0])) {
        winston.error('unparsable sampling rate value "%s"', parts[0]);
    }

    return mult[parts[1]] * parseFloat(parts[0]);
}

function parseTime(value) {
    var parts = value.split(' '),
        result = 0,
        mult = {
            h: 3600,
            mn: 60,
            s: 1,
            ms: 0.001
        };

    parts.forEach(function (p) {
        var pss = p.match(/^(\d+)(\w+)$/);

        if (!mult.hasOwnProperty(pss[2])) {
            winston.error('unparsable time unit "%s"', pss[2]);
        }
        if (!/^\d+$/.test(pss[1])) {
            winston.error('unparsable time value "%s"', pss[1]);
        }

        result += parseInt(pss[1], 10) * mult[pss[2]];
    });

    return result;
}

function parseIntUnit(value, unit, spaceSep) {
    var regexp = new RegExp('^(\\d{1,3}(?:' + (spaceSep ? '\\s' : '') + '\\d{3})*) ' + unit + '$'),
        matches = value.match(regexp);

    if (matches) {
        if (spaceSep) {
            matches[1] = matches[1].replace(/\s/g, '');
        }
        return parseInt(matches[1], 10);
    } else {
        winston.error('unparsable int value "%s"', value);
        return null;
    }
}

function parseFloatUnit(value, unit) {
    var regexp = new RegExp('^(\\d+\\.\\d+) ' + unit + '$'),
        matches = value.match(regexp);

    if (matches) {
        return parseFloat(matches[1]);
    } else {
        winston.error('unparsable float value "%s"', value);
        return null;
    }
}

function normalizeTrack(track) {
    _.each(track, function (v, k) {
        if (/^_\d{2}_\d{2}_\d{5}$/.test(k)) {
            return;
        }

        switch (k) {
        case 'format_settings__floor':
        case 'streamid':
        case 'id':
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
            track[k] = parseBool(v);
            break;

        case 'duration':
        case 'delay_relative_to_video':
            track[k] = parseTime(v);
            break;

        case 'width':
        case 'height':
        case 'original_width':
        case 'original_height':
            track[k] = parseIntUnit(v, 'pixels', true);
            break;

        case 'original_frame_rate':
        case 'frame_rate':
            track[k] = parseFloatUnit(v, 'fps');
            break;

        case 'format_settings__reframes':
            track[k] = parseIntUnit(v, 'frames');
            break;

        case 'channel_s_':
            track[k] = parseIntUnit(v, 'channels?');
            break;

        case 'bit_depth':
            track[k] = parseIntUnit(v, 'bits');
            break;

        case 'bit_rate':
        case 'minimum_bit_rate':
        case 'nominal_bit_rate':
        case 'maximum_bit_rate':
            track[k] = parseBitrate(v);
            break;

        case 'sampling_rate':
            track[k] = parseSamplingRate(v);
            break;

        case 'stream_size':
            track[k] = parseFileSize(v);
            break;

        case 'transfer_characteristics':
        case 'color_primaries':
        case 'standard':
        case 'mode':
        case 'type':
        case 'format':
        case 'format_info':
        case 'format_profile':
        case 'codec_id':
        case 'original_display_aspect_ratio':
        case 'channel_positions':
        case 'muxing_mode':
        case 'format_settings__endianness':
        case 'display_aspect_ratio':
        case 'bit_rate_mode':
        case 'mode_extension':
        case 'frame_rate_mode':
        case 'color_space':
        case 'codec_id_info':
        case 'chroma_subsampling':
        case 'compression_mode':
        case 'scan_type':
        case 'language':
        case 'title':
        case 'matrix_coefficients':
        case 'writing_library':
        case 'encoding_settings':
        case 'writing_application':
        case 'encoded_application_url':
            break;

        default:
            winston.error('unhandled track property: "%s" with value "%s"', k, v);
        }
    });
}

function normalizeInfo(info) {
    _.each(info, function (v, k) {
        switch (k) {
        case 'attachment':
            info[k] = parseBool(v);
            break;

        case 'duration':
            info[k] = parseTime(v);
            break;

        case 'file_size':
            info[k] = parseFileSize(v);
            break;

        case 'overall_bit_rate':
            info[k] = parseIntUnit(v, 'bps', '\\s');
            break;

        case 'encoded_date':
            var timezone = v.split(' ', 1)[0];
            info[k] = +new time.Date(v.substring(timezone.length + 1), timezone);
            break;

        case 'tracks':
        case 'overall_bit_rate_mode':
        case 'unique_id':
        case 'complete_name':
        case 'format':
        case 'format_version':
        case 'movie_name':
        case 'writing_application':
        case 'writing_library':
            break;

        default:
            winston.error('unhandled info property: "%s" with value "%s"', k, v);
        }
    });
}

/**
 * Normalizes the mediainfo object.
 *
 * @param {Object} info
 * @return {Object}
 */
MediaInfoNormalizer.prototype.normalize = function (info) {
    normalizeInfo(info);
    info.tracks.forEach(function (track) {
        normalizeTrack(track);
    });

    return info;
};

/**
 * @ignore
 */
module.exports = new MediaInfoNormalizer();
